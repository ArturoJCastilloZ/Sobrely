"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import {
  defaultConfigFor,
  MODULE_META,
  type ModuleType,
} from "@/lib/modules/types";
import type {
  EditorInvitation,
  EditorModule,
} from "@/lib/invitations/editor-types";
import { saveEditor, setPublished } from "@/lib/invitations/actions";
import { slugify } from "@/lib/invitations/schemas";
import { PublishControls } from "./publish-controls";
import { VanitySlugCard } from "./vanity-slug-card";
import { CheckoutButton } from "@/components/billing/checkout-button";
import {
  formatPrice,
  getEffectivePrice,
  getPlan,
  type PlanCode,
} from "@/lib/billing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { SortableModuleItem } from "./sortable-module-item";
import { ModulePalette } from "./module-palette";
import { SettingsPanel } from "./settings-panel";
import { PreviewPane } from "./preview-pane";
import { ThemePanel } from "./theme-panel";
import { ModuleConfigEditor } from "@/components/modules/config-editors";
import type { ThemeConfig } from "@/lib/theme/theme";
import { detectAnimationConflicts } from "@/lib/animation/conflicts";

function reindex(modules: EditorModule[]): EditorModule[] {
  return modules.map((m, i) => ({ ...m, sort_order: i }));
}

export function InvitationEditor({
  initialInvitation,
  initialModules,
  initialTheme,
  username,
  userId,
}: {
  initialInvitation: EditorInvitation;
  initialModules: EditorModule[];
  initialTheme: ThemeConfig;
  username: string;
  userId: string;
}) {
  const [invitation, setInvitation] =
    useState<EditorInvitation>(initialInvitation);
  const [modules, setModules] = useState<EditorModule[]>(initialModules);
  const [theme, setTheme] = useState<ThemeConfig>(initialTheme);
  const uploadCtx = { userId, invitationId: initialInvitation.id };
  const [selectedId, setSelectedId] = useState<string | null>(
    initialModules[0]?.id ?? null,
  );
  const [dirty, setDirty] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [isPublishing, startPublishing] = useTransition();
  // Plan requerido cuando la publicación se bloquea por usar módulos ⭐ premium.
  const [upgradePlan, setUpgradePlan] = useState<PlanCode | null>(null);

  function handlePublishToggle() {
    const next = !invitation.is_published;
    startPublishing(async () => {
      const res = await setPublished(invitation.id, next);
      if (!res.ok) {
        // Bloqueo por plan → abre el CTA de mejora en vez de solo un toast.
        if (res.needsUpgrade && res.requiredPlan) {
          setUpgradePlan(res.requiredPlan);
          return;
        }
        toast.error(res.error);
        return;
      }
      setInvitation((prev) => ({ ...prev, is_published: res.is_published }));
      toast.success(
        res.is_published ? "Invitación publicada." : "Invitación despublicada.",
      );
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const selected = modules.find((m) => m.id === selectedId) ?? null;

  function markDirty() {
    setDirty(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setModules((prev) => {
      const oldIndex = prev.findIndex((m) => m.id === active.id);
      const newIndex = prev.findIndex((m) => m.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return reindex(arrayMove(prev, oldIndex, newIndex));
    });
    markDirty();
  }

  function addModule(type: ModuleType) {
    const newModule: EditorModule = {
      id: `tmp-${crypto.randomUUID()}`,
      module_type: type,
      sort_order: modules.length,
      is_visible: true,
      config: defaultConfigFor(type),
    };
    setModules((prev) => reindex([...prev, newModule]));
    setSelectedId(newModule.id);
    markDirty();
  }

  function deleteModule(id: string) {
    setModules((prev) => reindex(prev.filter((m) => m.id !== id)));
    setSelectedId((cur) => (cur === id ? null : cur));
    markDirty();
  }

  function toggleVisible(id: string, visible: boolean) {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_visible: visible } : m)),
    );
    markDirty();
  }

  function updateConfig(id: string, patch: Record<string, unknown>) {
    setModules((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, config: { ...m.config, ...patch } } : m,
      ),
    );
    markDirty();
  }

  function updateSettings(patch: Partial<EditorInvitation>) {
    setInvitation((prev) => ({ ...prev, ...patch }));
    markDirty();
  }

  function updateTheme(patch: Partial<ThemeConfig>) {
    setTheme((prev) => ({ ...prev, ...patch }));
    markDirty();
  }

  /** Clears every per-module animation override so all inherit the theme. */
  function applyAnimationToAll() {
    setModules((prev) =>
      prev.map((m) => {
        if (!("animation" in m.config)) return m;
        const next = { ...m.config };
        delete next.animation;
        return { ...m, config: next };
      }),
    );
    markDirty();
    toast.success("Animación del tema aplicada a todos los módulos.");
  }

  function handleSave() {
    if (!invitation.title.trim()) {
      toast.error("El título es obligatorio.");
      return;
    }
    const cleanSlug = slugify(invitation.slug);
    if (!cleanSlug) {
      toast.error("El slug es obligatorio (usa letras o números).");
      return;
    }
    // Reflect the normalized slug back in the field.
    if (cleanSlug !== invitation.slug) {
      setInvitation((prev) => ({ ...prev, slug: cleanSlug }));
    }

    startSaving(async () => {
      const result = await saveEditor({
        invitationId: invitation.id,
        settings: {
          title: invitation.title.trim(),
          slug: cleanSlug,
          eventType: invitation.event_type,
          eventDate: invitation.event_date,
        },
        theme,
        modules: modules.map((m, i) => ({
          id: m.id,
          module_type: m.module_type,
          sort_order: i,
          is_visible: m.is_visible,
          config: m.config,
        })),
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      // Adopt real DB ids so re-saving doesn't churn rows.
      const fresh = result.modules.map((m) => ({
        id: m.id,
        module_type: m.module_type as ModuleType,
        sort_order: m.sort_order,
        is_visible: m.is_visible,
        config: m.config ?? {},
      }));
      setModules(fresh);
      setSelectedId((cur) => {
        if (cur && fresh.some((m) => m.id === cur)) return cur;
        return fresh[0]?.id ?? null;
      });
      setDirty(false);
      toast.success("Cambios guardados.");
    });
  }

  const upgradePlanObj = upgradePlan ? getPlan(upgradePlan) : undefined;

  return (
    <div className="flex min-h-svh flex-col">
      {/* Modal de mejora de plan (bloqueo de publicación por módulos premium) */}
      {upgradePlanObj && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setUpgradePlan(null)}
        >
          <Card
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>Mejora a {upgradePlanObj.name} para publicar</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Tu invitación usa módulos premium. Publícala con el plan{" "}
                <strong>{upgradePlanObj.name}</strong> por{" "}
                <strong>
                  {formatPrice(
                    getEffectivePrice(upgradePlanObj),
                    upgradePlanObj.currency,
                  )}
                </strong>{" "}
                (pago único por evento). Tus módulos se conservan.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setUpgradePlan(null)}>
                  Ahora no
                </Button>
                <CheckoutButton
                  planCode={upgradePlanObj.code}
                  invitationId={invitation.id}
                  publishOnPaid
                >
                  Mejorar a {upgradePlanObj.name}
                </CheckoutButton>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/dashboard" />}
                nativeButton={false}
              >
                ← Volver
              </Button>
              <span className="truncate text-sm font-medium">
                {invitation.title || "Sin título"}
              </span>
              {dirty && (
                <span className="text-xs text-amber-600">• sin guardar</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePublishToggle}
                disabled={isPublishing || dirty}
                variant={invitation.is_published ? "outline" : "default"}
                size="sm"
              >
                {isPublishing
                  ? "…"
                  : invitation.is_published
                    ? "Despublicar"
                    : "Publicar"}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !dirty}
                variant={invitation.is_published ? "default" : "outline"}
                size="sm"
              >
                {isSaving ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>

          <PublishControls
            username={username}
            slug={invitation.slug}
            isPublished={invitation.is_published}
            dirty={dirty}
          />
          {invitation.is_published && (
            <VanitySlugCard invitationId={invitation.id} />
          )}
        </div>
      </header>

      {/* Body: editor + preview (desktop two columns, mobile tabs) */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          {/* Left: controls */}
          <div className="space-y-4">
            <Tabs defaultValue="modules">
              <TabsList className="w-full">
                <TabsTrigger value="modules" className="flex-1">
                  Módulos
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex-1">
                  Ajustes
                </TabsTrigger>
                <TabsTrigger value="theme" className="flex-1">
                  Tema
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex-1 lg:hidden">
                  Vista previa
                </TabsTrigger>
              </TabsList>

              <TabsContent value="modules" className="space-y-4">
                <ModulePalette onAdd={addModule} />

                {modules.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Aún no hay módulos. Agrega el primero.
                  </p>
                ) : (
                  <DndContext
                    id="modules-dnd"
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={modules.map((m) => m.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {modules.map((m) => (
                          <SortableModuleItem
                            key={m.id}
                            module={m}
                            selected={m.id === selectedId}
                            onSelect={() => setSelectedId(m.id)}
                            onToggleVisible={(v) => toggleVisible(m.id, v)}
                            onDelete={() => deleteModule(m.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                <Separator />

                {selected ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {MODULE_META[selected.module_type].icon}{" "}
                        {MODULE_META[selected.module_type].label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ModuleConfigEditor
                        moduleType={selected.module_type}
                        config={selected.config}
                        onChange={(patch) => updateConfig(selected.id, patch)}
                        ctx={uploadCtx}
                        animationDefaults={theme.animation}
                        eventDate={invitation.event_date}
                        onSetEventDate={(iso) =>
                          updateSettings({ event_date: iso })
                        }
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    Selecciona un módulo para editarlo.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Ajustes de la invitación
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SettingsPanel
                      invitation={invitation}
                      onChange={updateSettings}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="theme">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tema</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ThemePanel
                      theme={theme}
                      onChange={updateTheme}
                      warnings={detectAnimationConflicts(theme, modules)}
                      onApplyAnimationToAll={applyAnimationToAll}
                      ctx={uploadCtx}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preview" className="lg:hidden">
                <PreviewPane modules={modules} theme={theme} eventDate={invitation.event_date} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: live preview (desktop only) */}
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <p className="mb-2 text-center text-xs text-muted-foreground">
                Vista previa en tiempo real
              </p>
              <PreviewPane modules={modules} theme={theme} eventDate={invitation.event_date} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
