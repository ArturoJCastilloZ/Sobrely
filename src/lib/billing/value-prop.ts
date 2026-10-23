import { getActivePlans, getEffectivePrice } from "@/lib/billing/plans";
import { formatPrice } from "@/lib/billing/config";

/**
 * El mensaje del modelo de cobro, para el tope del embudo.
 *
 * Por qué existe: `/pricing` ya explica el modelo ("Crea gratis y paga solo
 * cuando quieras publicar"), pero eso está ABAJO del embudo — quien llega ahí
 * ya está considerando pagar. La home y las landings de evento decían solo
 * "Empieza gratis", que no dice nada: ¿prueba de 7 días? ¿tarjeta? ¿versión
 * recortada? El mecanismo real —armas todo sin pagar y decides después— estaba
 * enterrado en una respuesta del FAQ.
 *
 * Se DERIVA de `plans.ts` en vez de escribirse a mano: el precio sale del plan
 * de pago más barato, así que si los precios cambian el copy cambia con ellos.
 *
 * Precisión deliberada, y esta frase se INVIRTIÓ en la Fase 3: antes decir
 * «solo pagas al publicar» habría sido FALSO, porque Free publicaba como demo de
 * 14 días con la marca de Sobrely. Sin demo es CIERTO: no hay muro para armar la
 * invitación, y publicarla siempre cuesta. Lo que NO se puede decir es un precio
 * único: depende de los módulos y la temática (35 de 65 plantillas caben en el
 * plan de entrada, el resto cuesta más), por eso el copy dice «desde».
 */
export interface BillingPitch {
  /** Una línea para debajo del CTA. */
  readonly micro: string;
  /** Párrafo para donde haya espacio de explicar. */
  readonly long: string;
  /** Respuesta lista para el FAQ de "¿cuánto cuesta?". */
  readonly faqAnswer: string;
  /** El precio del plan de pago más barato, ya formateado; `null` si no hay planes. */
  readonly desdePrecio: string | null;
}

/** El precio efectivo más bajo entre los planes de pago por evento. */
function precioDesde(): string | null {
  const planes = getActivePlans().filter((p) => p.billingType === "per_event");
  if (planes.length === 0) return null;
  const minimo = Math.min(...planes.map((p) => getEffectivePrice(p)));
  return formatPrice(minimo, planes[0].currency);
}

export function billingPitch(): BillingPitch {
  const desde = precioDesde();
  const desdeCorto = desde ? `, desde ${desde}` : "";
  const desdeLargo = desde ? ` desde ${desde}` : "";

  return {
    micro: `Sin tarjeta para empezar · borradores ilimitados · pagas solo al publicar${desdeCorto}`,
    long:
      `Armas tu invitación completa sin pagar y sin tarjeta. Pagas una sola vez, ` +
      `por evento, cuando decides publicarla${desde ? ` (desde ${desde})` : ""}.`,
    faqAnswer:
      `Crearla y prepararla no cuesta nada, y los borradores son ilimitados. ` +
      `Pagas solo cuando decides publicarla, con un pago único por evento${desdeLargo}; ` +
      `el precio exacto depende de los módulos y la temática que uses, y lo ves ` +
      `antes de pagar. No hay suscripción ni cobros recurrentes. Consulta los ` +
      `planes en la página de precios.`,
    desdePrecio: desde,
  };
}
