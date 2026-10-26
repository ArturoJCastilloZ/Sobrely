import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { leerEmbudo } from "@/lib/analytics/embudo-lectura";
import {
  VENTANAS_DIAS,
  construirResumen,
  leerVentana,
  topPlantillas,
} from "@/lib/analytics/embudo-resumen";

export const metadata: Metadata = {
  title: "Embudo",
  robots: { index: false, follow: false },
};

const ETIQUETA_VENTANA: Record<number, string> = {
  7: "7 días",
  30: "30 días",
  90: "90 días",
  0: "Todo",
};

export default async function EmbudoPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  // El layout de /admin ya exige admin; se repite aquí porque esta página lee
  // con service_role y no debe depender solo del layout.
  await requireAdmin();
  const { dias } = await searchParams;
  const ventana = leerVentana(dias);

  const { conteos, plantillas, paymentFailed } = await leerEmbudo(ventana);
  const filas = construirResumen(conteos);
  const top = topPlantillas(plantillas, 10);
  const total = Object.values(conteos).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
            ← Panel de administración
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Embudo comercial</h1>
        </div>
        <nav aria-label="Periodo" className="flex gap-1">
          {VENTANAS_DIAS.map((d) => (
            <Link
              key={d}
              href={`/admin/embudo?dias=${d}`}
              aria-current={d === ventana ? "page" : undefined}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm",
                d === ventana
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {ETIQUETA_VENTANA[d]}
            </Link>
          ))}
        </nav>
      </div>

      <p className="max-w-prose text-sm text-muted-foreground">
        Cuenta lo que pasa en el sitio, sin datos personales. Los pasos no cuentan la misma
        cosa (mira la columna «Se cuenta por»), así que el porcentaje contra el paso anterior
        orienta, pero no es una tasa de conversión de personas. Incluye la actividad del
        equipo y las cuentas de prueba.
      </p>

      {total === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Todavía no hay eventos en este periodo. Aparecen cuando alguien visita una
            página de evento, una plantilla o los precios, empieza a personalizar, crea su
            cuenta o paga. Las visitas de rastreadores y las de «No rastrear» no se cuentan.
          </CardContent>
        </Card>
      ) : null}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Personalizaciones" value={String(conteos.start_customization ?? 0)} />
        <StatCard label="Registros" value={String(conteos.sign_up ?? 0)} />
        <StatCard label="Pagos iniciados" value={String(conteos.begin_checkout ?? 0)} />
        <StatCard
          label="Compras"
          value={String(conteos.purchase ?? 0)}
          hint={paymentFailed > 0 ? `${paymentFailed} pagos rechazados` : undefined}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pasos del embudo · {ETIQUETA_VENTANA[ventana]}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">Paso</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Total</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Del paso anterior</th>
                <th scope="col" className="py-2 font-medium">Se cuenta por</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.evento} className="border-b last:border-0">
                  <th scope="row" className="py-2 pr-4 text-left font-medium">{f.etiqueta}</th>
                  <td className="py-2 pr-4 text-right tabular-nums">{f.total}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">
                    {f.porcentajeDelAnterior === null ? "—" : `${f.porcentajeDelAnterior} %`}
                  </td>
                  <td className="py-2 text-muted-foreground">{f.unidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            Aperturas de la vista rápida del catálogo: {conteos.quick_view_open ?? 0}. No es un paso
            obligatorio del embudo (se puede pasar de la galería al editor sin abrirla), por eso no
            entra en la tabla ni en los porcentajes.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            «Completaron el borrador» cuenta una invitación cuando tiene nombres propios (el
            título de la portada ya no es el de la plantilla), fecha, lugar y una foto que
            subió la persona.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plantillas más vistas · {ETIQUETA_VENTANA[ventana]}</CardTitle>
        </CardHeader>
        <CardContent>
          {top.length === 0 ? (
            <span className="text-sm text-muted-foreground">Sin datos.</span>
          ) : (
            <ol className="flex flex-col gap-1 text-sm">
              {top.map((p) => (
                <li key={p.slug} className="flex items-baseline justify-between gap-4 border-b py-1 last:border-0">
                  <Link href={`/plantillas/${p.slug}`} className="truncate hover:underline">
                    {p.slug}
                  </Link>
                  <span className="tabular-nums text-muted-foreground">{p.vistas}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
