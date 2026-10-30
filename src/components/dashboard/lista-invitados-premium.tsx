import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  PLAN_LISTA_DE_INVITADOS,
  enlaceMejorarParaLista,
} from "@/lib/guests/premium";
import { cn } from "@/lib/utils";

/**
 * Lo que ve quien entra al gestor de invitados (o al escáner de ingreso) sin
 * el plan que incluye la lista: qué es, de qué plan es y el checkout de ESA
 * invitación para mejorarla. Sustituye al gestor; el servidor rechaza igual
 * cada acción (`src/lib/guests/actions.ts`), esto solo lo explica.
 */
export function ListaInvitadosPremium({
  invitationId,
}: {
  invitationId: string;
}) {
  return (
    <div
      role="status"
      className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm"
    >
      <p className="font-medium">
        La lista de invitados es del plan {PLAN_LISTA_DE_INVITADOS}
      </p>
      <p className="mt-1 text-muted-foreground">
        Con {PLAN_LISTA_DE_INVITADOS}, cada invitado recibe su enlace único y su
        pase QR, y registras su ingreso en la entrada. Mejora el plan de esta
        invitación para usarla, o vuelve a la confirmación abierta desde los
        ajustes del editor.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={enlaceMejorarParaLista(invitationId)}
          className={cn(buttonVariants({ size: "sm" }))}
        >
          Mejorar a {PLAN_LISTA_DE_INVITADOS}
        </Link>
        <Link
          href={`/editor/${invitationId}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Ir al editor
        </Link>
      </div>
    </div>
  );
}
