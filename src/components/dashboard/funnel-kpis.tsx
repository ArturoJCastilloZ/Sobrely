import { Card, CardContent } from "@/components/ui/card";
import { shareOf, type EventFunnel } from "@/lib/dashboard/metrics";

/**
 * Fila de cifras del evento.
 *
 * La regla del diseño: ninguna cifra grande va sola — cada una lleva debajo la
 * métrica que la explica ("75 % de cobertura", "32 de 33 respondidas"). Un
 * número sin contexto no dice si el evento va bien.
 */
function Kpi({
  label,
  value,
  context,
  className = "",
}: {
  label: string;
  value: string;
  context: string;
  className?: string;
}) {
  return (
    <Card className={`gap-0 py-4 ${className}`}>
      <CardContent className="px-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-1.5 text-3xl font-semibold tabular-nums leading-none">
          {value}
        </div>
        <div className="mt-1.5 text-xs text-muted-foreground">{context}</div>
      </CardContent>
    </Card>
  );
}

/**
 * A quién le habla la tarjeta.
 *
 * Existe porque el mismo componente se pinta en dos lados: el panel del
 * anfitrión y el reporte compartido, que abre un tercero (el banquete, el
 * salón). Decirle "tu lista" a quien no es el dueño del evento está mal, y es
 * el tipo de detalle que solo se ve mirando la página, no el diff.
 */
export type FunnelVoice = "owner" | "third_party";

export function FunnelKpis({
  funnel,
  voice = "owner",
}: {
  funnel: EventFunnel;
  voice?: FunnelVoice;
}) {
  const kpis: { label: string; value: string; context: string }[] = [];

  if (funnel.mode === "guest_list") {
    const registered = funnel.registered ?? 0;
    kpis.push({
      label:
        voice === "owner" ? "Invitados en tu lista" : "Invitados en la lista",
      value: String(registered),
      context:
        funnel.allotted !== null
          ? `${funnel.allotted} lugares apartados`
          : "Total de contactos",
    });
    // La cobertura va ANTES del avance porque es el escalón anterior del
    // embudo: un avance bajo significa cosas opuestas según si ya se envió
    // todo o si media lista nunca recibió nada.
    kpis.push({
      label: "Invitaciones enviadas",
      value:
        funnel.coverageRate === null
          ? "—"
          : `${Math.round(funnel.coverageRate * 100)}%`,
      context: `${funnel.invited ?? 0} de ${registered} enviadas`,
    });
    kpis.push({
      label: "Avance de respuestas",
      value:
        funnel.responseRate === null
          ? "—"
          : `${Math.round(funnel.responseRate * 100)}%`,
      context: `${funnel.responded} de ${registered} respondidas`,
    });
  } else {
    kpis.push({
      label: "Respuestas recibidas",
      value: String(funnel.responded),
      context: "Por el enlace público",
    });
    kpis.push({
      label: "Confirmaciones",
      value: String(funnel.confirmed),
      context: `${Math.round(shareOf(funnel, funnel.confirmed))}% de las respuestas`,
    });
  }

  kpis.push({
    label: "Asistentes confirmados",
    value: String(funnel.attendees),
    context: "Personas, contando acompañantes",
  });

  if (funnel.mode === "guest_list" && funnel.checkedIn !== null) {
    kpis.push({
      label: "Ya ingresaron",
      value: String(funnel.checkedIn),
      context:
        funnel.attendees > 0
          ? `de ${funnel.attendees} esperados`
          : "Escaneos en la puerta",
    });
  } else {
    kpis.push({
      label: "Confirmados",
      value: String(funnel.confirmed),
      context:
        funnel.confirmed > 0
          ? `${funnel.attendees} personas en total`
          : "Aún nadie confirma",
    });
  }

  // El modo lista tiene un escalón más (el envío): cinco tarjetas.
  const wide = kpis.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4";

  // En dos columnas, un número impar deja la última media vacía. Se estira a
  // todo el ancho en vez de quedar huérfana; en `lg` cada una vuelve a su
  // columna y el tramo deja de aplicar.
  const impar = kpis.length % 2 === 1;

  return (
    <div className={`grid grid-cols-2 gap-3 ${wide}`}>
      {kpis.map((k, i) => (
        <Kpi
          key={k.label}
          {...k}
          className={
            impar && i === kpis.length - 1 ? "col-span-2 lg:col-span-1" : ""
          }
        />
      ))}
    </div>
  );
}
