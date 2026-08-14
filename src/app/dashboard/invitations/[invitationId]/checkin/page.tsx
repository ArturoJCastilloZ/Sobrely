import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CheckInScanner } from "@/components/dashboard/checkin-scanner";

export const metadata: Metadata = { title: "Check-in" };

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/login?redirectTo=/dashboard/invitations/${invitationId}/checkin`,
    );
  }

  // RLS restringe al dueño.
  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, title, rsvp_mode")
    .eq("id", invitationId)
    .single();

  if (!invitation) notFound();
  if (invitation.rsvp_mode !== "guest_list") {
    redirect(`/dashboard/invitations/${invitationId}`);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Check-in</h1>
          <p className="text-muted-foreground">{invitation.title}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/dashboard/invitations/${invitation.id}`} />}
          nativeButton={false}
        >
          ← Volver
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Escanea el QR del pase de cada invitado en la entrada. También puedes
        marcar el ingreso manualmente desde la lista de invitados.
      </p>

      <CheckInScanner />
    </div>
  );
}
