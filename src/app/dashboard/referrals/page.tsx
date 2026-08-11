import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReferralSummary } from "@/lib/referrals/actions";
import { REFERRAL_ENABLED } from "@/lib/billing/config";
import { ReferralPanel } from "@/components/referrals/referral-panel";

/**
 * Panel de referidos del usuario (Subfase 8.6).
 *
 * Muestra el código propio, saldo de crédito y lista de referidos, y permite
 * aplicar un código recibido (una sola vez). El programa se puede apagar con
 * `NEXT_PUBLIC_REFERRAL_ENABLED`.
 */
export default async function ReferralsPage() {
  if (!REFERRAL_ENABLED) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight">Referidos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          El programa de referidos no está disponible por ahora.
        </p>
      </div>
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const summary = await getReferralSummary(siteUrl);

  // ¿El usuario ya aplicó un código? (para mostrar u ocultar el formulario).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let canApply = false;
  if (user) {
    // La RLS de `referrals` solo expone filas al referente; para saber si ESTE
    // usuario ya fue referido consultamos server-side con el cliente admin.
    const admin = createAdminClient();
    const { data: alreadyReferred } = await admin
      .from("referrals")
      .select("id")
      .eq("referred_user_id", user.id)
      .maybeSingle();
    canApply = !alreadyReferred;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Referidos</h1>
        <p className="text-sm text-muted-foreground">
          Invita a otros a InvitaFlow y gana crédito cuando hagan su primera
          compra.
        </p>
      </div>
      {summary ? (
        <ReferralPanel summary={summary} canApply={canApply} />
      ) : (
        <p className="text-sm text-muted-foreground">
          No se pudo cargar tu información de referidos. Intenta de nuevo.
        </p>
      )}
    </div>
  );
}
