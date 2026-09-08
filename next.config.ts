import type { NextConfig } from "next";

/**
 * Security headers (Fase 7.4). De bajo riesgo (no rompen recursos legítimos).
 * Un Content-Security-Policy completo queda pendiente: requiere allowlist
 * cuidadoso (Supabase Storage, script de Vercel Analytics, redirect de MP,
 * fuentes) + pruebas, para no romper la app.
 */
const securityHeaders = [
  // Fuerza HTTPS en visitas futuras (2 años). Vercel ya sirve TLS.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  // Anti-clickjacking: la app no se embebe en iframes de otros orígenes.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Evita MIME-sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No filtrar la ruta completa como referrer a otros orígenes.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Desactiva APIs del navegador que la app no usa.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    /**
     * Permite la query `?v=<revision>` en las miniaturas de plantillas.
     *
     * Las miniaturas se regeneran EN SU SITIO —el archivo cambia y la ruta
     * no— y la cache en disco del optimizador de Next se indexa por URL con
     * 4 h de vida. Medido: tras regenerar las 50 con arte, el optimizador
     * seguia devolviendo `X-Nextjs-Cache: HIT` de una entrada anterior a la
     * regeneracion, mientras el archivo servido en crudo ya era el nuevo. Sin
     * la query, el catalogo muestra miniaturas viejas durante horas y nada
     * avisa.
     *
     * Next 16 RECHAZA por defecto cualquier query en una imagen local — el
     * primer intento tumbo la pagina entera con
     * `next-image-unconfigured-localpatterns`. Se declara aqui y se acota a la
     * carpeta de miniaturas, no a todo `public/`.
     */
    localPatterns: [
      { pathname: "/previews/plantillas/**" },
      // El resto de `public/` sigue sin query permitida, que es el defecto.
      { pathname: "/**", search: "" },
    ],
  },
  // Para probar el webhook de MP en local vía un túnel (cloudflared), agrega su
  // host aquí temporalmente (solo afecta a `next dev`). En producción no aplica.
  // allowedDevOrigins: ["<tu-tunel>.trycloudflare.com"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // Compat: las invitaciones públicas se movieron de /public/<u>/<slug> a
      // /<u>/<slug>. 301 para no romper links ya compartidos/indexados.
      {
        source: "/public/:username/:invitationSlug",
        destination: "/:username/:invitationSlug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
