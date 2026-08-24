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

export const SITE_DESCRIPTION =
  "Crea invitaciones digitales dinámicas y personalizables para bodas, XV años, cumpleaños y más.";

export const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Sobrely",
  url: SITE_URL,
  logo: `${SITE_URL}/sobrely-logo-horizontal.png`,
  description: SITE_DESCRIPTION,
};

export const WEBSITE_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Sobrely",
  url: SITE_URL,
  inLanguage: "es-MX",
  description: SITE_DESCRIPTION,
};
