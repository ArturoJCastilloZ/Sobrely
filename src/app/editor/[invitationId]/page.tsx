import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseConfig, type ModuleType } from "@/lib/modules/types";
import { parseTheme } from "@/lib/theme/theme";
import type {
  EditorInvitation,
  EditorModule,
} from "@/lib/invitations/editor-types";
import { InvitationEditor } from "@/components/editor/invitation-editor";
import { esInicioReciente } from "@/lib/auth/inicio-reciente";
import { leerPortadaDePlantilla, type PortadaBase } from "@/lib/analytics/borrador-completo";

export const metadata: Metadata = { title: "Editor" };

export default async function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ invitationId: string }>;
  searchParams: Promise<{ publicar?: string }>;
}) {
  const { invitationId } = await params;
  const { publicar } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/editor/${invitationId}`);

  // RLS restricts this to the owner; a non-owned/unknown id returns no row.
  const { data: invitation } = await supabase
    .from("invitations")
    .select(
      "id, title, slug, event_type, event_date, is_published, theme_config, rsvp_mode",
    )
    .eq("id", invitationId)
    .single();

  if (!invitation) notFound();

  // El token de bloqueo optimista se pide APARTE, y no en el select de arriba,
  // porque PostgREST falla la consulta ENTERA si la columna no existe: medido
  // contra la BD real, `select=id,version` responde `42703 column
  // invitations.version does not exist`. Metido en el select principal, el
  // editor daria 404 en TODAS las invitaciones en el hueco entre desplegar
  // este codigo y aplicar la migracion `0027` — no un guardado degradado, la
  // pantalla completa. Aislado aqui, ese hueco deja el editor USABLE (con la
  // version en 1) y solo el guardado responde error hasta que el SQL corra.
  const { data: versionRow } = await supabase
    .from("invitations")
    .select("version")
    .eq("id", invitationId)
    .maybeSingle();
  const initialVersion = (versionRow?.version as number | null) ?? 1;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const { data: moduleRows } = await supabase
    .from("invitation_modules")
    .select("id, module_type, sort_order, is_visible, config")
    .eq("invitation_id", invitationId)
    .order("sort_order", { ascending: true });

  const initialInvitation: EditorInvitation = {
    id: invitation.id,
    title: invitation.title ?? "",
    slug: invitation.slug ?? "",
    event_type: invitation.event_type ?? "",
    event_date: invitation.event_date ?? "",
    is_published: invitation.is_published ?? false,
    rsvp_mode: invitation.rsvp_mode === "guest_list" ? "guest_list" : "open",
  };

  const initialModules: EditorModule[] = (moduleRows ?? []).map((m) => {
    const type = m.module_type as ModuleType;
    const content = parseConfig(type, m.config);
    // Preserve the per-module animation override that parseConfig strips out.
    const rawAnimation = (m.config as Record<string, unknown> | null)?.animation;
    return {
      id: m.id as string,
      module_type: type,
      sort_order: m.sort_order as number,
      is_visible: m.is_visible as boolean,
      config: rawAnimation ? { ...content, animation: rawAnimation } : content,
    };
  });

  // Portada que traía la plantilla de origen, para saber si la persona ya puso sus nombres
  // (lista de progreso del editor, T13). `null` si la invitación nació en blanco.
  let portadaDePlantilla: PortadaBase | null = null;
  const { data: origen } = await supabase
    .from("invitations")
    .select("template_id")
    .eq("id", invitationId)
    .maybeSingle();
  if (origen?.template_id) {
    const { data: tpl } = await supabase
      .from("templates")
      .select("modules_config")
      .eq("id", origen.template_id as string)
      .maybeSingle();
    portadaDePlantilla = leerPortadaDePlantilla(tpl?.modules_config);
  }

  /*
    Reanudar la publicación tras crear la cuenta (T13). El invitado ya pulsó Publicar y confirmó
    la lista previa; la cuenta se creó sobre la misma sesión y vuelve aquí con `?publicar=1`.
    El parámetro por sí solo NO basta: publicar porque una URL lo pide es un cambio de estado
    disparado por navegación (el mismo patrón que `?usar=1` de las plantillas), así que además
    exige una cuenta real, una invitación aún sin publicar y un inicio de sesión o un cambio de
    cuenta de hace segundos. Aun así, el servidor sigue decidiendo: sin plan pagado, `setPublished`
    no publica y la persona ve el aviso de pago.
  */
  const reanudarPublicacion =
    publicar === "1" &&
    user.is_anonymous !== true &&
    !initialInvitation.is_published &&
    (esInicioReciente(user.last_sign_in_at) || esInicioReciente(user.updated_at));

  return (
    <InvitationEditor
      portadaDePlantilla={portadaDePlantilla}
      reanudarPublicacion={reanudarPublicacion}
      initialInvitation={initialInvitation}
      initialVersion={initialVersion}
      initialModules={initialModules}
      initialTheme={parseTheme(invitation.theme_config)}
      username={profile?.username ?? ""}
      userId={user.id}
    />
  );
}
