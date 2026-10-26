/**
 * «Datos iniciales»: lo que alguien escribe sobre su evento ANTES de abrir el editor —sus
 * nombres y la fecha— para ver la invitación como suya y llevarse eso al editor sin
 * reescribirlo. Es la pieza común de la vista rápida del catálogo, de la demo de la landing y
 * del asistente del editor (docs/auditoria-2026-10/14).
 *
 * Todo es PURO y probado: la entrada viene del navegador (el servidor la vuelve a limpiar con
 * estas mismas funciones antes de usarla) y decide qué texto de la portada se reescribe.
 */
import { limpiarPaleta, type PaletaClave } from "@/lib/templates/paletas";

export type DatosIniciales = {
  /** Nombres tal como se mostrarán («Sofía y Mateo», «Valentina»). Vacío = sin cambio. */
  nombres: string;
  /** Fecha del evento, `YYYY-MM-DD`. Vacía = sin cambio. */
  fecha: string;
  /** Clave de una paleta de `paletas.ts`; ausente = los colores de la plantilla. */
  paleta?: PaletaClave;
};

export const NOMBRES_MAXIMO = 60;
const ANIO_MINIMO = 2000;
const ANIO_MAXIMO = 2100;

export function limpiarNombres(crudo: unknown): string {
  if (typeof crudo !== "string") return "";
  return crudo
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NOMBRES_MAXIMO)
    .trim();
}

/** Una fecha de calendario real en `YYYY-MM-DD`; cualquier otra cosa da `""`. */
export function limpiarFecha(crudo: unknown): string {
  if (typeof crudo !== "string") return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(crudo.trim());
  if (!m) return "";
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (anio < ANIO_MINIMO || anio > ANIO_MAXIMO) return "";
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  // `Date` corrige 31 de febrero en silencio: se comprueba que no se movió.
  const real =
    d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
  return real ? m[0] : "";
}

/** Limpia lo que llegue; `null` si no queda ningún dato útil. */
export function datosIniciales(crudo: unknown): DatosIniciales | null {
  if (typeof crudo !== "object" || crudo === null) return null;
  const c = crudo as Record<string, unknown>;
  const paleta = limpiarPaleta(c.paleta);
  const datos: DatosIniciales = {
    nombres: limpiarNombres(c.nombres),
    fecha: limpiarFecha(c.fecha),
    ...(paleta ? { paleta } : {}),
  };
  return datos.nombres || datos.fecha || datos.paleta ? datos : null;
}

/**
 * La fecha como `event_date` de la invitación. Mediodía de la hora de México central
 * (UTC−6, sin horario de verano desde 2022): cualquier zona entre UTC−12 y UTC+5 sigue
 * mostrando el MISMO día, que es lo que importa para una fecha sin hora.
 */
export function fechaAEventDate(fecha: string): string {
  return fecha ? `${fecha}T12:00:00-06:00` : "";
}

type Portada = { title: string; subtitle: string };
export type RanuraDeNombres = "title" | "subtitle";

/**
 * ¿Dónde van los nombres en la portada de ESTA plantilla? Medido en las 65: en las bodas el
 * título SON los nombres («Ana & Carlos»), y en XV años, bautizo, comunión y graduación el
 * título es una frase («Mis XV años») y los nombres van en el subtítulo («Sofía»).
 *   - título con «&» o «y» entre dos palabras → los nombres reemplazan el título;
 *   - título «Nombre del evento» (marcador de las plantillas corporativas) → el título;
 *   - cualquier otro caso → el subtítulo, y el título conserva su frase.
 */
export function ranuraDeNombres(portada: Portada): RanuraDeNombres {
  const titulo = portada.title.trim();
  if (/\S\s(&|y)\s\S/.test(titulo) && titulo.length <= NOMBRES_MAXIMO) return "title";
  if (/^nombre del evento$/i.test(titulo)) return "title";
  return "subtitle";
}

type ModuloLeve = {
  module_type: string;
  is_visible: boolean;
  config: Record<string, unknown>;
};

/** Copia de los módulos con los nombres escritos en la portada. No toca nada más. */
export function aplicarNombresAModulos<M extends ModuloLeve>(
  modulos: readonly M[],
  nombres: string,
): M[] {
  const limpios = limpiarNombres(nombres);
  const indice = modulos.findIndex((m) => m.module_type === "hero" && m.is_visible);
  if (!limpios || indice === -1) return [...modulos];
  const portada = modulos[indice];
  const titulo = typeof portada.config.title === "string" ? portada.config.title : "";
  const subtitulo = typeof portada.config.subtitle === "string" ? portada.config.subtitle : "";
  const campo = ranuraDeNombres({ title: titulo, subtitle: subtitulo });
  const copia = [...modulos];
  copia[indice] = { ...portada, config: { ...portada.config, [campo]: limpios } };
  return copia;
}
