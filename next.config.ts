import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite servir recursos de `next dev` a través del túnel público
  // (cloudflared) usado para probar el webhook de Mercado Pago en local.
  allowedDevOrigins: ["recipient-covered-appeals-filme.trycloudflare.com"],
};

export default nextConfig;
