# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

WORKDIR /app

# libc6-compat permite ejecutar dependencias nativas precompiladas, como sharp.
RUN apk add --no-cache libc6-compat && corepack enable

ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies

COPY package.json pnpm-lock.yaml ./
RUN pnpm fetch --frozen-lockfile
# El workspace declara que no se ejecuten scripts de dependencias de terceros;
# se respeta también en la imagen para evitar una instalación no determinista.
RUN pnpm install --offline --frozen-lockfile --ignore-scripts

FROM base AS builder

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Next sustituye las variables NEXT_PUBLIC_* dentro del JavaScript enviado al
# navegador durante el build. Solo estas variables públicas entran como args;
# los secretos se suministran al iniciar el contenedor.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_DEFAULT_CURRENCY
ARG NEXT_PUBLIC_PRICING_LAUNCH_ENABLED
ARG NEXT_PUBLIC_LAUNCH_CAMPAIGN_END_DATE
ARG NEXT_PUBLIC_MP_PUBLIC_KEY
ARG NEXT_PUBLIC_SUPPORT_WHATSAPP
ARG NEXT_PUBLIC_REFERRAL_CREDIT_MXN
ARG NEXT_PUBLIC_REFERRAL_ENABLED

ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_DEFAULT_CURRENCY=${NEXT_PUBLIC_DEFAULT_CURRENCY} \
    NEXT_PUBLIC_PRICING_LAUNCH_ENABLED=${NEXT_PUBLIC_PRICING_LAUNCH_ENABLED} \
    NEXT_PUBLIC_LAUNCH_CAMPAIGN_END_DATE=${NEXT_PUBLIC_LAUNCH_CAMPAIGN_END_DATE} \
    NEXT_PUBLIC_MP_PUBLIC_KEY=${NEXT_PUBLIC_MP_PUBLIC_KEY} \
    NEXT_PUBLIC_SUPPORT_WHATSAPP=${NEXT_PUBLIC_SUPPORT_WHATSAPP} \
    NEXT_PUBLIC_REFERRAL_CREDIT_MXN=${NEXT_PUBLIC_REFERRAL_CREDIT_MXN} \
    NEXT_PUBLIC_REFERRAL_ENABLED=${NEXT_PUBLIC_REFERRAL_ENABLED}

RUN pnpm build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# `public` y `.next/static` no se copian automáticamente con output standalone.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health', { signal: AbortSignal.timeout(4000) }).then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "server.js"]
