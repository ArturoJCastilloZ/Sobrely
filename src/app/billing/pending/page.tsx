import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Página de retorno para pagos pendientes (p.ej. efectivo/OXXO). El plan se
 * activará cuando MP confirme el pago vía webhook. (Detalle en 8.5.)
 */
export default function BillingPendingPage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Pago pendiente</h1>
      <p className="text-muted-foreground">
        Tu pago está en proceso. Si elegiste pagar en efectivo (por ejemplo
        OXXO), tu plan se activará automáticamente en cuanto se confirme el pago.
      </p>
      <Button render={<Link href="/dashboard" />} nativeButton={false}>
        Ir al dashboard
      </Button>
    </main>
  );
}
