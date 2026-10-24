import { formatPrice } from "@/lib/billing/config";
import type { PlantillaFicha } from "@/lib/templates/galeria-publica";

/**
 * «Qué incluye» de la ficha de una plantilla (T12). Solo pinta lo que calcula
 * `resumenDeFicha`: módulos de la plantilla y, del plan que hace falta para
 * publicarla, el tope de invitados, la vigencia y la marca. Sin datos propios.
 */
export function ResumenDeFicha({
  tpl,
  autenticado,
}: {
  tpl: PlantillaFicha;
  autenticado: boolean;
}) {
  const { incluye, precio } = tpl;
  if (!incluye || !precio) return null;

  return (
    <section
      id="que-incluye"
      aria-labelledby="que-incluye-titulo"
      className="mx-auto w-full max-w-3xl scroll-mt-4 px-4 py-10"
    >
      <h2 id="que-incluye-titulo" className="text-xl font-semibold tracking-tight">
        Qué incluye esta plantilla
      </h2>

      <div className="mt-6 grid gap-8 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Trae estas secciones</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {incluye.modulos.map((m, i) => (
              <li
                key={`${m}-${i}`}
                className="rounded-full border border-border px-3 py-1 text-sm"
              >
                {m}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Puedes cambiar los textos, fotos y colores, y quitar o agregar secciones
            mientras editas.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground">
            Para publicarla: plan {incluye.plan.nombre}
          </h3>
          <p className="mt-2 text-sm">
            <span className="text-lg font-semibold tabular-nums">
              {formatPrice(precio.precio)}
            </span>
            {precio.precioRegular !== null && (
              <>
                <span className="sr-only"> en oferta, antes </span>
                <s className="ml-1.5 text-muted-foreground tabular-nums">
                  {formatPrice(precio.precioRegular)}
                </s>
              </>
            )}{" "}
            <span className="text-muted-foreground">pago único por evento, sin suscripción</span>
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            <li>{incluye.plan.invitados}</li>
            <li>{incluye.plan.vigencia}</li>
            <li>{incluye.plan.marca}</li>
          </ul>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-muted/40 px-4 py-3">
        <h3 className="text-sm font-semibold">Qué pasa al elegirla</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {autenticado
            ? "Se crea un borrador en tu cuenta y se abre el editor. Cambia lo que quieras; publicarla es lo único que se paga."
            : "Se abre el editor con esta plantilla, sin crear cuenta ni dar tarjeta. La cuenta se pide solo cuando quieras publicarla."}
        </p>
      </div>
    </section>
  );
}
