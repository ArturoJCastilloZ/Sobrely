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

export const metadata: Metadata = { title: "Editor" };

export default async function EditorPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;

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

  return (
    <InvitationEditor
      initialInvitation={initialInvitation}
      initialModules={initialModules}
      initialTheme={parseTheme(invitation.theme_config)}
      username={profile?.username ?? ""}
      userId={user.id}
    />
  );
}
