"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { parcheDeDesplazamiento } from "@/lib/modules/types";
import { RsvpModeToggle } from "@/components/dashboard/rsvp-mode-toggle";
import { GuestManager } from "@/components/dashboard/guest-manager";
import type { ThemeConfig } from "@/lib/theme/theme";
import {
  Undo2Icon, Redo2Icon, LayersIcon, MousePointerClickIcon, ArrowLeftIcon, PlusIcon,
  ExternalLinkIcon,
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

/** Franja entre dos secciones con el `+` que inserta ahi. */
function Gutter({
  indice,
  onAdd,
}: {
  indice: number;
  onAdd: (type: ModuleType, index: number) => void;
}) {
  return (
    <div className="group/gutter relative flex h-3 items-center focus-within:h-7 hover:h-7">
      <div className="h-px flex-1 bg-primary/40 opacity-0 transition-opacity duration-(--ed-fast) group-focus-within/gutter:opacity-100 group-hover/gutter:opacity-100" />
      <ModulePalette
        align="start"
        onAdd={(type) => onAdd(type, indice)}
        trigger={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Insertar sección en la posición ${indice + 1}`}
            className="ml-1 rounded-full bg-primary text-primary-foreground opacity-0 transition-opacity duration-(--ed-fast) group-focus-within/gutter:opacity-100 group-hover/gutter:opacity-100 hover:bg-primary focus-visible:opacity-100"
          />
        }
      >
        <PlusIcon />
      </ModulePalette>
    </div>
  );
}

export function InvitationEditor({
  initialInvitation,
  initialVersion,
  initialModules,
  initialTheme,
  username,
  userId,
}: {
  initialInvitation: EditorInvitation;
  /** Token de bloqueo optimista de la invitacion (columna `version`, `0027`). */
  initialVersion: number;
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

  // Bloqueo optimista. La version vive en una REF y no en el documento: no se
  // edita, y meterla en el reducer la volveria parte del historial (un ⌘Z
  // retrocederia el token y el guardado siguiente choparia contra si mismo).
  const versionRef = useRef(initialVersion);
  // Cuando el servidor rechaza por conflicto, el editor deja de guardar. No es
  // un toast y seguir: reintentar un conflicto no lo resuelve, y cada reintento
  // repite el aviso mientras el trabajo del otro sigue en riesgo.
  const [conflicto, setConflicto] = useState(false);
  /**
   * El ULTIMO guardado fallo. Existe porque el indicador solo sabia decir
   * "Guardando…" o "Guardado": con un fallo de red se quedaba en "Guardando…"
   * para siempre, afirmando que estaba a salvo un trabajo que no lo estaba.
   */
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

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
  const router = useRouter();
  /** Salir con cambios sin guardar: se ofrece salir igualmente o quedarse. */
  const [salidaEnRiesgo, setSalidaEnRiesgo] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  /**
   * Como fue el ULTIMO guardado. Es una ref y no estado a proposito: `salirAlPanel`
   * lo consulta justo despues del `await`, y en ese punto React todavia no ha
   * re-renderizado ni corrido los efectos, asi que cualquier estado —o una ref
   * sincronizada en un efecto— seguiria valiendo lo de ANTES del guardado.
   * Una ref escrita dentro del propio guardado si esta al dia.
   */
  const ultimoGuardado = useRef<"ok" | "error">("ok");

  /**
   * Salir del editor SIN perder el trabajo.
   *
   * `beforeunload` solo cubre cerrar/recargar la pestana: la navegacion interna
   * de Next no lo dispara, asi que pulsar "Volver al panel" con cambios
   * pendientes se los llevaba por delante sin un solo aviso. Medido en el E2E:
   * dos ediciones destruidas, cero dialogos.
   *
   * Se GUARDA antes de salir en vez de solo preguntar: preguntar traslada al
   * usuario un problema que la aplicacion puede resolver sola. Solo si el
   * guardado falla se le pregunta, porque ahi si hay una decision que tomar.
   */
  async function salirAlPanel() {
    if (!dirty) {
      router.push("/dashboard");
      return;
    }
    setSaliendo(true);
    try {
      await guardarAhora();
    } catch {
      // El propio guardado ya deja `errorGuardado` puesto.
    } finally {
      setSaliendo(false);
    }
    // Se pregunta por el RESULTADO del guardado, no por el estado de React.
    if (ultimoGuardado.current === "error") {
      setSalidaEnRiesgo(true);
      return;
    }
    router.push("/dashboard");
  }

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

  function addModule(type: ModuleType, index?: number) {
    // El id se genera AQUI y no en el reducer: un reducer con `crypto.randomUUID()`
    // dentro no es una funcion pura y deja de ser reproducible en pruebas.
    const id = `tmp-${crypto.randomUUID()}`;
    aplicar({ type: "addModule", moduleType: type, id, index });
    setSelectedId(id);
    setPanel("module");
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
      // `id` fijo: ahora que el autoguardado REINTENTA de verdad, sin esto el
      // usuario recibiria un aviso nuevo cada vez que hace una pausa.
      ultimoGuardado.current = "error";
      setErrorGuardado("El título es obligatorio.");
      toast.error("El título es obligatorio.", { id: "guardado-invalido" });
      return;
    }
    const cleanSlug = slugify(doc.invitation.slug);
    if (!cleanSlug) {
      ultimoGuardado.current = "error";
      setErrorGuardado("El slug es obligatorio (usa letras o números).");
      toast.error("El slug es obligatorio (usa letras o números).", {
        id: "guardado-invalido",
      });
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

    // `saveEditor` puede REVENTAR (red caida, servidor de pie). Sin este try
    // la excepcion salia del callback, el hook no se enteraba y el indicador se
    // quedaba en "Guardando…" indefinidamente.
    let result: Awaited<ReturnType<typeof saveEditor>>;
    try {
      result = await saveEditor({
      invitationId: enviado.invitation.id,
      version: versionRef.current,
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
    } catch {
      ultimoGuardado.current = "error";
      setErrorGuardado("No se pudo guardar. Revisa tu conexión.");
      toast.error("No se pudo guardar. Revisa tu conexión.", {
        id: "guardado-fallido",
      });
      return;
    }

    if (!result.ok) {
      ultimoGuardado.current = "error";
      setErrorGuardado(result.error);
      if (result.conflict) {
        setConflicto(true);
        // Sin `duration: Infinity` el aviso se va solo y el usuario sigue
        // editando creyendo que se guarda. El banner de arriba queda fijo.
        toast.error(result.error, { duration: Infinity });
        return;
      }
      toast.error(result.error);
      return;
    }

    ultimoGuardado.current = "ok";
    setErrorGuardado(null);

    // Se adopta la version que dejo el servidor. Si se quedara con la vieja,
    // el guardado siguiente chocaria contra su propio guardado anterior.
    versionRef.current = result.version;

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

  const { guardarAhora, guardando } = useAutosave({
    hayCambios: dirty,
    // El documento vivo cambia de identidad con CADA edicion. Pasar `dirty` a
    // secas —un booleano ya en `true`— hacia que la espera se armara una sola
    // vez y el editor dejara de guardar para siempre.
    revision: historia.presente,
    guardar: guardarDocumento,
    // `pausado` y no `hayCambios: dirty && !conflicto`: el usuario SIGUE
    // teniendo cambios sin guardar, asi que el aviso al cerrar la pestana debe
    // seguir vivo. Lo que se apaga es el reintento.
    pausado: conflicto,
  });

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

      {/*
        Solo aparece cuando el guardado de salida FALLO. Si el guardado va bien
        el usuario no ve nada: se le resolvio el problema en vez de contarselo.
      */}
      <AlertDialog
        open={salidaEnRiesgo}
        onOpenChange={(abierto) => !abierto && setSalidaEnRiesgo(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No se pudieron guardar tus cambios</AlertDialogTitle>
            <AlertDialogDescription>
              Si sales ahora perderás lo último que escribiste. Puedes quedarte e
              intentarlo otra vez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Quedarme</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setSalidaEnRiesgo(false);
                router.push("/dashboard");
              }}
            >
              Salir sin guardar
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
              {/* Sigue siendo un enlace real (clic central, "abrir en pestana
                  nueva", lectores de pantalla), pero con cambios pendientes se
                  intercepta para GUARDAR antes de irse. Sin esto, la
                  navegacion interna de Next se llevaba el trabajo por delante:
                  `beforeunload` no la cubre. */}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Volver al panel"
                render={<Link href="/dashboard" />}
                nativeButton={false}
                className="shrink-0"
                disabled={saliendo}
                onClick={(e) => {
                  if (!dirty) return;
                  e.preventDefault();
                  void salirAlPanel();
                }}
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
              {/* Cuatro estados, no dos. Antes era `dirty ? "Guardando…" :
                  "Guardado"`, asi que "Guardando…" solo significaba "hay
                  cambios": con un guardado fallido se quedaba ahi para siempre
                  y afirmaba que se estaba guardando algo que no estaba en
                  vuelo. */}
              {/* El `aria-live` envuelve a los DOS estados: si vive solo en la
                  rama de exito, el lector de pantalla deja de anunciar
                  justamente cuando hay algo que decir. */}
              <span className="flex min-w-0 items-center" aria-live="polite">
                {errorGuardado ? (
                  // El fallo SI se ve en movil. El estado normal se sigue
                  // ocultando en pantalla estrecha —el titulo importa mas— pero
                  // esconder el error dejaria al usuario editando sobre trabajo
                  // que no se esta guardando, que es el defecto que este cambio
                  // viene a cerrar.
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs text-destructive"
                    onClick={() => void guardarAhora()}
                  >
                    {errorGuardado} · Reintentar
                  </Button>
                ) : (
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                    {guardando ? "Guardando…" : dirty ? "Sin guardar" : "Guardado"}
                  </span>
                )}
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
              {/*
                "Ver" vive aqui y no dentro de Ajustes. Es la accion que mas se
                repite mientras editas —mirar como va quedando de verdad— y
                enterrarla dos clics adentro la volvia invisible. Solo aparece
                publicada, porque antes de eso el enlace no lleva a ningun lado.
              */}
              {invitation.is_published && username && invitation.slug && (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <a
                      href={`/${username}/${invitation.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <ExternalLinkIcon />
                  Ver
                </Button>
              )}
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
        Conflicto de version. Es un banner FIJO y no solo un toast: el toast se
        va (o el usuario lo cierra) y entonces sigue editando creyendo que se
        guarda, que es el fallo silencioso que este bloqueo viene a cerrar.
        Se le dice lo que pasa, lo que se hizo por el y la unica salida segura.
      */}
      {conflicto && (
        <div
          role="alert"
          // `warning` y no `destructive`: esto no es una operacion que fallo,
          // es un "detente". Y es el token que SI tiene el par superficie +
          // primer plano con contraste AA verificado por prueba
          // (`semantic-colors.test.ts`); `destructive` no tiene `-surface`,
          // asi que `bg-destructive-surface` no existiria y el banner saldria
          // transparente.
          className="shrink-0 border-b border-warning/40 bg-warning-surface px-4 py-3 text-sm"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {/*
              `text-warning` y NO `text-warning-fg`: `-fg` es la mitad que va
              sobre el color SOLIDO, no sobre el `-surface`. Medido en el
              navegador con el tema oscuro, `warning-fg` daba
              `rgb(42, 26, 0)` sobre un fondo `rgb(42, 32, 8)` — el mismo
              color, texto INVISIBLE. El emparejamiento bueno ya lo afirma
              `semantic-colors.test.ts`: "el color solido es legible como
              TEXTO sobre su propia superficie", en claro y en oscuro.
            */}
            <span className="font-medium text-warning">
              Otra pestaña guardó cambios más nuevos.
            </span>
            <span className="text-muted-foreground">
              Dejamos de guardar para no borrar ese trabajo. Tus cambios siguen
              en pantalla; recarga para ver la versión más nueva.
            </span>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={() => window.location.reload()}
            >
              Recargar
            </Button>
          </div>
        </div>
      )}

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
                {/*
                  Gutter con `+` ENTRE secciones, patron de Notion. Antes solo
                  existia un "Agregar modulo" global que siempre empujaba al
                  final: si querias una seccion en medio, la agregabas abajo y
                  la arrastrabas. El `+` inserta donde apuntas.

                  Aparece al pasar el cursor sobre su franja, no siempre: cinco
                  botones permanentes entre cuatro secciones convierten una
                  lista en ruido. `focus-within` lo mantiene visible cuando se
                  llega por teclado, que si no seria inalcanzable.
                */}
                <div>
                  {modules.map((m, i) => (
                    <div key={m.id}>
                      <Gutter indice={i} onAdd={addModule} />
                      <SortableModuleItem
                        module={m}
                        selected={panel === "module" && m.id === selectedId}
                        onSelect={() => {
                          setSelectedId(m.id);
                          setPanel("module");
                        }}
                        onToggleVisible={(v) => toggleVisible(m.id, v)}
                        onDelete={() => setPorBorrar(m)}
                      />
                    </div>
                  ))}
                  <Gutter indice={modules.length} onAdd={addModule} />
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
            // El arrastre escribe por la MISMA vía que los paneles
            // (`updateConfig`), así que hereda el autoguardado, el bloqueo
            // optimista y el deshacer sin nada nuevo. `claveDeFusion` funde por
            // `config:<id>:textOffsets`, así que un arrastre entero es UN paso
            // de ⌘Z y no uno por píxel.
            onOffset={(moduloId, bloque, d) => {
              const m = modules.find((x) => x.id === moduloId);
              if (!m) return;
              const patch = parcheDeDesplazamiento(
                m.module_type === "hero",
                (m.config as Record<string, unknown>)?.textOffsets,
                bloque,
                d,
              );
              // `null` = bloque que no encaja con la forma del módulo. Se
              // ignora en vez de escribir en un sitio inventado.
              if (patch) updateConfig(moduloId, patch);
            }}
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
