/**
 * Paletas de la demo de la landing (fase 4): seis combinaciones cerradas de colores para ver la
 * invitación «en tus colores» antes de tener cuenta. Es una lista cerrada a propósito: lo que
 * llega del navegador es solo la CLAVE, y el servidor busca los colores aquí; nadie puede colar
 * un color o un valor raro en `theme_config`.
 *
 * Cambia los cuatro colores y el modo claro/oscuro, y quita el arte de fondo de la plantilla
 * (está dibujado con otros colores); la tipografía y los módulos se quedan como están. El resto del tema (CTA, texto de acento) se deriva de
 * estos colores con las mismas funciones que cualquier tema, así que la legibilidad no depende
 * de la paleta elegida.
 */
export const PALETAS = [
  { clave: "marfil", etiqueta: "Marfil y dorado", primary: "#8a6d3b", secondary: "#b08d57", background: "#fbf7ef", text: "#2b2417", mode: "light" },
  { clave: "rosa", etiqueta: "Rosa palo", primary: "#a24d66", secondary: "#d89aab", background: "#fdf3f5", text: "#3a2229", mode: "light" },
  { clave: "salvia", etiqueta: "Salvia", primary: "#4f6b52", secondary: "#8aa58b", background: "#f3f6f0", text: "#1f2b21", mode: "light" },
  { clave: "terracota", etiqueta: "Terracota", primary: "#b4553a", secondary: "#d9946f", background: "#fbf1ea", text: "#35211a", mode: "light" },
  { clave: "lavanda", etiqueta: "Lavanda", primary: "#6d5aa6", secondary: "#a898d4", background: "#f5f2fb", text: "#261f3d", mode: "light" },
  { clave: "noche", etiqueta: "Azul noche", primary: "#c9a96a", secondary: "#8fa3c7", background: "#14203a", text: "#f1ede4", mode: "dark" },
] as const;

export type PaletaClave = (typeof PALETAS)[number]["clave"];

export function paletaDe(clave: unknown) {
  return PALETAS.find((p) => p.clave === clave) ?? null;
}

/** La clave si existe; si no, `""` (misma convención que `limpiarNombres` y `limpiarFecha`). */
export function limpiarPaleta(crudo: unknown): PaletaClave | "" {
  return paletaDe(crudo)?.clave ?? "";
}

/** Copia del tema con los colores y el modo de la paleta; el resto queda igual. */
export function aplicarPaleta<T extends Record<string, unknown>>(
  tema: T,
  clave: PaletaClave | "",
): T {
  const p = paletaDe(clave);
  if (!p) return tema;
  const colores =
    typeof tema.colors === "object" && tema.colors !== null ? tema.colors : {};
  return {
    ...tema,
    colors: {
      ...colores,
      primary: p.primary,
      secondary: p.secondary,
      background: p.background,
      text: p.text,
    },
    mode: p.mode,
    // El arte de fondo de la plantilla está dibujado con SUS colores y tapa el fondo de la
    // paleta (medido en `xv-anos`: arte claro y texto de modo oscuro, ilegible). Con paleta
    // elegida se quita; la persona puede subir su propio arte en el editor.
    backgroundImage: { url: "", overlay: 0.45 },
  };
}
