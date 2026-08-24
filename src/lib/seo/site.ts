/**
 * Identidad del sitio y datos estructurados de nivel sitio.
 *
 * Vivían dentro de `app/layout.tsx`, que los emitía en TODAS las rutas: también
 * en las invitaciones públicas, donde los planes sin marca no deben exponer a
 * Sobrely. Se extraen aquí para que el layout aporte solo la metadata neutra y
 * el JSON-LD de Organization/WebSite se emita únicamente en la home, que es
 * donde Google lo espera.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const SITE_TITLE = "Sobrely — Invitaciones digitales dinámicas";

/** Correo público de contacto. Debe coincidir con el perfil de Google Business. */
export const CONTACT_EMAIL = "contacto@sobrely.com";

/** Zona de servicio, tal como se muestra al usuario y se declara en Google. */
export const SERVICE_AREA_LABEL =
  "Monterrey y área metropolitana, Nuevo León, México";

/** Municipios atendidos. Mismo conjunto que las zonas del perfil de Google. */
export const SERVICE_AREAS = [
  "Monterrey",
  "San Pedro Garza García",
  "Guadalupe",
  "San Nicolás de los Garza",
  "Apodaca",
  "Santa Catarina",
  "General Escobedo",
  "Santiago",
] as const;

export const SITE_DESCRIPTION =
  "Crea invitaciones digitales dinámicas y personalizables para bodas, XV años, cumpleaños y más.";

/**
 * Negocio local. Se usa `LocalBusiness` en vez de `Organization` porque es el
 * tipo específico y no conviene declarar ambos: describirían la misma entidad
 * y Google tendría que desambiguar.
 *
 * Sin `streetAddress` a propósito: el domicilio es particular y en Google
 * Business está oculto (negocio de área de servicio). Localidad, región, país
 * y `areaServed` bastan para la señal local.
 */
export const LOCAL_BUSINESS_LD = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Sobrely",
  url: SITE_URL,
  logo: `${SITE_URL}/sobrely-logo-horizontal.png`,
  image: `${SITE_URL}/sobrely-logo-horizontal.png`,
  description: SITE_DESCRIPTION,
  email: CONTACT_EMAIL,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Santa Catarina",
    addressRegion: "Nuevo León",
    addressCountry: "MX",
  },
  areaServed: SERVICE_AREAS.map((name) => ({ "@type": "City", name })),
};

export const WEBSITE_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Sobrely",
  url: SITE_URL,
  inLanguage: "es-MX",
  description: SITE_DESCRIPTION,
};
