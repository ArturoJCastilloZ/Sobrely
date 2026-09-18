"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { EditorInvitation, EditorModule } from "@/lib/invitations/editor-types";
import { saveEditor, setPublished } from "@/lib/invitations/actions";
import { slugify } from "@/lib/invitations/schemas";
import { CheckoutButton } from "@/components/billing/checkout-button";
import {
  formatPrice,
  getEffectivePrice,
  getPlan,
  type PlanCode,
} from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ThemeConfig } from "@/lib/theme/theme";
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
import {
  DocumentoProvider,
  type DocumentoApi,
} from "@/lib/editor/contexto-documento";
import {
  SeleccionProvider,
  type SeleccionApi,
} from "@/lib/editor/contexto-seleccion";
import { LienzoProvider } from "@/lib/editor/contexto-lienzo";
import { EditorLayout } from "./shell/editor-layout";

/**
 * Dueno del DOCUMENTO: el historial, el autoguardado y la publicacion.
 *
 * Antes este archivo tenia 1 128 lineas y era ademas el chrome entero —barra
 * superior, riel, lienzo, inspector, barra movil y tres dialogos—, asi que
 * cualquier estado de interfaz vivia junto al documento. Consecuencia medida:
 * un clic en otra seccion del riel repintaba la invitacion COMPLETA.
 *
 * Ahora el reparto es:
 *
 *   InvitationEditor   documento + persistencia   (este archivo)
 *   SeleccionProvider  que hay elegido            (`lib/editor/contexto-seleccion`)
 *   LienzoProvider     zoom / vista / seccion     (`lib/editor/contexto-lienzo`)
 *   EditorLayout       la composicion, sin hooks  (`shell/editor-layout`)
 *
 * La clave del desacople es que `EditorLayout` se crea UNA vez por render de
 * este componente. Cuando cambia la seleccion, solo repinta `SeleccionProvider`
 * — y su prop `children` sigue siendo el MISMO objeto de elemento, asi que
 * React se salta el arbol entero. Solo repintan los que llaman `useSeleccion()`,
 * por suscripcion al contexto y no por su padre.
 *
 * El reducer del historial y `useAutosave` NO se han tocado: son el codigo mas
 * delicado del editor y cada linea de sus comentarios esta pagada con una
 * perdida de datos reproducida.
 */
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  // Memoizado: si fuera un objeto nuevo por render, cada `ImageUploader` de los
  // paneles veria una prop distinta en cada tecla que se pulse en cualquier sitio.
  const uploadCtx = useMemo(
    () => ({ userId, invitationId: initialInvitation.id }),
    [userId, initialInvitation.id],
  );

  /**
   * Puente imperativo a la seleccion, que vive POR DEBAJO de este componente.
   *
   * Se usa en un solo sitio: tras guardar, los modulos nuevos dejan de ser
   * `tmp-*` y reciben su uuid real; sin reapuntar la seleccion, el panel de
   * propiedades se vacia justo despues del primer autoguardado de una seccion
   * recien creada.
   *
   * Es una ref y no una suscripcion PORQUE suscribir este componente a la
   * seleccion es exactamente lo que el refactor viene a evitar: repintaria el
   * lienzo en cada clic. Es el mismo motivo por el que `versionRef`, `docRef` y
   * `ultimoGuardado` ya eran refs.
   */
  const seleccionRef = useRef<SeleccionApi | null>(null);

  // Derivado del documento, no una bandera: deshacer hasta el punto guardado
  // deja de marcar pendientes, que es lo que el usuario espera.
  const dirty = useMemo(() => hayCambiosSinGuardar(historia), [historia]);
  const [isPublishing, startPublishing] = useTransition();
  // Plan requerido cuando la publicación se bloquea por usar módulos ⭐ premium.
  const [upgradePlan, setUpgradePlan] = useState<PlanCode | null>(null);
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

    seleccionRef.current?.remapear(mapa);
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
  const salirAlPanel = useCallback(async () => {
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
  }, [dirty, guardarAhora, router]);

  const alternarPublicado = useCallback(() => {
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
  }, [invitation.is_published, invitation.id, dirty, guardarAhora, aplicar]);

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

  const deshacer = useCallback(() => despachar({ type: "deshacer" }), []);
  const rehacer = useCallback(() => despachar({ type: "rehacer" }), []);

  const documento = useMemo<DocumentoApi>(
    () => ({
      invitation,
      modules,
      theme,
      aplicar,
      deshacer,
      rehacer,
      puedeDeshacer: puedeDeshacer(historia),
      puedeRehacer: puedeRehacer(historia),
      dirty,
      guardando,
      errorGuardado,
      conflicto,
      guardarAhora,
      publicando: isPublishing,
      alternarPublicado,
      salirAlPanel,
      saliendo,
      username,
      siteUrl,
      uploadCtx,
    }),
    [
      invitation, modules, theme, aplicar, deshacer, rehacer, historia, dirty,
      guardando, errorGuardado, conflicto, guardarAhora, isPublishing,
      alternarPublicado, salirAlPanel, saliendo, username, siteUrl, uploadCtx,
    ],
  );

  const upgradePlanObj = upgradePlan ? getPlan(upgradePlan) : undefined;

  return (
    <DocumentoProvider value={documento}>
      {/* Modal de mejora de plan (bloqueo de publicación por módulos premium) */}
      {upgradePlanObj && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setUpgradePlan(null)}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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

      <SeleccionProvider
        idInicial={initialModules[0]?.id ?? null}
        apiRef={seleccionRef}
      >
        <LienzoProvider>
          <EditorLayout />
        </LienzoProvider>
      </SeleccionProvider>
    </DocumentoProvider>
  );
}
