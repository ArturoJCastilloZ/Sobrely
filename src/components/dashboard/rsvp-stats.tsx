import { Card, CardContent } from "@/components/ui/card";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

export function RsvpStats({
  confirmed,
  declined,
  maybe,
  totalGuests,
}: {
  confirmed: number;
  declined: number;
  maybe: number;
  totalGuests: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Confirmados" value={confirmed} />
      <Stat label="Rechazados" value={declined} />
      <Stat label="Pendientes (tal vez)" value={maybe} />
      <Stat label="Total de invitados" value={totalGuests} />
    </div>
  );
}
