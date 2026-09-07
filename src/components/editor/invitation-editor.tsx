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
import { SortableModuleItem } from "./sortable-module-item";
import { ModulePalette } from "./module-palette";
import { SettingsPanel } from "./settings-panel";
import { PreviewPane } from "./preview-pane";
import { ThemePanel } from "./theme-panel";
import { ModuleConfigEditor, MODULE_REGISTRY } from "@/components/modules/registry";
import { RsvpModeToggle } from "@/components/dashboard/rsvp-mode-toggle";
import { GuestManager } from "@/components/dashboard/guest-manager";
import type { ThemeConfig } from "@/lib/theme/theme";
import {
  Undo2Icon, Redo2Icon, LayersIcon, MousePointerClickIcon, ArrowLeftIcon,
  PaletteIcon, UsersIcon, SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
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

/**
 * Paneles de nivel DOCUMENTO. Van separados de la lista de secciones porque no
 * son hermanos suyos: cambian la invitacion entera, no un bloque. Mezclarlos en
 * un mismo control de pestanas era el defecto estructural del editor viejo.
 */
const PANELES_DOC = [
  { id: "theme", label: "Tema", icon: PaletteIcon },
  { id: "guests", label: "Invitados", icon: UsersIcon },
  { id: "settings", label: "Ajustes", icon: SettingsIcon },
] as const;

type PanelId = "module" | (typeof PANELES_DOC)[number]["id"];

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
  const [panel, setPanel] = useState<PanelId>("module");
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
    <div className="flex h-svh flex-col overflow-hidden">
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
      {/*
        Barra superior. Antes eran TRES bloques apilados —acciones, enlace
        publico y URL personalizada— que en un telefono se comian una fraccion
        grande del viewport antes de mostrar nada editable. El enlace y la URL
        bajan al panel de Ajustes, que es donde se consultan, no donde estorban.
      */}
      <header className="shrink-0 border-b">
        <div className="flex w-full items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
          {/*
            `min-w-0` en los dos flex es lo que permite que el titulo se recorte
            en vez de empujar. Sin el, un hijo flex se niega a encogerse por
            debajo de su contenido y la barra desborda: medido a 375px, el
            contenido ocupaba 424px y "Publicar" quedaba fuera de pantalla.
          */}
          <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Volver al panel"
                render={<Link href="/dashboard" />}
                nativeButton={false}
                className="shrink-0"
              >
                <ArrowLeftIcon />
              </Button>
              <span className="truncate text-sm font-medium">
                {invitation.title || "Sin título"}
              </span>
              {/* Estado del autoguardado. Sustituye al boton Guardar: el
                  usuario no deberia tener que acordarse de guardar.
                  Se oculta en pantallas estrechas — el titulo importa mas, y
                  el estado se sigue anunciando por `aria-live`. */}
              <span
                className="hidden shrink-0 text-xs text-muted-foreground sm:inline"
                aria-live="polite"
              >
                {dirty ? "Guardando…" : "Guardado"}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
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

        </div>
      </header>

      {/*
        Tres columnas: riel de secciones, canvas y panel de propiedades.

        UN SOLO ARBOL, no dos. Antes el preview se montaba DOS VECES en
        escritorio —uno en la pestana movil oculta por CSS y otro en la columna
        derecha—, con sus dos capas de stickers escuchando punteros. Si aqui se
        hiciera "tres columnas en desktop, pestanas en movil" con clases, el
        doble montaje seguiria. Este arbol pasa de fila a columna y el preview
        existe una vez.

        Y desaparecen las pestanas, que mezclaban tres cosas distintas en un
        mismo control —nivel de documento (Tema, Ajustes), nivel de bloque
        (Modulos) y un modo (Vista previa)— y llegaban a cinco `flex-1` en
        420px, truncandose.
      */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Riel: que hay en la invitacion */}
        <nav
          aria-label="Secciones de la invitación"
          className="flex shrink-0 flex-col gap-3 border-b p-3 lg:w-(--ed-sidebar-w) lg:overflow-y-auto lg:border-r lg:border-b-0"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[length:var(--ed-text-micro)] font-(--ed-weight-medium) tracking-(--ed-tracking-micro) text-muted-foreground uppercase">
              Secciones
            </span>
            <ModulePalette onAdd={addModule} />
          </div>

          {modules.length === 0 ? (
            <EmptyState
              icon={<LayersIcon />}
              title="Tu invitación está vacía"
              description="Agrega la primera sección para empezar."
              className="py-8"
            />
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
                <div className="space-y-1.5">
                  {modules.map((m) => (
                    <SortableModuleItem
                      key={m.id}
                      module={m}
                      selected={panel === "module" && m.id === selectedId}
                      onSelect={() => {
                        setSelectedId(m.id);
                        setPanel("module");
                      }}
                      onToggleVisible={(v) => toggleVisible(m.id, v)}
                      onDelete={() => setPorBorrar(m)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/*
            Nivel de DOCUMENTO, separado del nivel de bloque por un filete. No
            son hermanos de "Secciones": cambian la invitacion entera.
          */}
          <div className="mt-auto space-y-0.5 border-t pt-3">
            {PANELES_DOC.filter(
              (p) => p.id !== "guests" || invitation.rsvp_mode === "guest_list",
            ).map((p) => {
              const Icon = p.icon;
              const activo = panel === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPanel(p.id)}
                  aria-current={activo ? "true" : undefined}
                  className={cn(
                    "flex h-11 w-full items-center gap-2.5 rounded-[var(--ed-radius-sm)] px-2.5 text-left",
                    "text-[length:var(--ed-text-sm)] tracking-(--ed-tracking-sm)",
                    "transition-colors duration-(--ed-fast) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    activo
                      ? "bg-muted font-(--ed-weight-medium) text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {p.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Canvas: el protagonista. Antes vivia a la derecha, con un parrafo
            gris encima que decia "Vista previa en tiempo real". */}
        <main className="flex min-h-[60svh] min-w-0 flex-1 flex-col overflow-y-auto bg-muted/40 p-4 lg:min-h-0">
          <PreviewPane
            modules={modules}
            theme={theme}
            eventDate={invitation.event_date}
            onStickersChange={(stickers) => updateTheme({ stickers })}
          />
        </main>

        {/* Inspector: contextual a lo que hay seleccionado. */}
        <aside
          aria-label="Propiedades"
          className="flex shrink-0 flex-col border-t lg:w-[380px] lg:overflow-y-auto lg:border-t-0 lg:border-l"
        >
          <div className="flex h-11 shrink-0 items-center gap-2 border-b px-3.5">
            {panel === "module" && selected ? (
              <>
                {(() => {
                  const Icon = MODULE_REGISTRY[selected.module_type].Icon;
                  return <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
                })()}
                <span className="text-[length:var(--ed-text-sm)] font-(--ed-weight-semibold) tracking-(--ed-tracking-sm)">
                  {MODULE_META[selected.module_type].label}
                </span>
              </>
            ) : (
              <span className="text-[length:var(--ed-text-sm)] font-(--ed-weight-semibold) tracking-(--ed-tracking-sm)">
                {PANELES_DOC.find((p) => p.id === panel)?.label ?? "Propiedades"}
              </span>
            )}
          </div>

          <div className="space-y-4 p-3.5">
            {panel === "module" &&
              (selected ? (
                <>
                  {selected.module_type === "rsvp" &&
                    invitation.rsvp_mode === "guest_list" && (
                      <Button
                        variant="outline"
                        size="touch"
                        className="w-full"
                        onClick={() => setPanel("guests")}
                      >
                        Gestionar invitados
                      </Button>
                    )}
                  <ModuleConfigEditor
                    moduleType={selected.module_type}
                    config={selected.config}
                    onChange={(patch) => updateConfig(selected.id, patch)}
                    ctx={uploadCtx}
                    animationDefaults={theme.animation}
                    eventDate={invitation.event_date}
                    onSetEventDate={(iso) => updateSettings({ event_date: iso })}
                    rsvpMode={invitation.rsvp_mode}
                  />
                </>
              ) : (
                <EmptyState
                  icon={<MousePointerClickIcon />}
                  title="Nada seleccionado"
                  description="Elige una sección de la izquierda para editarla."
                  className="py-8"
                />
              ))}

            {panel === "theme" && (
              <ThemePanel
                theme={theme}
                onChange={updateTheme}
                warnings={detectAnimationConflicts(theme, modules)}
                onApplyAnimationToAll={applyAnimationToAll}
                ctx={uploadCtx}
              />
            )}

            {panel === "guests" && invitation.rsvp_mode === "guest_list" && (
              <GuestManager
                invitationId={invitation.id}
                siteUrl={siteUrl}
                eventTitle={invitation.title}
              />
            )}

            {panel === "settings" && (
              <>
                <SettingsPanel invitation={invitation} onChange={updateSettings} />
                <RsvpModeToggle
                  invitationId={invitation.id}
                  mode={invitation.rsvp_mode}
                  refresh={false}
                  onChange={(m) => {
                    aplicar({ type: "updateSettings", patch: { rsvp_mode: m } });
                    if (m === "guest_list") setPanel("guests");
                  }}
                />
                {/* Bajan aqui desde la barra superior: se consultan al
                    compartir, no en cada tecla. */}
                <Separator />
                <PublishControls
                  username={username}
                  slug={invitation.slug}
                  isPublished={invitation.is_published}
                  dirty={dirty}
                />
                {invitation.is_published && (
                  <VanitySlugCard invitationId={invitation.id} />
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
