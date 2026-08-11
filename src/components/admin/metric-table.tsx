import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Desglose "estado → conteo" (órdenes, servicios, referidos por estado). */
export function StatusBreakdown({
  title,
  data,
  labels,
}: {
  title: string;
  data: Record<string, number>;
  labels?: Record<string, string>;
}) {
  const entries = Object.entries(data);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {entries.length === 0 ? (
          <span className="text-sm text-muted-foreground">Sin datos.</span>
        ) : (
          entries.map(([status, count]) => (
            <Badge key={status} variant="outline" className="gap-1">
              <span>{labels?.[status] ?? status}</span>
              <span className="font-bold">{count}</span>
            </Badge>
          ))
        )}
      </CardContent>
    </Card>
  );
}
