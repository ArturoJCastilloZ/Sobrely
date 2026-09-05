import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { rsvpConfigSchema } from "@/lib/modules/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RsvpTable, type RsvpRow } from "@/components/dashboard/rsvp-table";
import { GuestManager } from "@/components/dashboard/guest-manager";
import { FunnelKpis } from "@/components/dashboard/funnel-kpis";
import { ResponseBreakdown } from "@/components/dashboard/response-breakdown";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ConfirmationsChart } from "@/components/dashboard/confirmations-chart";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { LiveIndicator } from "@/components/dashboard/live-indicator";
import {
  activityFromGuests,
  activityFromResponses,
  funnelFromGuests,
  funnelFromResponses,
  outcomesFromGuests,
  outcomesFromResponses,
  type GuestRow,
  type ResponseRow,
} from "@/lib/dashboard/metrics";

export const metadata: Metadata = { title: "Panel del evento" };

/** Fecha larga en español; `null` si la invitación no tiene fecha aún. */
function formatEventDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function InvitationDashboardPage({
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

  // RLS restringe al dueño.
  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, title, slug, is_published, rsvp_mode, event_date")
    .eq("id", invitationId)
    .single();

  if (!invitation) notFound();

  const isGuestList = invitation.rsvp_mode === "guest_list";

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const username = profile?.username ?? "";
  // Nombre con el que se firma la invitación de WhatsApp ("Ana te invita a…").
  const hostName = (profile?.display_name as string | null) ?? null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const publicUrl =
    invitation.is_published && username
      ? `/${username}/${invitation.slug}`
      : null;

  // El "ahora" se fija en el servidor: el tiempo relativo y la serie deben
  // renderizar igual en servidor y cliente (sin desajuste de hidratación).
  const now = new Date().toISOString();

  // Cada modo tiene su propia fuente de verdad.
  const guestRows: GuestRow[] = [];
  let responseRows: (ResponseRow & { id: string })[] = [];

  if (isGuestList) {
    const { data } = await supabase
      .from("invitation_guests")
      .select(
        "name, status, max_guests, confirmed_count, checked_in_at, invited_at, created_at, updated_at",
      )
      .eq("invitation_id", invitationId);
    guestRows.push(...((data ?? []) as GuestRow[]));
  } else {
    const { data } = await supabase
      .from("rsvp_responses")
      .select(
        "id, guest_name, guest_email, attendance_status, guest_count, message, answers, created_at, updated_at",
      )
      .eq("invitation_id", invitationId)
      .order("created_at", { ascending: false });
    responseRows = (data ?? []) as (ResponseRow & { id: string })[];
  }

  // Preguntas vigentes del módulo RSVP: dan contexto a las respuestas guardadas
  // (que se indexan por id) y alimentan las columnas del CSV.
  const { data: rsvpModule } = await supabase
    .from("invitation_modules")
    .select("config")
    .eq("invitation_id", invitationId)
    .eq("module_type", "rsvp")
    .maybeSingle();
  const rsvpQuestions =
    rsvpConfigSchema.safeParse(rsvpModule?.config ?? {}).data?.questions ?? [];

  const funnel = isGuestList
    ? funnelFromGuests(guestRows)
    : funnelFromResponses(responseRows);

  const activity = isGuestList
    ? activityFromGuests(guestRows)
    : activityFromResponses(responseRows);

  const outcomes = isGuestList
    ? outcomesFromGuests(guestRows)
    : outcomesFromResponses(responseRows);

  const eventDate = formatEventDate(invitation.event_date as string | null);
  const ratePill =
    funnel.responseRate !== null
      ? `Evento al ${Math.round(funnel.responseRate * 100)}% de respuesta`
      : null;

  return (
    <div className="space-y-6">
      {/* Encabezado: cuál evento, cuándo, y cómo va — de un vistazo. */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              {invitation.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {eventDate ? (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  {eventDate}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  Sin fecha definida
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" aria-hidden="true" />
                {isGuestList ? "Lista de invitados" : "Confirmación abierta"}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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

        <div className="flex flex-wrap items-center gap-2">
          {ratePill ? (
            <Badge
              variant="secondary"
              className="border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            >
              {ratePill}
            </Badge>
          ) : null}
          {invitation.is_published ? (
            <Badge variant="outline">Publicada</Badge>
          ) : (
            <Badge variant="outline">Borrador</Badge>
          )}
          <LiveIndicator
            invitationId={invitation.id}
            mode={isGuestList ? "guest_list" : "open"}
          />
        </div>
      </div>

      <QuickActions
        funnel={funnel}
        invitationId={invitation.id}
        publicUrl={publicUrl}
      />

      <FunnelKpis funnel={funnel} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ResponseBreakdown funnel={funnel} />
        <ActivityFeed items={activity} now={now} />
      </div>

      <ConfirmationsChart outcomes={outcomes} now={now} />

      <section id="invitados" className="scroll-mt-6">
        {isGuestList ? (
          <GuestManager
            invitationId={invitation.id}
            siteUrl={siteUrl}
            eventTitle={invitation.title as string}
            hostName={hostName}
          />
        ) : (
          <RsvpTable
            initialRows={responseRows as unknown as RsvpRow[]}
            invitationSlug={invitation.slug}
            questions={rsvpQuestions}
          />
        )}
      </section>
    </div>
  );
}
