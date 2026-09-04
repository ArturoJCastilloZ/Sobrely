import { getPlan } from "@/lib/billing/plans";

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
 * Se DERIVA de `plans.ts` en vez de escribirse a mano: los días de demo salen
 * de `publishTrialDays`, así que si el plan cambia el copy cambia con él.
 *
 * Precisión deliberada: decir "solo pagas al publicar" sería FALSO. Con el plan
 * Free sí se puede publicar — como demo, con la marca de Sobrely y tope de
 * invitados. Lo cierto es que no hay muro para armar la invitación, y que lo
 * que se cobra es que siga en línea hasta el evento.
 */
export interface BillingPitch {
  /** Una línea para debajo del CTA. */
  readonly micro: string;
  /** Párrafo para donde haya espacio de explicar. */
  readonly long: string;
  /** Respuesta lista para el FAQ de "¿cuánto cuesta?". */
  readonly faqAnswer: string;
  /** Días de demo del plan Free, para copy que necesite el número suelto. */
  readonly demoDays: number | null;
}

export function billingPitch(): BillingPitch {
  const free = getPlan("free");
  const days = free?.publishTrialDays ?? null;
  const demo = days ? `demo de ${days} días` : "una demo";

  const demoFrase = days
    ? `Puedes publicarla gratis como demo por ${days} días, con la marca de Sobrely`
    : "Puedes publicarla gratis como demo, con la marca de Sobrely";

  return {
    micro: `Sin tarjeta · borradores ilimitados · publica una ${demo} gratis`,
    long:
      `Armas tu invitación completa sin pagar y sin tarjeta. Publícala gratis ` +
      `como ${demo}, o elige un plan por evento —pago único— para que siga en ` +
      `línea hasta tu día.`,
    faqAnswer:
      `Crearla y prepararla no cuesta nada, y los borradores son ilimitados. ` +
      `${demoFrase}; si quieres que siga en línea hasta tu evento y sin marca, ` +
      `eliges un plan con pago único por evento. No hay suscripción ni cobros ` +
      `recurrentes. Consulta los planes en la página de precios.`,
    demoDays: days,
  };
}
