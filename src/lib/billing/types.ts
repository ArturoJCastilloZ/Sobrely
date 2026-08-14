import type { ModuleType } from "@/lib/modules/types";

/**
 * Tipos de la capa comercial (Fase 8).
 *
 * La configuración de planes, precios y servicios vive en un archivo tipado
 * (fuente de verdad) y se siembra a la tabla `plans` de Supabase en la Subfase
 * 8.2. Nunca se hardcodean precios en componentes: todo sale de `PLANS` /
 * `ADDITIONAL_SERVICES` (ver `plans.ts` y `services.ts`).
 */

/** Código estable de cada plan. Debe coincidir con `plans.code` en la BD. */
export type PlanCode = "free" | "esencial" | "celebracion" | "premium";

/**
 * Modelo de cobro. Sobrely arranca con pago único por evento; `free` no
 * cobra. La arquitectura deja la puerta abierta a `subscription` a futuro sin
 * rehacer el sistema (no se usa en esta fase).
 */
export type BillingType = "free" | "per_event";

/** Monedas soportadas por la arquitectura (se muestra MXN inicialmente). */
export type Currency = "MXN" | "USD" | "EUR" | "COP" | "CLP" | "PEN" | "ARS";

/**
 * Nivel de branding "Hecho con Sobrely" en la invitación pública.
 * - `full`: marca completa (Free).
 * - `reduced`: marca discreta (Esencial).
 * - `none`: sin marca (Celebración / Premium).
 */
export type BrandingLevel = "full" | "reduced" | "none";

/**
 * Capacidades booleanas por plan (feature flags de producto). El enforcement
 * real vive en los helpers de entitlements de la Subfase 8.4; aquí solo se
 * declara qué incluye cada plan.
 */
export type PlanFeature =
  | "csv_export"
  | "advanced_personalization"
  | "custom_art"
  | "guest_management"
  | "basic_analytics"
  | "advanced_analytics"
  | "custom_domain"
  | "priority_support"
  | "visual_review";

/**
 * Definición de un plan comercial (una fila de la tabla `plans`).
 *
 * Modelo por evento: no hay "invitaciones activas" como límite — los borradores
 * son ilimitados y cada PUBLICACIÓN es una compra que aplica a UNA invitación.
 *
 * Vigencia relativa al evento: la invitación vive hasta `event_date +
 * graceDaysAfterEvent`. Si la invitación no tiene fecha de evento, se usa
 * `fallbackDurationDays` desde la publicación. El plan Free publica como demo
 * temporal (`publishTrialDays`).
 */
export interface Plan {
  /** Código estable; no cambiar una vez en producción. */
  readonly code: PlanCode;
  readonly name: string;
  readonly tagline: string;
  readonly description: string;
  readonly billingType: BillingType;
  /** Precio de lanzamiento (campaña). En unidades enteras de la moneda. */
  readonly priceLaunch: number;
  /** Precio regular (fuera de campaña). */
  readonly priceRegular: number;
  readonly currency: Currency;
  /**
   * Días de demo al publicar en Free (la invitación pública expira a los N días
   * de publicarse). `null` en planes pagados.
   */
  readonly publishTrialDays: number | null;
  /**
   * Margen de vigencia DESPUÉS de la fecha del evento, en días. La invitación
   * vive hasta `event_date + graceDaysAfterEvent`. `null` en Free (usa
   * `publishTrialDays`).
   */
  readonly graceDaysAfterEvent: number | null;
  /**
   * Vigencia de respaldo en días desde la publicación, usada cuando la
   * invitación no tiene fecha de evento. En Free equivale a la demo.
   */
  readonly fallbackDurationDays: number;
  /** Tope de invitados (RSVP) por invitación. */
  readonly maxGuests: number;
  /** Cuota de almacenamiento de imágenes por invitación, en MB. */
  readonly maxStorageMb: number;
  /** Módulos que el plan permite usar. Los no incluidos se marcan ⭐ premium. */
  readonly allowedModules: readonly ModuleType[];
  /** Capacidades booleanas incluidas y disponibles hoy. */
  readonly features: readonly PlanFeature[];
  /**
   * Capacidades anunciadas como "Próximamente": no se cobran ni se prometen
   * como disponibles (evita publicidad engañosa). Se muestran atenuadas.
   */
  readonly comingSoon: readonly PlanFeature[];
  readonly branding: BrandingLevel;
  /** Marca visual "Más elegido". */
  readonly isRecommended: boolean;
  readonly isActive: boolean;
  /** Orden de visualización en `/pricing` (menor primero). */
  readonly displayOrder: number;
  /** Bullets legibles para las tarjetas de precios. */
  readonly highlights: readonly string[];
}

/** Estado del ciclo de vida de un servicio manual. */
export type ServiceRequestStatus =
  | "pending"
  | "contacted"
  | "in_progress"
  | "completed"
  | "cancelled";

/** Servicio adicional comprable de forma independiente (Subfase 8.6). */
export interface AdditionalService {
  readonly code: string;
  readonly name: string;
  readonly description: string;
  /** Precio (o precio "desde" si `priceFrom` es true). */
  readonly price: number;
  readonly currency: Currency;
  /** Si true, el precio se muestra como "desde $X". */
  readonly priceFrom: boolean;
  /**
   * Si true, el servicio requiere intervención humana: no se automatiza, se
   * registra la orden y se muestran instrucciones de contacto.
   */
  readonly isManual: boolean;
  readonly isActive: boolean;
  readonly displayOrder: number;
}
