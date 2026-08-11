import { cn } from "@/lib/utils";
import { COMPARISON_ROWS, type Plan } from "@/lib/billing";

/**
 * Tabla comparativa de características. Cada celda se deriva de la config del
 * plan (ver `COMPARISON_ROWS`), no se hardcodea. Con scroll horizontal propio
 * para no romper el layout en móvil.
 */
export function ComparisonTable({ plans }: { plans: readonly Plan[] }) {
  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left font-medium">Característica</th>
            {plans.map((p) => (
              <th
                key={p.code}
                className={cn(
                  "p-3 text-center font-medium",
                  p.isRecommended && "text-primary",
                )}
              >
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row) => (
            <tr key={row.label} className="border-b last:border-b-0">
              <td className="p-3 text-left text-muted-foreground">
                {row.label}
              </td>
              {plans.map((p) => (
                <td key={p.code} className="p-3 text-center">
                  {row.value(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
