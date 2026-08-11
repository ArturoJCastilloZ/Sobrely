# InvitaFlow

Plataforma SaaS para crear **invitaciones digitales dinámicas, modulares y
personalizables** con templates prearmados. Bodas, XV años, cumpleaños, baby
showers y eventos corporativos. Mobile-first.

> Estado: **Fase 8 — Monetización y lanzamiento comercial** (freemium con pago
> ÚNICO por evento, Mercado Pago). Subfases 8.1–8.8 implementadas. El detalle de
> estado por fase vive en [`HANDOFF.md`](./HANDOFF.md).

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** estricto
- **Tailwind CSS v4** + **shadcn/ui** (sobre **Base UI**, no Radix)
- **Supabase** (PostgreSQL, Auth, Storage, RLS) vía `@supabase/supabase-js` y
  `@supabase/ssr`; auth SSR basada en cookies
- **Mercado Pago** (Checkout Pro) para pagos
- **dnd-kit**, **framer-motion**, **zod**, **Vitest** (pruebas unitarias)

## Requisitos

- Node.js 20+ (probado con v26)
- pnpm 11+
- Un proyecto en [Supabase](https://supabase.com)
- Una cuenta de [Mercado Pago](https://www.mercadopago.com.mx) (credenciales de
  prueba para desarrollo)

---

## 1. Instalación

```bash
pnpm install
cp .env.example .env.local
```

Rellena `.env.local` (ver [Variables de entorno](#2-variables-de-entorno)).

## 2. Variables de entorno

Todas están documentadas en `.env.example`. Resumen:

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (segura en el navegador). |
| `NEXT_PUBLIC_SITE_URL` | Origen del sitio para los redirect de auth. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secreta, solo server-side.** Bypassa RLS (webhook, entitlements, admin). |
| `PAYMENT_PROVIDER` | `mercadopago`. |
| `MP_ACCESS_TOKEN` | **Secreto.** Access token de Mercado Pago. |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | Public key de Mercado Pago. |
| `MP_WEBHOOK_SECRET` | Secreto de firma del webhook. |
| `MP_PUBLIC_BASE_URL` | URL pública (https) para back/notification URLs; en local = túnel. |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | Moneda (MXN). |
| `NEXT_PUBLIC_PRICING_LAUNCH_ENABLED` / `NEXT_PUBLIC_LAUNCH_CAMPAIGN_END_DATE` | Campaña de precios de lanzamiento. |
| `NEXT_PUBLIC_REFERRAL_ENABLED` / `NEXT_PUBLIC_REFERRAL_CREDIT_MXN` | Programa de referidos (default $50). |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | Número de soporte para servicios asistidos. |

> ⚠️ **Nunca** pongas la `service_role` / secret key ni el `MP_ACCESS_TOKEN` en
> variables `NEXT_PUBLIC_*` ni en el cliente.

## 3. Base de datos

Aplica **todas** las migraciones de `supabase/migrations/` en orden (SQL Editor o
`supabase db push`):

- `0001` schema inicial (tablas, RLS, triggers, perfil automático)
- `0002` fix del trigger de perfil
- `0003` seed de templates · `0004` RPC pública `get_public_invitation`
- `0005` Storage de imágenes (bucket `invitation-images`)
- `0006` monetización (planes, órdenes, entitlements) · `0007` gate de entitlement
  en la pública
- `0008` servicios manuales + referidos
- `0009` panel admin (rol no auto-asignable + métricas)

Tras `0009`, siembra el primer admin por SQL:

```sql
insert into public.admin_users(user_id) values ('<TU_USER_UUID>');
```

## 4. Autenticación (Supabase)

- **Email/contraseña**: activado por defecto (deja "Confirm email" activado).
- **URL Configuration**: Site URL + Redirect URLs (`.../auth/callback`) para local
  y producción.
- **Google OAuth**: crea credenciales OAuth 2.0 y configúralas en Supabase →
  Authentication → Providers → Google. El callback de la app es `/auth/callback`.

## 5. Ejecutar

```bash
pnpm dev        # desarrollo en http://localhost:3000
pnpm build      # build de producción
pnpm start      # servir el build
pnpm lint       # ESLint
pnpm test       # pruebas unitarias (Vitest)
pnpm test:watch # Vitest en watch
```

## 6. Pagos

- Modelo: **pago único por evento** (no suscripción). Planes Free / Esencial /
  Celebración / Premium (ver `src/lib/billing/plans.ts`).
- Para probar el flujo completo en sandbox (túnel, webhook, tarjetas de prueba):
  ver [`docs/pruebas-sandbox.md`](./docs/pruebas-sandbox.md).
- Para activar pagos reales: ver
  [`docs/checklist-pagos-reales.md`](./docs/checklist-pagos-reales.md).

---

## Rutas principales

| Ruta | Descripción |
| --- | --- |
| `/` | Landing. |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth. |
| `/pricing` | Planes y precios. |
| `/dashboard` | Panel protegido (invitaciones). |
| `/dashboard/templates` | Galería de plantillas. |
| `/dashboard/invitations/[id]` | RSVP: stats, tabla, CSV. |
| `/dashboard/animations` | Catálogo de animaciones. |
| `/dashboard/billing` | Facturación + servicios adicionales. |
| `/dashboard/referrals` | Programa de referidos. |
| `/editor/[invitationId]` | Editor modular. |
| `/admin` | Panel de administración (solo admins). |
| `/billing/{checkout,success,pending,cancel}` | Flujo de compra. |
| `/api/webhooks/mercadopago` | Webhook de pagos. |
| `/public/[username]/[slug]` | Invitación pública publicada. |

La protección de rutas y el refresco de sesión se hacen en `proxy.ts` (el antiguo
`middleware`, renombrado en Next.js 16). El rol admin se valida en el layout de
`/admin`.

---

## Seguridad (resumen)

- **RLS obligatorio** en todas las tablas. En las tablas de dinero
  (`orders`, `invitation_entitlements`, `service_requests`, `referrals`,
  `referral_credits`, `admin_users`) el dueño **solo LEE**; la escritura es
  exclusivamente server-side (`service_role`): imposible auto-otorgarse premium o
  rol admin desde el front.
- **Webhook fail-closed**: valida la firma HMAC, consulta el pago real a MP (no
  confía en el payload) y es idempotente.
- **Rol admin no auto-asignable**: vive en `admin_users` (fuera de `profiles`);
  el primer admin se siembra por SQL.

## Estructura

```
src/
  app/            rutas (auth, dashboard, admin, billing, editor, público, api)
  components/     ui/, auth/, billing/, referrals/, admin/, animation/…
  lib/
    auth/         acciones de auth + guard admin
    billing/      planes, precios, Mercado Pago, fulfillment, entitlements (+ tests)
    referrals/    códigos y acciones de referidos (+ tests)
    services/     solicitudes de servicios manuales
    supabase/     clients (browser/server/admin) + guard de proxy
proxy.ts          refresco de sesión y guardas de ruta
supabase/migrations/  SQL (0001→0009)
docs/             guía de pruebas sandbox + checklist de pagos reales
```

## Documentos

- [`HANDOFF.md`](./HANDOFF.md) — estado por fase y detalle técnico de la Fase 8.
- [`docs/pruebas-sandbox.md`](./docs/pruebas-sandbox.md) — E2E de pago en sandbox.
- [`docs/checklist-pagos-reales.md`](./docs/checklist-pagos-reales.md) — go-live.
