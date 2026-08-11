import type { AdditionalService } from "@/lib/billing/types";

/**
 * Servicios adicionales comprables de forma independiente.
 *
 * Fuente de verdad; la UI de compra/solicitud llega en la Subfase 8.6. Los
 * servicios marcados `isManual` requieren intervención humana: no se
 * automatizan, se registra la orden y se muestran instrucciones de contacto.
 */
export const ADDITIONAL_SERVICES: readonly AdditionalService[] = [
  {
    code: "whatsapp_setup",
    name: "Configuración asistida por WhatsApp",
    description:
      "Te acompañamos por WhatsApp para dejar tu invitación lista paso a paso.",
    price: 299,
    currency: "MXN",
    priceFrom: false,
    isManual: true,
    isActive: true,
    displayOrder: 1,
  },
  {
    code: "custom_cover_design",
    name: "Diseño personalizado de portada",
    description:
      "Un diseñador crea una portada única para tu evento a partir de tu idea.",
    price: 499,
    currency: "MXN",
    priceFrom: true,
    isManual: true,
    isActive: true,
    displayOrder: 2,
  },
  {
    code: "initial_content_load",
    name: "Carga inicial de fotos y textos",
    description:
      "Nosotros subimos tus fotos y capturamos los textos de tu invitación.",
    price: 299,
    currency: "MXN",
    priceFrom: false,
    isManual: true,
    isActive: true,
    displayOrder: 3,
  },
  {
    code: "invitation_renewal",
    name: "Renovación de una invitación",
    description:
      "Extiende la vigencia de una invitación ya publicada para seguir usándola.",
    price: 199,
    currency: "MXN",
    priceFrom: true,
    isManual: false,
    isActive: true,
    displayOrder: 4,
  },
  {
    code: "express_invitation",
    name: "Invitación express creada por el equipo",
    description:
      "Nuestro equipo arma tu invitación completa por ti, lista para publicar.",
    price: 1499,
    currency: "MXN",
    priceFrom: true,
    isManual: true,
    isActive: true,
    displayOrder: 5,
  },
] as const;

/** Servicios activos, ordenados para mostrar. */
export function getActiveServices(): readonly AdditionalService[] {
  return ADDITIONAL_SERVICES.filter((s) => s.isActive).sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
}

/** Busca un servicio por código. */
export function getService(code: string): AdditionalService | undefined {
  return ADDITIONAL_SERVICES.find((s) => s.code === code);
}
