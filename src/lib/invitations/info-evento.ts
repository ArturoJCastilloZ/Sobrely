/**
 * La línea «fecha · lugar» de la portada. Antes, la portada solo decía «Nuestra boda» o
 * «Nombre del evento»: quien abría la invitación tenía que bajar para saber cuándo y dónde (solo
 * 3 de las 65 plantillas ponían la fecha). Sale de los datos que el anfitrión ya capturó: la
 * fecha del evento y el nombre del lugar del módulo de ubicación. No hay campo nuevo que llenar.
 */
const FORMATO = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
  // La fecha se guarda como mediodía de México central; con esta zona el día no se corre en
  // ningún navegador del mundo, ni en el servidor.
  timeZone: "America/Mexico_City",
});

type ModuloLeve = { module_type: string; is_visible: boolean; config: Record<string, unknown> };

export function infoDeEvento(
  eventDate: string | null | undefined,
  modulos: readonly ModuloLeve[],
): string | undefined {
  const t = eventDate ? new Date(eventDate) : null;
  const fecha = t && !Number.isNaN(t.getTime()) ? FORMATO.format(t) : "";
  const mapa = modulos.find((m) => m.module_type === "map" && m.is_visible);
  const nombre = typeof mapa?.config.venueName === "string" ? mapa.config.venueName.trim() : "";
  const partes = [fecha, nombre].filter(Boolean);
  return partes.length ? partes.join(" · ") : undefined;
}
