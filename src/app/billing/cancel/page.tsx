import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Página de retorno cuando el pago se cancela o es rechazado. El borrador de la
 * invitación permanece intacto; el usuario puede reintentar. (Detalle en 8.5.)
 */
export default function BillingCancelPage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Pago no completado</h1>
      <p className="text-muted-foreground">
        No se completó el pago y no se realizó ningún cargo. Tu invitación sigue
        guardada como borrador; puedes intentar de nuevo cuando quieras.
      </p>
      <div className="flex gap-2">
        <Button render={<Link href="/pricing" />} nativeButton={false}>
          Ver planes
        </Button>
        <Button
          render={<Link href="/dashboard" />}
          nativeButton={false}
          variant="outline"
        >
          Ir al dashboard
        </Button>
      </div>
    </main>
  );
}
