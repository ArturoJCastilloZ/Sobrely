"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { defaultConfigFor, type ModuleType } from "@/lib/modules/types";
import { saveEditorSchema, type SaveEditorInput } from "@/lib/invitations/schemas";
import {
  canPublishInvitation,
  getInvitationEntitlement,
  isOwnerComped,
  planDePagoRequeridoParaInvitacion,
} from "@/lib/billing/entitlements";
import { decidirPublicacion } from "@/lib/billing/decision-publicacion";
import { templateToDocument } from "@/lib/invitations/template-render";
import type { PlanCode } from "@/lib/billing/types";
import { enlaceConDestino } from "@/lib/auth/ruta-interna";
import { esAnonimo } from "@/lib/auth/sesion";
import { rutaUsarPlantilla } from "@/lib/templates/marketplace";

/** Short random suffix to keep slugs unique per user without a lookup loop. */
function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * Creates a blank invitation (with a default Hero module) and redirects the
 * user into its editor.
 */
export async function createInvitation(
  mode: "open" | "guest_list" = "open",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rsvpMode = mode === "guest_list" ? "guest_list" : "open";
  const slug = `invitacion-${randomSuffix()}`;

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      user_id: user.id,
      title: "Invitación sin título",
      slug,
      status: "draft",
      is_published: false,
      rsvp_mode: rsvpMode,
    })
    .select("id")
    .single();

  if (error || !invitation) {
    throw new Error(error?.message ?? "No se pudo crear la invitación.");
  }

  // Seed a default Hero module so the preview isn't empty.
  const modules: {
    invitation_id: string;
    module_type: ModuleType;
    sort_order: number;
    is_visible: boolean;
    config: Record<string, unknown>;
  }[] = [
    {
      invitation_id: invitation.id,
      module_type: "hero",
      sort_order: 0,
      is_visible: true,
      config: defaultConfigFor("hero"),
    },
  ];

  // En modo lista de invitados el RSVP es obligatorio: se auto-agrega, y como
  // el cupo lo asigna el organizador, se apaga "pedir número de invitados".
  if (rsvpMode === "guest_list") {
    modules.push({
      invitation_id: invitation.id,
      module_type: "rsvp",
      sort_order: 1,
      is_visible: true,
      config: { ...defaultConfigFor("rsvp"), allowGuestCount: false },
    });
  }

  // Mismo motivo que en createFromTemplate: Supabase devuelve { error } en vez
  // de lanzar, y sin comprobarlo el usuario aterriza en un editor vacio.
  const { error: modErr } = await supabase
    .from("invitation_modules")
    .insert(modules);

  if (modErr) {
    // filas-no-verificadas: es una REVERSION. Se lanza igual justo despues, asi
    // que comprobar filas aqui solo podria enmascarar el error original, que es
    // el que el usuario necesita ver.
    await supabase.from("invitations").delete().eq("id", invitation.id);
    throw new Error(
      `No se pudieron crear las secciones iniciales: ${modErr.message}`,
    );
  }

  revalidatePath("/dashboard");
  redirect(`/editor/${invitation.id}`);
}

/**
 * Creates a new invitation from a template, copying its theme and modules,
 * then redirects into the editor.
 *
 * `reemplazar`: que la redirección SUSTITUYA la entrada actual del historial en
 * vez de apilar otra. Lo usa la creación automática al volver de registrarse
 * (`?usar=1`): así «atrás» desde el editor no regresa a una página que volvería
 * a crear la invitación. NO se resuelve quitando el parámetro con
 * `history.replaceState` antes de la acción: medido, esa navegación interna de
 * Next compite con la redirección de la acción y la pisa (el servidor creaba
 * la invitación y el navegador se quedaba en la plantilla). El botón normal
 * del dashboard no lo pasa y conserva su comportamiento.
 */
export async function createFromTemplate(
  templateId: string,
  opciones?: { reemplazar?: boolean },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Sesión caducada a media acción: `/login` pelado perdía la plantilla que la
    // persona acababa de elegir. Se le devuelve a ELLA, con la señal de crear.
    const { data: destino } = await supabase
      .from("templates")
      .select("slug")
      .eq("id", templateId)
      .eq("is_active", true)
      .maybeSingle();
    redirect(
      destino?.slug
        ? enlaceConDestino("/login", "redirectTo", rutaUsarPlantilla(destino.slug as string))
        : "/login",
    );
  }

  // Templates are publicly readable when active (RLS).
  const { data: template, error: tplErr } = await supabase
    .from("templates")
    .select("id, name, event_type, theme_config, modules_config, is_active")
    .eq("id", templateId)
    .eq("is_active", true)
    .single();

  if (tplErr || !template) {
    throw new Error("La plantilla no existe o no está disponible.");
  }

  const slug = `invitacion-${randomSuffix()}`;

  // UNA sola fuente para "que produce esta plantilla". La galeria captura sus
  // miniaturas con esta misma funcion, asi que lo que se ve en el catalogo es
  // por construccion lo que se recibe al elegirla.
  const doc = templateToDocument(template);

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      user_id: user.id,
      template_id: template.id,
      title: template.name ?? "Invitación sin título",
      slug,
      event_type: template.event_type ?? null,
      status: "draft",
      is_published: false,
      theme_config: doc.theme,
    })
    .select("id")
    .single();

  if (error || !invitation) {
    throw new Error(error?.message ?? "No se pudo crear la invitación.");
  }

  const modules = doc.modules;

  if (modules.length > 0) {
    // Supabase NO lanza: devuelve { error }. Ignorarlo dejaba la invitacion
    // creada SIN secciones y al usuario en un editor vacio, sin ningun aviso.
    const { error: modErr } = await supabase.from("invitation_modules").insert(
      modules.map((m) => ({
        invitation_id: invitation.id,
        module_type: m.module_type,
        sort_order: m.sort_order,
        is_visible: m.is_visible,
        config: m.config,
      })),
    );

    if (modErr) {
      // No hay transaccion entre las dos llamadas, asi que la invitacion a
      // medias se deshace a mano. Si el borrado tambien falla se sigue
      // lanzando: mejor un error visible que un editor vacio en silencio.
      // filas-no-verificadas: es una REVERSION, mismo motivo que en
      // `createInvitation`.
      await supabase.from("invitations").delete().eq("id", invitation.id);
      throw new Error(
        `No se pudieron crear las secciones de la plantilla: ${modErr.message}`,
      );
    }
  }

  revalidatePath("/dashboard");
  redirect(
    `/editor/${invitation.id}`,
    opciones?.reemplazar ? RedirectType.replace : RedirectType.push,
  );
}

export type SetPublishedResult =
  | { ok: true; is_published: boolean }
  | {
      ok: false;
      error: string;
      /** Plan de pago que desbloquea la publicación (lo decide el SERVIDOR). */
      requiredPlan?: PlanCode;
      /**
       * Contrato C1: señal AUTORITATIVA de que publicar requiere pagar. El
       * editor la usa para abrir el cobro sin leer `plans.ts` en el cliente.
       */
      needsPayment?: boolean;
      /** Compatibilidad: igual que `needsPayment`; se conserva hasta que nadie la lea. */
      needsUpgrade?: boolean;
      /** El que publica es un invitado: hay que pedirle que cree su cuenta primero. */
      needsAccount?: boolean;
    };

/**
 * Publica o despublica una invitación (solo el dueño).
 *
 * Publicar cuesta (Fase 3: se quitó la demo de 14 días). Con comp (cuenta de
 * cortesía) o con un entitlement vigente manda el gate de entitlements
 * (Subfase 8.4): los módulos visibles, la temática y el arte propio deben
 * caber en el plan que ya tiene. SIN ninguno de los dos no se crea nada gratis:
 * se devuelve `needsPayment` con el plan de pago más barato que cubre la
 * invitación. En ambos casos NO se borra nada; el contenido se conserva para
 * publicar después de pagar. La decisión vive en `decidirPublicacion`.
 *
 * Los entitlements Free que ya existían siguen vigentes hasta vencer: caen en
 * la rama del gate y no se rompe ninguna invitación ya publicada.
 */
export async function setPublished(
  invitationId: string,
  published: boolean,
): Promise<SetPublishedResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  // Un invitado diseña sin cuenta; publicar es el momento de pedírsela. La base también lo
  // rechaza (trigger `ANONIMO_NO_PUBLICA`), esto solo devuelve la señal para el modal.
  if (published && esAnonimo(user)) {
    return {
      ok: false,
      error: "Crea tu cuenta para publicar. Tu invitación se queda como la diseñaste.",
      needsAccount: true,
    };
  }

  // Despublicar: solo apaga la bandera.
  if (!published) {
    const { data: filas, error } = await supabase
      .from("invitations")
      .update({ is_published: false, status: "draft" })
      .eq("id", invitationId)
      .eq("user_id", user.id)
      .select("id");
    if (error) return { ok: false, error: error.message };
    // 0 filas = no es tuya o ya no existe. Antes devolvia
    // `{ ok: true, is_published: false }` y el editor se pintaba como
    // despublicado sin que la base hubiera cambiado.
    if (!filas || filas.length === 0) {
      return { ok: false, error: "No tienes acceso a esta invitación." };
    }
    revalidatePath(`/editor/${invitationId}`);
    revalidatePath("/dashboard");
    return { ok: true, is_published: false };
  }

  // Publicar: verifica propiedad y trae la fecha del evento.
  const { data: inv, error: invErr } = await supabase
    .from("invitations")
    .select("id, event_date")
    .eq("id", invitationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (invErr || !inv) {
    return { ok: false, error: "No tienes acceso a esta invitación." };
  }

  // ¿Hay con qué publicar? Comp de admin, o un entitlement vigente. El comp NO
  // crea fila: `is_entitlement_active` en la BD ya deja pública la invitación
  // comped, y un entitlement aparte ensuciaría el estado al vencer.
  const ent = await getInvitationEntitlement(supabase, invitationId);
  const comped = await isOwnerComped(supabase, invitationId);
  const tieneCobertura = comped || Boolean(ent?.isActive);

  // Con cobertura manda el gate (¿el plan que ya tiene cubre lo que usa?). Sin
  // ella se calcula el plan de pago que haría falta. Cada rama solo hace la
  // consulta que necesita.
  const gate = tieneCobertura
    ? await canPublishInvitation(supabase, invitationId)
    : null;
  const planDePago = tieneCobertura
    ? undefined
    : await planDePagoRequeridoParaInvitacion(supabase, invitationId);

  const decision = decidirPublicacion({
    tieneComp: comped,
    entitlementVigente: Boolean(ent?.isActive),
    gate,
    planDePago,
  });

  if (decision.tipo === "pagar") {
    return {
      ok: false,
      error: decision.mensaje,
      requiredPlan: decision.planRequerido,
      needsPayment: true,
      needsUpgrade: true,
    };
  }
  if (decision.tipo === "sin_plan_disponible") {
    return { ok: false, error: decision.mensaje };
  }

  const { data: filas, error } = await supabase
    .from("invitations")
    .update({ is_published: true, status: "published" })
    .eq("id", invitationId)
    .eq("user_id", user.id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!filas || filas.length === 0) {
    return { ok: false, error: "No tienes acceso a esta invitación." };
  }

  revalidatePath(`/editor/${invitationId}`);
  revalidatePath("/dashboard");
  return { ok: true, is_published: true };
}

export async function deleteInvitation(invitationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS also enforces ownership; the explicit filter keeps intent clear.
  const { data: filas, error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", invitationId)
    .eq("user_id", user.id)
    .select("id");

  if (error) throw new Error(error.message);
  // Se LANZA en vez de devolver: la tarjeta ya captura y muestra el mensaje,
  // y devolver en silencio es justo lo que hacia que "Invitación eliminada."
  // saliera sobre un borrado de 0 filas.
  if (!filas || filas.length === 0) {
    throw new Error("Esa invitación ya no existe.");
  }

  // Las imagenes NO se van con la fila. El `on delete cascade` limpia las
  // tablas hijas, pero Storage es otro sistema y nadie lo tocaba: medido en el
  // E2E, la foto de una invitacion borrada seguia sirviendose en HTTP 200
  // desde un bucket PUBLICO. O sea que el arte que un cliente subio a su
  // invitacion, y que borro, seguia descargable por quien tuviera la URL.
  //
  // Va DESPUES del borrado de la fila y a proposito: si se hiciera antes y el
  // borrado fallara, se habrian destruido las imagenes de una invitacion que
  // sigue viva. Y no se lanza si falla: la invitacion YA no existe, asi que
  // hacer fracasar la accion mentiria sobre lo que paso. Se registra.
  await borrarImagenesDeLaInvitacion(supabase, user.id, invitationId);

  revalidatePath("/dashboard");
}

/**
 * Vacia `invitation-images/<user_id>/<invitation_id>/`.
 *
 * La policy de borrado de la `0005` deja al dueno borrar lo de su carpeta con
 * su propia sesion, asi que no hace falta el cliente admin.
 */
async function borrarImagenesDeLaInvitacion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  invitationId: string,
): Promise<void> {
  const carpeta = `${userId}/${invitationId}`;
  const bucket = supabase.storage.from("invitation-images");
  const rutas: string[] = [];

  // Se pagina de verdad. `list` tiene tope, y quedarse con la primera pagina
  // dejaria huerfanos justo en las invitaciones con mas fotos — que son las que
  // mas ocupan.
  const TAM = 100;
  for (let offset = 0; ; offset += TAM) {
    const { data, error } = await bucket.list(carpeta, {
      limit: TAM,
      offset,
    });
    if (error) {
      console.error("[invitations] listar imagenes:", error.message);
      return;
    }
    if (!data || data.length === 0) break;
    for (const obj of data) rutas.push(`${carpeta}/${obj.name}`);
    if (data.length < TAM) break;
  }

  if (rutas.length === 0) return;

  const { data: borradas, error: rmErr } = await bucket.remove(rutas);
  if (rmErr) {
    console.error("[invitations] borrar imagenes:", rmErr.message);
    return;
  }
  // `remove` tampoco falla por una ruta que ya no existe, asi que se compara
  // lo pedido con lo devuelto en vez de dar por hecho que se limpio.
  if ((borradas?.length ?? 0) !== rutas.length) {
    console.error(
      `[invitations] imagenes huerfanas en ${carpeta}: se pidieron ${rutas.length}, se borraron ${borradas?.length ?? 0}`,
    );
  }
}

export type SavedModule = {
  id: string;
  module_type: string;
  sort_order: number;
  is_visible: boolean;
  config: Record<string, unknown>;
};

export type SaveEditorResult =
  | { ok: true; modules: SavedModule[]; version: number }
  /**
   * `conflict` distingue "otra pestaña guardó antes que tú" de un error
   * cualquiera. El editor lo necesita para PARAR de guardar en vez de mostrar
   * un toast y seguir reintentando: reintentar un conflicto no lo resuelve,
   * solo repite el aviso.
   */
  | { ok: false; error: string; conflict?: true };

/**
 * Persists the full editor state: invitation settings + the module list.
 * New modules (temp ids) are inserted, removed ones deleted, the rest updated.
 */
export async function saveEditor(
  input: SaveEditorInput,
): Promise<SaveEditorResult> {
  const parsed = saveEditorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const { invitationId, version, settings, theme, modules } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  // Verify ownership up front (defense in depth alongside RLS). Trae también
  // la versión, solo para poder distinguir "no es tuya / ya no existe" de
  // "otra pestaña se te adelantó" cuando el compare-and-set de abajo no
  // afecte ninguna fila. Este chequeo es INFORMATIVO: la defensa real es el
  // `where version = ...` de la sentencia siguiente.
  const { data: owned, error: ownErr } = await supabase
    .from("invitations")
    .select("id, version")
    .eq("id", invitationId)
    .eq("user_id", user.id)
    .single();
  if (ownErr || !owned) {
    return { ok: false, error: "No tienes acceso a esta invitación." };
  }

  // 1) Update invitation settings — compare-and-set de la versión.
  //
  // El `where version = <esperada>` y el `version = <esperada> + 1` van en la
  // MISMA sentencia, así que de N guardados concurrentes con la misma versión
  // esperada pasa exactamente uno: los demás afectan 0 filas. Leer la versión
  // en una consulta y escribirla en otra no defendería nada — es la lección
  // que dejó el contador de intentos del reporte con PIN (`0020`).
  //
  // `select().maybeSingle()` es lo que permite CONTAR las filas afectadas: sin
  // el select, PostgREST no devuelve el cuerpo y un update que no tocó nada es
  // indistinguible de uno que sí.
  const { data: bumped, error: updErr } = await supabase
    .from("invitations")
    .update({
      title: settings.title,
      slug: settings.slug,
      event_type: settings.eventType || null,
      event_date: settings.eventDate || null,
      theme_config: theme,
      version: version + 1,
    })
    .eq("id", invitationId)
    .eq("user_id", user.id)
    .eq("version", version)
    .select("version")
    .maybeSingle();

  if (updErr) {
    if (updErr.code === "23505") {
      return { ok: false, error: "Ya tienes otra invitación con ese slug." };
    }
    return { ok: false, error: updErr.message };
  }

  // 0 filas afectadas con la invitación existente y siendo tuya = la versión
  // no coincidió. Se responde ANTES de tocar los módulos, así que un conflicto
  // no deja nada escrito a medias: ni ajustes, ni borrados, ni inserciones.
  if (!bumped) {
    return {
      ok: false,
      conflict: true,
      error:
        "Otra pestaña o dispositivo guardó cambios más nuevos. Recarga para no borrar ese trabajo.",
    };
  }

  // 2) Reconcile modules.
  const { data: existing } = await supabase
    .from("invitation_modules")
    .select("id")
    .eq("invitation_id", invitationId);

  const existingIds = new Set((existing ?? []).map((m) => m.id as string));
  const keptIds = new Set(
    modules.map((m) => m.id).filter((id) => existingIds.has(id)),
  );

  // Delete modules removed in the editor.
  const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from("invitation_modules")
      // filas-no-verificadas: `toDelete` se acaba de derivar de un `select` de
      // esta misma tabla, asi que 0 filas solo puede pasar si otra pestana
      // borro el modulo en el hueco entre las dos sentencias — y eso lo caza
      // antes el bloqueo optimista de la version.
      .delete()
      .in("id", toDelete);
    if (delErr) return { ok: false, error: delErr.message };
  }

  // Update existing modules.
  for (const mod of modules) {
    if (existingIds.has(mod.id)) {
      const { error } = await supabase
        .from("invitation_modules")
        // filas-no-verificadas: mismo motivo que el delete de arriba; el id
        // viene de `existingIds`, leido en esta misma peticion.
        .update({
          module_type: mod.module_type,
          sort_order: mod.sort_order,
          is_visible: mod.is_visible,
          config: mod.config,
        })
        .eq("id", mod.id)
        .eq("invitation_id", invitationId);
      if (error) return { ok: false, error: error.message };
    }
  }

  // Insert new modules (temp ids).
  const toInsert = modules
    .filter((m) => !existingIds.has(m.id))
    .map((m) => ({
      invitation_id: invitationId,
      module_type: m.module_type,
      sort_order: m.sort_order,
      is_visible: m.is_visible,
      config: m.config,
    }));
  if (toInsert.length > 0) {
    const { error: insErr } = await supabase
      .from("invitation_modules")
      .insert(toInsert);
    if (insErr) return { ok: false, error: insErr.message };
  }

  // Re-read the reconciled module list so the client can adopt real DB ids.
  const { data: fresh } = await supabase
    .from("invitation_modules")
    .select("id, module_type, sort_order, is_visible, config")
    .eq("invitation_id", invitationId)
    .order("sort_order", { ascending: true });

  revalidatePath(`/editor/${invitationId}`);
  revalidatePath("/dashboard");
  return {
    ok: true,
    modules: (fresh ?? []) as SavedModule[],
    // La versión que dejó el compare-and-set. El cliente la adopta; si se
    // quedara con la vieja, su siguiente guardado chocaría contra sí mismo.
    version: bumped.version as number,
  };
}
