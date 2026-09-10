import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MailPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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

  // VIGENCIA: la fuente de verdad es la RPC `is_entitlement_active` (0013), la
  // MISMA que gatea `get_public_invitation`. No se relee
  // `invitation_entitlements` a mano: ese duplicado ya se pagó una vez (ver el
  // comentario de `isOwnerComped` en src/lib/billing/entitlements.ts) y además
  // se equivocaría con las cuentas comped, cuyo entitlement puede no existir.
  //
  // Es N+1 y no hay forma de evitarlo sin SQL nuevo: la función recibe UN uuid
  // y no existe variante por lote (ni vista) que se pueda invocar desde
  // PostgREST. Se acota a las PUBLICADAS —un borrador es «Borrador» sin
  // preguntar— y se disparan en paralelo, así que es 1 round-trip de latencia,
  // no N. Medido en producción el 2026-09-09: 18 invitaciones, 7 publicadas
  // repartidas entre 4 dueños, y el que más tiene son 4 → 4 llamadas en el
  // peor panel de hoy.
  const publicadas = list.filter((inv) => inv.is_published);
  const vigencias = await Promise.all(
    publicadas.map(async (inv) => {
      const { data, error } = await supabase.rpc("is_entitlement_active", {
        p_invitation_id: inv.id,
      });
      // `null` = no se pudo resolver. NO se degrada a «Caducada» por un error
      // de red: ver `estadoDeInvitacion`.
      return [inv.id, error ? null : (data as boolean | null)] as const;
    }),
  );
  const vigenciaPorId = new Map(vigencias);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[length:var(--ed-text-2xl)]/(--ed-leading-2xl) font-(--ed-weight-semibold) tracking-(--ed-tracking-2xl)">
            Hola, {name}
          </h1>
          <p className="text-[length:var(--ed-text-sm)]/(--ed-leading-sm) tracking-(--ed-tracking-sm) text-muted-foreground">
            Gestiona tus invitaciones.
          </p>
        </div>
        {/* "Animaciones" y "Plantillas" viven ahora en el sidebar; aquí queda
            solo la accion primaria. Repetir navegacion junto a un CTA le roba
            peso al CTA. */}
        <NewInvitationButton />
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<MailPlusIcon />}
          title="Aún no tienes invitaciones"
          description="Elige una plantilla, personalízala y compártela con un enlace único por invitado. Puedes crear todos los borradores que quieras gratis."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <NewInvitationButton />
              <Button
                variant="outline"
                size="touch"
                render={<Link href="/dashboard/templates" />}
                nativeButton={false}
              >
                Ver plantillas
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((inv) => (
            <InvitationCard
              key={inv.id}
              invitation={inv}
              username={username}
              entitlementActive={vigenciaPorId.get(inv.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
