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
  // Permite servir recursos de `next dev` a través del túnel público
  // (cloudflared) usado para probar el webhook de Mercado Pago en local.
  allowedDevOrigins: ["recipient-covered-appeals-filme.trycloudflare.com"],
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
