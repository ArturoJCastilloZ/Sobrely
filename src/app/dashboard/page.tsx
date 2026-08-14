import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { NewInvitationButton } from "@/components/dashboard/new-invitation-button";
import {
  InvitationCard,
  type InvitationSummary,
} from "@/components/dashboard/invitation-card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user!.id)
    .single();

  const username = profile?.username ?? "";

  const { data: invitations } = await supabase
    .from("invitations")
    .select("id, title, slug, event_type, is_published, updated_at, rsvp_mode")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  const name = profile?.display_name || profile?.username || user!.email;
  const list = (invitations ?? []) as InvitationSummary[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hola, {name} 👋</h1>
          <p className="text-muted-foreground">Gestiona tus invitaciones.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            render={<Link href="/dashboard/animations" />}
            nativeButton={false}
          >
            Animaciones
          </Button>
          <Button
            variant="outline"
            render={<Link href="/dashboard/templates" />}
            nativeButton={false}
          >
            Explorar plantillas
          </Button>
          <NewInvitationButton />
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Aún no tienes invitaciones. Crea la primera para empezar.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((inv) => (
            <InvitationCard key={inv.id} invitation={inv} username={username} />
          ))}
        </div>
      )}
    </div>
  );
}
