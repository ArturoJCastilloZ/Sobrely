"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useTransition } from "react";
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import {
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
import { ModuleConfigEditor, MODULE_REGISTRY } from "@/components/modules/registry";
import { RsvpModeToggle } from "@/components/dashboard/rsvp-mode-toggle";
import { GuestManager } from "@/components/dashboard/guest-manager";
import type { ThemeConfig } from "@/lib/theme/theme";
import { Undo2Icon, Redo2Icon } from "lucide-react";
import { detectAnimationConflicts } from "@/lib/animation/conflicts";
import type { EditorAction } from "@/lib/invitations/editor-document";
import {
  editorHistoryReducer,
  estadoInicial,
  hayCambiosSinGuardar,
  puedeDeshacer,
  puedeRehacer,
} from "@/lib/invitations/editor-history";
import { useAutosave } from "@/lib/invitations/use-autosave";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  // UN documento, no tres estados sueltos. Es la precondicion del historial:
  // un ⌘Z tiene que capturar invitacion, modulos y tema a la vez.
  const [historia, despachar] = useReducer(
    editorHistoryReducer,
    { invitation: initialInvitation, modules: initialModules, theme: initialTheme },
    estadoInicial,
  );
  const { invitation, modules, theme } = historia.presente;

  const aplicar = useCallback(
    (action: EditorAction) => despachar({ type: "aplicar", action }),
    [],
  );

  const uploadCtx = { userId, invitationId: initialInvitation.id };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const [activeTab, setActiveTab] = useState("modules");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialModules[0]?.id ?? null,
  );
  // Derivado del documento, no una bandera: deshacer hasta el punto guardado
  // deja de marcar pendientes, que es lo que el usuario espera.
  const dirty = useMemo(() => hayCambiosSinGuardar(historia), [historia]);
  const [isPublishing, startPublishing] = useTransition();
  // Plan requerido cuando la publicación se bloquea por usar módulos ⭐ premium.
  const [upgradePlan, setUpgradePlan] = useState<PlanCode | null>(null);
  /** Modulo pendiente de confirmar borrado. Antes se borraba a un clic. */
  const [porBorrar, setPorBorrar] = useState<EditorModule | null>(null);

  function handlePublishToggle() {
    const next = !invitation.is_published;
    startPublishing(async () => {
      // Antes "Publicar" estaba deshabilitado mientras hubiera cambios sin
      // guardar, y el usuario tenia que deducir ese modelo de dos pasos. Ahora
      // se guarda primero: publicar una version vieja seria peor.
      if (dirty) await guardarAhora();
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
      aplicar({ type: "setPublished", published: res.is_published });
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    aplicar({ type: "reorder", activeId: String(active.id), overId: String(over.id) });
  }

  function addModule(type: ModuleType) {
    // El id se genera AQUI y no en el reducer: un reducer con `crypto.randomUUID()`
    // dentro no es una funcion pura y deja de ser reproducible en pruebas.
    const id = `tmp-${crypto.randomUUID()}`;
    aplicar({ type: "addModule", moduleType: type, id });
    setSelectedId(id);
  }

  function deleteModule(id: string) {
    aplicar({ type: "deleteModule", id });
    setSelectedId((cur) => (cur === id ? null : cur));
  }

  function toggleVisible(id: string, visible: boolean) {
    aplicar({ type: "toggleVisible", id, visible });
  }

  function updateConfig(id: string, patch: Record<string, unknown>) {
    aplicar({ type: "updateConfig", id, patch });
  }

  function updateSettings(patch: Partial<EditorInvitation>) {
    aplicar({ type: "updateSettings", patch });
  }

  function updateTheme(patch: Partial<ThemeConfig>) {
    aplicar({ type: "updateTheme", patch });
  }

  /** Clears every per-module animation override so all inherit the theme. */
  function applyAnimationToAll() {
    aplicar({ type: "clearAnimationOverrides" });
    toast.success("Animación del tema aplicada a todos los módulos.");
  }

  // Referencia viva al documento, para que el autoguardado no dependa de una
  // clausura vieja: sin esto guardaria lo que habia cuando se armo el callback.
  const docRef = useRef(historia.presente);
  useEffect(() => {
    docRef.current = historia.presente;
  }, [historia.presente]);

  const guardarDocumento = useCallback(async () => {
    const doc = docRef.current;

    if (!doc.invitation.title.trim()) {
      toast.error("El título es obligatorio.");
      return;
    }
    const cleanSlug = slugify(doc.invitation.slug);
    if (!cleanSlug) {
      toast.error("El slug es obligatorio (usa letras o números).");
      return;
    }
    if (cleanSlug !== doc.invitation.slug) {
      despachar({ type: "aplicar", action: { type: "updateSettings", patch: { slug: cleanSlug } } });
    }

    // Se congela lo que se envia. El punto guardado sera ESTE, no lo que haya
    // en pantalla cuando vuelva la respuesta: si el usuario siguio escribiendo,
    // eso sigue pendiente.
    const enviado = {
      ...doc,
      invitation: { ...doc.invitation, slug: cleanSlug, title: doc.invitation.title.trim() },
    };

    const result = await saveEditor({
      invitationId: enviado.invitation.id,
      settings: {
        title: enviado.invitation.title,
        slug: cleanSlug,
        eventType: enviado.invitation.event_type,
        eventDate: enviado.invitation.event_date,
      },
      theme: enviado.theme,
      modules: enviado.modules.map((m, i) => ({
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

    // Solo se remapean los IDS temporales a su uuid real. Reemplazar los
    // modulos enteros con los del servidor —lo que hacia antes— borraba
    // cualquier edicion hecha durante la peticion.
    const mapa: Record<string, string> = {};
    enviado.modules.forEach((m, i) => {
      const real = result.modules[i];
      if (real && real.id !== m.id) mapa[m.id] = real.id;
    });
    if (Object.keys(mapa).length > 0) {
      despachar({ type: "aplicar", action: { type: "remapIds", mapa } });
    }

    const guardado = {
      ...enviado,
      modules: enviado.modules.map((m) => (mapa[m.id] ? { ...m, id: mapa[m.id] } : m)),
    };
    despachar({ type: "marcarGuardado", documento: guardado });

    setSelectedId((cur) => (cur && mapa[cur] ? mapa[cur] : cur));
  }, []);

  const { guardarAhora } = useAutosave({ hayCambios: dirty, guardar: guardarDocumento });

  // Deshacer / rehacer. `metaKey` para macOS, `ctrlKey` para el resto.
  useEffect(() => {
    function alTeclado(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      // Dentro de un campo de texto manda el deshacer NATIVO del navegador:
      // secuestrarlo ahi haria que ⌘Z borre el modulo entero en vez de la
      // ultima palabra, que es lo contrario de lo que el usuario espera.
      const el = document.activeElement;
      const enCampo =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (enCampo) return;

      e.preventDefault();
      despachar(e.shiftKey ? { type: "rehacer" } : { type: "deshacer" });
    }
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, []);

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

      {/*
        Confirmacion de borrado. Antes un clic en un boton de 28px destruia el
        modulo y su config sin preguntar y sin retorno — no habia undo en todo
        el producto. Ahora hay las dos cosas, y el dialogo lo dice.
      */}
      <AlertDialog
        open={porBorrar !== null}
        onOpenChange={(abierto) => !abierto && setPorBorrar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar «{porBorrar ? MODULE_META[porBorrar.module_type].label : ""}»?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se quita la sección y todo lo que escribiste en ella. Puedes
              recuperarla con Deshacer mientras no cierres el editor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel />
            <AlertDialogAction
              onClick={() => {
                if (porBorrar) deleteModule(porBorrar.id);
                setPorBorrar(null);
              }}
            >
              Eliminar sección
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              {/* Estado del autoguardado. Sustituye al boton Guardar: el
                  usuario no deberia tener que acordarse de guardar. */}
              <span className="shrink-0 text-xs text-muted-foreground" aria-live="polite">
                {dirty ? "Guardando…" : "Guardado"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Deshacer / rehacer. Los atajos funcionan igual; estos botones
                  existen porque un atajo que nadie ve no existe. */}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Deshacer"
                title="Deshacer (⌘Z)"
                disabled={!puedeDeshacer(historia)}
                onClick={() => despachar({ type: "deshacer" })}
              >
                <Undo2Icon />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Rehacer"
                title="Rehacer (⌘⇧Z)"
                disabled={!puedeRehacer(historia)}
                onClick={() => despachar({ type: "rehacer" })}
              >
                <Redo2Icon />
              </Button>
              <Button
                onClick={handlePublishToggle}
                disabled={isPublishing}
                variant={invitation.is_published ? "outline" : "default"}
                size="sm"
              >
                {isPublishing
                  ? "…"
                  : invitation.is_published
                    ? "Despublicar"
                    : "Publicar"}
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
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="modules" className="flex-1">
                  Módulos
                </TabsTrigger>
                {invitation.rsvp_mode === "guest_list" && (
                  <TabsTrigger value="guests" className="flex-1">
                    Invitados
                  </TabsTrigger>
                )}
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
                            onDelete={() => setPorBorrar(m)}
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
                      <CardTitle className="flex items-center gap-2 text-base">
                        {(() => {
                          const Icon = MODULE_REGISTRY[selected.module_type].Icon;
                          return <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
                        })()}
                        {MODULE_META[selected.module_type].label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selected.module_type === "rsvp" &&
                        invitation.rsvp_mode === "guest_list" && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setActiveTab("guests")}
                          >
                            Gestionar invitados →
                          </Button>
                        )}
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
                        rsvpMode={invitation.rsvp_mode}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    Selecciona un módulo para editarlo.
                  </p>
                )}
              </TabsContent>

              {invitation.rsvp_mode === "guest_list" && (
                <TabsContent value="guests" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Lista de invitados
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <GuestManager
                        invitationId={invitation.id}
                        siteUrl={siteUrl}
                        eventTitle={invitation.title}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Ajustes de la invitación
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <SettingsPanel
                      invitation={invitation}
                      onChange={updateSettings}
                    />
                    <RsvpModeToggle
                      invitationId={invitation.id}
                      mode={invitation.rsvp_mode}
                      refresh={false}
                      onChange={(m) => {
                        aplicar({ type: "updateSettings", patch: { rsvp_mode: m } });
                        if (m === "guest_list") setActiveTab("guests");
                      }}
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
                <PreviewPane modules={modules} theme={theme} eventDate={invitation.event_date} onStickersChange={(stickers) => updateTheme({ stickers })} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: live preview (desktop only) */}
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <p className="mb-2 text-center text-xs text-muted-foreground">
                Vista previa en tiempo real
              </p>
              <PreviewPane modules={modules} theme={theme} eventDate={invitation.event_date} onStickersChange={(stickers) => updateTheme({ stickers })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
