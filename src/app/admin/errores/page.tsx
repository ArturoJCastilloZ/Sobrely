import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { VENTANAS_DIAS, leerVentana } from "@/lib/analytics/embudo-resumen";
import { agruparErrores } from "@/lib/errores/agrupar";
import { leerErrores } from "@/lib/errores/lectura";

export const metadata: Metadata = {
  title: "Errores",
  robots: { index: false, follow: false },
};

const ETIQUETA_VENTANA: Record<number, string> = { 7: "7 días", 30: "30 días", 90: "90 días", 0: "Todo" };

const ORIGEN: Record<string, string> = {
  webhook_pago: "Webhook de pago",
  checkout: "Checkout",
  publicar: "Publicar",
  auth: "Acceso",
  reconciliar: "Reconciliación de pagos",
  embudo: "Embudo",
  servidor: "Servidor",
};

const formato = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Monterrey",
});

export default async function ErroresPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  // El layout de /admin ya exige admin; se repite porque aquí se lee con service_role.
  await requireAdmin();
  const { dias } = await searchParams;
  const ventana = leerVentana(dias);

  const filas = await leerErrores(ventana);
  const grupos = agruparErrores(filas);
  const criticos = grupos.filter((g) => g.severidad === "critico");
  const alertasEnviadas = filas.filter((f) => f.alertado_en !== null).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
            ← Panel de administración
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Errores</h1>
        </div>
        <nav aria-label="Periodo" className="flex gap-1">
          {VENTANAS_DIAS.map((d) => (
            <Link
              key={d}
              href={`/admin/errores?dias=${d}`}
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
        Errores del pago, la publicación, el acceso y cualquier fallo del servidor que nadie
        atrapó. Se agrupan por causa. Los mensajes se limpian de correos, llaves y teléfonos
        antes de guardarse, y no se guarda el detalle técnico completo. Un error crítico manda
        correo una vez por hora y por causa, si las alertas están encendidas.
      </p>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Causas distintas" value={String(grupos.length)} />
        <StatCard label="Críticas" value={String(criticos.length)} />
        <StatCard label="Ocurrencias" value={String(filas.length)} />
        <StatCard label="Alertas enviadas" value={String(alertasEnviadas)} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Causas · {ETIQUETA_VENTANA[ventana]}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {grupos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin errores en este periodo. Si esperabas verlos, comprueba que la migración 0064
              esté aplicada.
            </p>
          ) : (
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">Origen</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Mensaje</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">Veces</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Última</th>
                  <th scope="col" className="py-2 font-medium">Alerta</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => (
                  <tr key={g.huella} className="border-b align-top last:border-0">
                    <td className="py-2 pr-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-medium">{ORIGEN[g.origen] ?? g.origen}</span>
                        <Badge variant={g.severidad === "critico" ? "destructive" : "outline"}>
                          {g.severidad === "critico" ? "Crítico" : "Aviso"}
                        </Badge>
                      </div>
                    </td>
                    <td className="max-w-[28rem] py-2 pr-4 break-words">
                      {g.mensaje}
                      {Object.keys(g.contexto).length > 0 && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {Object.entries(g.contexto).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{g.veces}</td>
                    <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                      {formato.format(new Date(g.ultima))}
                    </td>
                    <td className="py-2 text-muted-foreground">{g.alertado ? "Enviada" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
