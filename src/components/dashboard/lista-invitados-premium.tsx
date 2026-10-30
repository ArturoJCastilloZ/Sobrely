import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  PLAN_LISTA_DE_INVITADOS,
  enlaceMejorarParaLista,
} from "@/lib/guests/premium";
import { cn } from "@/lib/utils";

/**
 * Lo que ve quien entra al escáner de ingreso sin Premium, o al gestor de
 * invitados con la invitación PUBLICADA sin Premium: qué es, de qué plan es y
 * el checkout de ESA invitación para mejorarla. Sustituye a la herramienta; el
 * servidor rechaza igual cada acción (`src/lib/guests/actions.ts`), esto solo
 * lo explica. En borrador el gestor no se bloquea: ver `AvisoListaEnBorrador`.
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

/**
 * Aviso del gestor en BORRADOR sin Premium: la lista se arma gratis y Premium
 * se cobra al publicar (decisión del dueño del 2026-10-30, «Sí, Premium al
 * publicar»). No bloquea nada; da el checkout de ESA invitación.
 *
 * Sale en TODO borrador cuyo plan efectivo no incluye la lista, también si ya
 * pagó otro plan (`planPagado`): ese usuario es el que más se sorprendería al
 * publicar, porque cree que ya pagó. A él se le dice que su plan no incluye la
 * lista y que puede volver a confirmación abierta para publicar con él.
 */
export function AvisoListaEnBorrador({
  mejorarHref,
  planPagado,
}: {
  mejorarHref: string;
  planPagado: string | null;
}) {
  return (
    <div
      role="status"
      className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs"
    >
      {planPagado ? (
        <>
          <p className="font-medium">
            Tu plan {planPagado} no incluye la lista de invitados
          </p>
          <p className="mt-0.5 text-muted-foreground">
            Puedes seguir armándola sin pagar más, pero publicar con lista de
            invitados, con enlace único y pase QR para cada uno, requiere el
            plan {PLAN_LISTA_DE_INVITADOS}. Si prefieres publicar con tu plan{" "}
            {planPagado}, vuelve a «Confirmación abierta» en los ajustes del
            editor.
          </p>
        </>
      ) : (
        <>
          <p className="font-medium">Puedes armar tu lista gratis</p>
          <p className="mt-0.5 text-muted-foreground">
            Agrega e importa a tus invitados sin pagar. Para publicar con lista
            de invitados, con enlace único y pase QR para cada uno, necesitas el
            plan {PLAN_LISTA_DE_INVITADOS}.
          </p>
        </>
      )}
      <Link
        href={mejorarHref}
        className={cn(buttonVariants({ size: "sm" }), "mt-2")}
      >
        {planPagado ? "Mejorar a" : "Ver"} {PLAN_LISTA_DE_INVITADOS}
      </Link>
    </div>
  );
}
