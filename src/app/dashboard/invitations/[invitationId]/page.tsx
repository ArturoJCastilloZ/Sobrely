import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { RsvpStats } from "@/components/dashboard/rsvp-stats";
import { RsvpTable, type RsvpRow } from "@/components/dashboard/rsvp-table";

export const metadata: Metadata = { title: "Respuestas" };

export default async function InvitationRsvpsPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard/invitations/${invitationId}`);

  // RLS restricts to the owner.
  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, title, slug, is_published")
    .eq("id", invitationId)
    .single();

  if (!invitation) notFound();

  const { data: responses } = await supabase
    .from("rsvp_responses")
    .select(
      "id, guest_name, guest_email, attendance_status, guest_count, message, created_at",
    )
    .eq("invitation_id", invitationId)
    .order("created_at", { ascending: false });

  const rows = (responses ?? []) as RsvpRow[];

  const confirmed = rows.filter((r) => r.attendance_status === "yes").length;
  const declined = rows.filter((r) => r.attendance_status === "no").length;
  const maybe = rows.filter((r) => r.attendance_status === "maybe").length;
  const totalGuests = rows
    .filter((r) => r.attendance_status === "yes")
    .reduce((sum, r) => sum + (r.guest_count ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Respuestas · {invitation.title}
          </h1>
          <p className="text-muted-foreground">
            Confirmaciones de asistencia de tus invitados.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/editor/${invitation.id}`} />}
            nativeButton={false}
          >
            Editar invitación
          </Button>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/dashboard" />}
            nativeButton={false}
          >
            ← Volver
          </Button>
        </div>
      </div>

      <RsvpStats
        confirmed={confirmed}
        declined={declined}
        maybe={maybe}
        totalGuests={totalGuests}
      />

      <RsvpTable initialRows={rows} invitationSlug={invitation.slug} />
    </div>
  );
}
