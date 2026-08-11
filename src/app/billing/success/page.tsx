import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

/**
 * Página de retorno tras un pago aprobado en Mercado Pago.
 *
 * IMPORTANTE: llegar aquí NO activa el plan. La activación depende del webhook
 * server-side. Esta página LEE el estado real de la orden (RLS del dueño) para
 * mostrar el mensaje correcto: si el webhook ya confirmó, dirá "activo"; si aún
 * no, invita a esperar. Nunca deriva "pagado" del solo hecho de visitarla.
 */
export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;

  let status: string | null = null;
  if (orderId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .maybeSingle();
    status = (data?.status as string) ?? null;
  }

  const confirmed = status === "paid";

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight">
        {confirmed ? "¡Pago confirmado!" : "¡Gracias por tu pago!"}
      </h1>
      <p className="text-muted-foreground">
        {confirmed
          ? "Tu plan quedó activo. Ya puedes publicar tu invitación con todas las funciones de tu plan."
          : "Estamos confirmando tu pago con Mercado Pago. En cuanto se confirme, tu plan quedará activo (normalmente unos momentos). Puedes revisar el estado en Facturación."}
      </p>
      <div className="flex gap-2">
        <Button render={<Link href="/dashboard" />} nativeButton={false}>
          Ir al dashboard
        </Button>
        <Button
          render={<Link href="/dashboard/billing" />}
          nativeButton={false}
          variant="outline"
        >
          Ver facturación
        </Button>
      </div>
    </main>
  );
}
