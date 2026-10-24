import type { EventoEmbudo } from "./embudo-regla";

/**
 * Cómo se lee el embudo en `/admin/embudo`. Pura y probada: la página solo le
 * pasa conteos y pinta lo que devuelve.
 *
 * Los pasos NO cuentan lo mismo y la tabla lo dice (`unidad`): una visita se
 * cuenta por sesión de pestaña, una personalización por invitación, un registro
 * por persona y un pago por orden. Por eso el porcentaje contra el paso anterior
 * es una **orientación**, no una tasa de conversión de personas.
 */
export const PASOS_EMBUDO: {
  evento: EventoEmbudo;
  etiqueta: string;
  unidad: string;
}[] = [
  { evento: "view_category", etiqueta: "Vieron una página de evento", unidad: "sesiones" },
  { evento: "view_template", etiqueta: "Vieron una plantilla", unidad: "sesiones por plantilla" },
  { evento: "start_customization", etiqueta: "Empezaron a personalizar", unidad: "invitaciones" },
  { evento: "sign_up", etiqueta: "Crearon su cuenta", unidad: "personas" },
  { evento: "complete_draft", etiqueta: "Completaron el borrador", unidad: "invitaciones" },
  { evento: "view_pricing", etiqueta: "Vieron los precios", unidad: "sesiones" },
  { evento: "begin_checkout", etiqueta: "Iniciaron el pago", unidad: "órdenes" },
  { evento: "purchase", etiqueta: "Pago confirmado", unidad: "órdenes" },
];

export type FilaEmbudo = {
  evento: EventoEmbudo;
  etiqueta: string;
  unidad: string;
  total: number;
  /** Porcentaje contra el paso anterior; `null` si el anterior es 0 o no hay. */
  porcentajeDelAnterior: number | null;
};

export function construirResumen(conteos: Partial<Record<EventoEmbudo, number>>): FilaEmbudo[] {
  return PASOS_EMBUDO.map((paso, i) => {
    const total = conteos[paso.evento] ?? 0;
    const anterior = i === 0 ? 0 : (conteos[PASOS_EMBUDO[i - 1].evento] ?? 0);
    return {
      ...paso,
      total,
      porcentajeDelAnterior:
        i === 0 || anterior === 0 ? null : Math.round((total / anterior) * 1000) / 10,
    };
  });
}

/** Cuenta cuántas veces aparece cada plantilla y devuelve las `n` más vistas. */
export function topPlantillas(
  filas: { template_slug?: unknown }[],
  n = 10,
): { slug: string; vistas: number }[] {
  const cuenta = new Map<string, number>();
  for (const f of filas) {
    if (typeof f.template_slug === "string") {
      cuenta.set(f.template_slug, (cuenta.get(f.template_slug) ?? 0) + 1);
    }
  }
  return [...cuenta.entries()]
    .map(([slug, vistas]) => ({ slug, vistas }))
    .sort((a, b) => b.vistas - a.vistas || a.slug.localeCompare(b.slug))
    .slice(0, n);
}

export const VENTANAS_DIAS = [7, 30, 90, 0] as const;

/** `?dias=` → días válidos; cualquier otra cosa cae en 30. `0` es «todo». */
export function leerVentana(valor: string | undefined): (typeof VENTANAS_DIAS)[number] {
  // `Number("")` es 0 («todo»): un `?dias=` vacío no debe leerse como eso.
  const n = valor !== undefined && /^\d+$/.test(valor) ? Number(valor) : Number.NaN;
  return (VENTANAS_DIAS as readonly number[]).includes(n)
    ? (n as (typeof VENTANAS_DIAS)[number])
    : 30;
}
