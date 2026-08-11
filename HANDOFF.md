# InvitaFlow — Handoff de sesión

> Documento de traspaso. Registra lo hecho, lo pendiente y lo que sigue.
> No es memoria del agente ni se guarda en ningún brain — vive en el repo.

## Qué es el proyecto

**InvitaFlow**: SaaS de invitaciones digitales dinámicas, modulares y
personalizables (bodas, XV, cumpleaños, baby shower, corporativo). Mobile-first.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript estricto · Tailwind v4 ·
shadcn/ui (Base UI, no Radix) · Supabase (Postgres + Auth + Storage + RLS) ·
`@supabase/ssr` · dnd-kit · zod · framer-motion. Deploy previsto: Vercel.

**Regla de trabajo (IMPORTANTE):** el proyecto avanza **por fases**, una a la vez,
y **cada fase requiere aprobación explícita** del dev antes de continuar. No
avanzar solo. Antes de escribir código de **pagos (Fase 6)** hay que **preguntar
el proveedor** (Stripe / Mercado Pago / otro).

---

## Estado por fases

| Fase | Descripción | Estado |
|---|---|---|
| 1 | Cimientos + Supabase (auth email/Google, RLS, dashboard, landing) | ✅ Aprobada |
| 2 | Editor modular (dnd-kit, módulos Hero/Countdown/Map/RSVP, guardar) | ✅ Aprobada |
| 3 | Templates + publicación pública `/public/[username]/[slug]` (Framer, OG) | ✅ Aprobada |
| 4 | RSVP público + dashboard de invitados (stats, filtros, CSV) | ✅ Aprobada |
| 5 | Personalización avanzada + módulos adicionales (11 módulos, Storage) | ✅ Aprobada |
| 5.1–5.7 | Sistema de animaciones (arquitectura, catálogo, presets, editor, a11y) | ✅ Aprobadas |
| **8** | **Monetización y lanzamiento comercial** (reemplaza a la vieja "Fase 6") | ✅ **COMPLETA** (8.1–8.8) — ver sección Fase 8 abajo |
| 8.1 | Config central de planes + `/pricing` | ✅ Aprobada |
| 8.2 | BD y entitlements (migración `0006`) | ✅ Aprobada |
| 8.3 | Integración Mercado Pago (Checkout Pro) | ✅ Aprobada |
| 8.4 | Control de acceso y límites (enforcement + `0007`) | ✅ Aprobada |
| 8.5 | Flujo de compra (checkout, billing, CTA upgrade) | ✅ Aprobada |
| 8.6 | Servicios manuales + referidos (migración `0008`) | ✅ Aprobada |
| 8.7 | Admin y métricas (migración `0009`) | ✅ Aprobada |
| 8.8 | Pruebas y validación comercial (Vitest + docs) | ✅ Aprobada |
| **7** | **Producción y lanzamiento** (SEO, analytics, deploy, dominio) | 🚧 **EN PROGRESO** — ver sección Fase 7 abajo |
| 7.1 | SEO técnico (metadataBase, robots, sitemap, OG, manifest) | ✅ Aprobada |
| 7.2 | Analytics (Vercel Web Analytics) | ✅ Aprobada |
| 7.3 | Deploy a Vercel (config + env vars) | ⏳ **SIGUIENTE** |
| 7.4 | Dominio + post-deploy (Auth/OAuth/`SITE_URL`) | ⏳ Pendiente |
| 7.5 | Go-live pagos reales (checklist) | ⏳ Pendiente |

---

## Lo que se hizo (resumen técnico)

### Fase 1 — Auth + base de datos
- Auth SSR con cookies: `src/lib/supabase/{client,server,middleware}.ts`, `proxy.ts`
  (en Next 16 el middleware se llama `proxy`). Login/registro email+password,
  Google OAuth (`/auth/callback`), logout, recuperación/reset de contraseña.
- Migración `0001_initial_schema.sql`: tablas `profiles`, `invitations`,
  `invitation_modules`, `rsvp_responses`, `templates` + índices + trigger
  `updated_at` + **trigger de perfil automático** + **RLS** en todas.
- Fix `0002_fix_handle_new_user.sql`: el trigger usaba `gen_random_bytes` (pgcrypto,
  no visible con `search_path=public` en Supabase) → cambiado a `md5(random())`.

### Fase 2 — Editor
- `/editor/[invitationId]` protegido. `InvitationEditor` (client) con estado local,
  dnd-kit para reordenar módulos, agregar/ocultar/eliminar, guardar vía Server
  Action `saveEditor` (reconcilia módulos, devuelve ids reales).
- Dashboard: listar/crear/eliminar invitaciones.

### Fase 3 — Templates + público
- `0003_seed_templates.sql` (5 templates), `0004_public_invitation_rpc.sql`
  (función `get_public_invitation` SECURITY DEFINER — resuelve username→invitación
  publicada sin exponer `profiles`).
- Galería de templates, publicar/despublicar, página pública con metadata dinámica
  + Open Graph + 404.

### Fase 4 — RSVP + invitados
- Form RSVP público funcional (zod), inserción vía RLS (solo publicadas).
- `/dashboard/invitations/[id]`: stats (confirmados/rechazados/pendientes/total),
  filtros, edición inline, eliminar, **export CSV**.

### Fase 5 — Personalización + módulos
- **11 módulos:** hero, welcome, countdown, map, gallery, video, itinerary,
  dresscode, gifts, music, rsvp.
- **Tema por invitación** (`theme_config`): colores, tipografía (Playfair/Dancing
  vía next/font), espaciado, on/off animaciones.
- **Supabase Storage** `0005_storage_images.sql` (bucket `invitation-images`, RLS por
  carpeta `<user_id>/…`) + uploader con compresión en canvas.
- **Módulos con opciones especiales:**
  - **Galería:** estilos `grid / masonry / collage(bento) / carousel(coverflow
    autoplay infinito)`, lightbox (Framer `layoutId`), Ken Burns, y **reordenar
    fotos arrastrando** (dnd-kit).
  - **Countdown:** toggle "Usar la fecha del evento" (una sola fecha) + botón
    "usar también como fecha del evento".
  - **Dress code:** selector Etiqueta/Formal/Semi-formal/Casual/Personalizado con
    **ilustraciones SVG originales** (no se copió arte con derechos) + opción de
    **subir imagen propia**.

### Fase 5.1–5.7 — Animaciones
- Arquitectura: `src/lib/animation/{types,tokens,registry,schema,style-presets,conflicts}.ts`,
  `src/hooks/use-reveal.ts`, `src/components/animation/*`, `src/app/animations.css`.
- 12 revelados CSS + stagger + 2 de texto (Framer) + 3 decoraciones + Ken Burns.
- 8 **presets de estilo**, panel de edición global + por módulo, detector de
  conflictos, catálogo visual en `/dashboard/animations`.
- **Progressive enhancement con `@media (scripting: enabled)`** (sin `<script>`),
  reduced-motion en CSS + componentes, solo props compositor-friendly.

---

## Verificación hecha

- `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` → **limpios** al cierre.
- Medido en navegador (público): sin scroll horizontal (1280px y 375px), 5/5
  imágenes `lazy`, `scripting: enabled` activo.

## Pendientes / cosas a saber

1. **Reiniciar el dev server** del usuario: tras ~20 ediciones de esta sesión, su
   `pnpm dev` quedó con HMR stale (errores `Script is not defined` en consola que
   **no** están en el código final; `pnpm build` compila limpio). `Ctrl+C` + `pnpm dev`.
2. **Migraciones a aplicar** (si la BD no está al día): `0001`→`0005` en orden
   (SQL Editor de Supabase o `supabase db push`). Ver README.
3. **Storage:** bucket `invitation-images` debe existir (lo crea `0005`; si el
   proyecto no permite crear buckets por SQL, crearlo manual + aplicar políticas).
4. **Pruebas manuales en dispositivos reales** (no ejecutadas por el agente):
   Safari iOS, Chrome Android, gama baja, reduce-motion, sin-JS. Checklist en el
   informe de la Fase 5.7.
5. **Micro-interacciones de animación no hechas** (deferidas): number-flip,
   timeline-draw, success/error del RSVP, presets `layered-reveal`,
   `welcome-entrance`, `line-draw`, `ornamental-drift` (marcados `implemented:false`).
6. **No hay** notificación por correo al dueño cuando llega un RSVP (fuera de alcance).

## Detalles del entorno / gotchas

- **shadcn usa Base UI** (no Radix): botones-enlace usan `render={<Link/>}` +
  `nativeButton={false}`; `Select.Value` necesita **función hija** para mostrar la
  etiqueta (`<SelectValue>{(v)=>LABEL[v]}</SelectValue>`), si no muestra el valor crudo.
- **Next 16:** `middleware` → `proxy.ts`; `params`/`searchParams` son `Promise`.
- Clave pública Supabase: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (esquema nuevo).
- Variables de entorno en `.env.example`. Nunca exponer service_role.

---

## Fase 6 — lo que sigue (NO empezar sin aprobación)

Objetivo: Plan Free / Pro, `/pricing`, integración de pagos, webhooks, registro de
suscripción en Supabase, **límites por plan** (módulos premium, nº de invitaciones
activas), branding en Free / sin branding en Pro.

**Antes de escribir código:** preguntar al dev qué proveedor (Stripe / Mercado Pago /
otro). No usar claves secretas en el cliente. Es dominio crítico (dinero) → revisión
cuidadosa. Ver el prompt original del proyecto para el detalle de la Fase 6.

---

_Ubicación canónica del plan de fases: el prompt inicial del proyecto (mensaje del
dev). Este handoff resume estado; la fuente de la definición de cada fase es ese
prompt._

---

# Fase 8 — Monetización y lanzamiento comercial

> Reemplaza la vieja "Fase 6". Modelo: **freemium con pago ÚNICO por evento**
> (NO suscripción). Proveedor: **Mercado Pago (Checkout Pro)**. Mercado inicial:
> México, precios en MXN. Sesión trabajada: 2026-08-10/11.

## Decisiones de producto (tomadas y aprobadas por el dev)

Tras un deep-research del mercado MX (TeInvitamos $450/$850/$1,500; Invitame OK
$850/$1,600/$2,000; Digi $149–$1,699; etc. — banda popular **$450–$1,500 MXN**;
**nadie en MX usa suscripción ni límites de vigencia/invitados**), se rediseñaron
los planes porque el Free original **canibalizaba** (sin vigencia + podía publicar).

**Planes finales (precio lanzamiento / regular MXN):**

| Plan | Precio | Vigencia | Invitados | Módulos | Branding |
|---|---|---|---|---|---|
| Free | $0 | **demo 14 días** al publicar | 25 | hero, welcome, countdown, rsvp | completo |
| Esencial | $199 / $299 | evento **+7 días** | 100 | + map, gifts | reducido |
| Celebración ⭐ | $399 / $499 | evento **+30 días** | 250 | + gallery, itinerary, dresscode, music | sin branding |
| Premium | $699 / $899 | evento **+90 días** | 500 | + video (los 11) | sin branding |

Reglas clave decididas:
- **Free ya no canibaliza:** borradores ilimitados + preview; al publicar es DEMO
  de 14 días con branding. Publicar "real" (hasta el evento) es de pago.
- **Se eliminó "invitaciones activas" como límite:** modelo por evento puro — cada
  PUBLICACIÓN es una compra que aplica a UNA invitación.
- **Vigencia relativa al evento** (`event_date + margen`), *fallback* a 3/6/12
  meses desde publicar si no hay fecha. Helper puro `resolveExpiry()`.
- **Módulos ⭐ premium desbloqueados por plan** (un solo checkout; NO à-la-carte).
- **Analytics avanzados y dominio propio = "Próximamente"** (NO construidos, NO se
  cobran; marcados atenuados para no hacer publicidad engañosa).
- Precios se mantienen (competitivos-bajos vs mercado MX).

## Lo hecho por subfase (8.1–8.5, todas aprobadas)

### 8.1 — Config central + `/pricing`
- Fuente de verdad tipada en `src/lib/billing/`: `types.ts`, `config.ts` (env:
  moneda, campaña de lanzamiento, proveedor, `formatPrice`), `plans.ts` (los 4
  planes + helpers `getEffectivePrice`, `isOnLaunchOffer`, `resolveExpiry`,
  `premiumModulesFor`, `minimalPlanForModules`), `services.ts` (5 servicios),
  `features.ts` (tabla comparativa), `index.ts`.
- Página `/pricing` (tarjetas, "Más elegido" en Celebración, comparativa,
  transparencia). `src/components/billing/{plan-card,comparison-table}.tsx`.
- Link "Precios" en la landing.

### 8.2 — BD y entitlements → `supabase/migrations/0006_monetization.sql`
- Tablas `plans` (sembrada desde `plans.ts`), `orders`, `invitation_entitlements`.
  **NO** se creó `subscriptions` (modelo por evento).
- RLS dura: `plans` lectura pública de activos; `orders` y `entitlements` el dueño
  **solo LEE**; **sin policies de escritura** → solo `service_role` escribe →
  imposible auto-otorgarse premium desde el front.
- Índice único `orders_provider_payment_unique` (anti-webhook-duplicado).
- Funciones `is_entitlement_active()`, `invitation_effective_plan()`.
- **Verificada en stack Supabase LOCAL** (seed, RLS, idempotencia, checks).

### 8.3 — Mercado Pago (Checkout Pro)
- SDK `mercadopago@3.3.0`.
- `src/lib/supabase/admin.ts` (cliente service_role, `import "server-only"`).
- `src/lib/billing/mercadopago.ts` (config + `mpPreference`/`mpPayment` + re-export
  de la firma), `mp-signature.ts` (verificación HMAC pura y testeable — **8/8
  pruebas pasan**), `fulfillment.ts` (idempotente: mapea estado MP, activa
  entitlement con `resolveExpiry`), `actions.ts` (`createPlanCheckout`).
- Webhook `src/app/api/webhooks/mercadopago/route.ts`: valida firma (fail-closed
  401), consulta el pago real a MP (no confía en el payload), fulfillment
  idempotente.
- Páginas `/billing/{success,pending,cancel}`.

### 8.4 — Control de acceso y límites
- `src/lib/billing/entitlements.ts` (server-only): `getInvitationEntitlement`,
  `isEntitlementActive`, `getInvitationEffectivePlan`, `getUserPlan`,
  `canUseModule/Feature`, `canPublishInvitation`, `canAddGuest`, `getStorageStatus`.
- **Gate de publicación** en `setPublished` (módulos ⊆ plan; Free = demo 14 días;
  premium sin plan → bloqueo con `requiredPlan`, sin borrar módulos).
- **Tope de invitados** en `submitRsvp` (cliente admin).
- **Migración `0007_public_entitlement_gate.sql`**: `get_public_invitation` exige
  `is_entitlement_active` → la invitación se oculta al expirar. **Verificada en
  local** (3 casos: sin entitlement / activo / expirado).
- **Cuota de storage**: `checkUploadQuota` + pre-check en `image-uploader.tsx`.

### 8.5 — Flujo de compra
- `src/components/billing/checkout-button.tsx` (redirige a MP).
- **Modal de upgrade en el editor** (el bloqueo de publicar por módulos ⭐ ahora
  abre "Mejora a [plan]" con precio + botón de pago).
- `/billing/checkout?plan=…` (elige invitación → paga).
- `/dashboard/billing` (planes activos + historial) + link "Facturación" en el
  layout del dashboard.
- `/pricing` CTA de pago → checkout. `/billing/success` lee el estado real de la
  orden (no activa por visitarla).
- **Fix medido:** MP rechaza `auto_return` con `back_url` no pública
  (`invalid_auto_return`). Solución: `MP_PUBLIC_BASE_URL` para back/notification
  URLs + `auto_return` solo si la base es `https`. (Causa reproducida contra la API
  real de MP, no supuesta.)

### 8.6 — Servicios adicionales manuales + referidos → `0008_services_referrals.sql`
Modelo: **servicios asistidos por flujo solicitud-primero** + **referidos con
crédito acumulable** (renovación automática DIFERIDA, se retoma después).
- **Migración `0008`**: tablas `service_requests` (ciclo pending→contacted→
  in_progress→completed→cancelled), `referral_codes` (1 por usuario),
  `referrals` (unique en `referred_user_id`; check anti-auto-referido),
  `referral_credits` (ledger inmutable, unique en `referral_id`). Función
  `get_referrer_by_code` (SECURITY DEFINER, normaliza upper+trim). **RLS dura**:
  dueño solo LEE lo suyo, escritura solo `service_role`. **Verificada en LOCAL**
  (estructura + constraints + idempotencia del crédito; ver abajo).
- **Servicios** (`src/lib/services/actions.ts` → `requestManualService`): valida
  sesión + que el servicio sea `isManual`, registra la solicitud con el cliente
  admin, devuelve enlace `wa.me` prellenado. UI:
  `components/billing/service-request-section.tsx` (panel inline, sin Dialog) en
  `/dashboard/billing`.
- **Referidos** (`src/lib/referrals/{types,codes,actions}.ts`):
  `ensureReferralCode` (genera/reintenta ante colisión), `applyReferralCode`
  (bloquea auto-referido, doble-referido y código inexistente),
  `getReferralSummary` (código, enlace `?ref=`, lista, saldo del ledger). UI:
  `/dashboard/referrals` + `components/referrals/referral-panel.tsx`. Link
  "Referidos" en el layout del dashboard.
- **Gancho en `fulfillment.ts`**: al pasar una orden a `paid` (plan O servicio),
  si el pagador es un referido en `pending` → lo pasa a `credited`, fija
  `credit_amount`+`qualifying_order_id` e inserta al ledger. **Idempotente**
  (guard `status='pending'` + unique en `referral_credits.referral_id`) y en
  `try/catch` aislado: un fallo de referido NO tumba el fulfillment del pago.
- **Decisión**: aplicar el código es **post-signup** (form en el panel), no en el
  registro — no se tocó el flujo de auth para reducir riesgo. El enlace `?ref=`
  lleva a `/register`; la captura automática en signup queda como incremento
  chico (candidato a 8.7). **Redención del crédito** (descuento en checkout)
  fuera de 8.6: el crédito solo se acumula/muestra, se aplica manual por ahora.

### 8.7 — Vista admin protegida + métricas → `0009_admin.sql`
Panel `/admin` solo para admins; rol **no auto-asignable**.
- **Migración `0009`**: tabla `admin_users` (RLS **select-own**, SIN write policies
  → solo `service_role`/funciones DEFINER escriben; primer admin por SQL). 5
  funciones `SECURITY DEFINER` con gate interno `is_admin(auth.uid())`:
  `is_admin`, `get_admin_metrics` (usuarios, órdenes/servicios/referidos por
  estado, ingresos pagados, reembolsos, conversión, crédito otorgado),
  `admin_list_admins`, `admin_user_id_by_email`, `admin_recent_service_requests`
  (join a `auth.users` para el email). **Verificada en LOCAL** (gate no-admin
  rechazado, métricas trianguladas contra query directo).
- **Autorización (defensa en profundidad)**: `src/lib/auth/admin.ts`
  (`requireAdmin` / `isCurrentUserAdmin`); `src/app/admin/layout.tsx` gate duro;
  `/admin` agregado a `PROTECTED_PREFIXES` en `middleware.ts` (no-auth → login; el
  ROL se valida en el layout, no en el proxy). Link "Admin" condicional en el
  dashboard.
- **Acciones** (`src/lib/admin/actions.ts`, `requireAdmin()` + `service_role`):
  `updateServiceRequestStatus` (mueve el ciclo pending→…→completed/cancelled),
  `grantAdmin(email)` (resuelve vía `admin_user_id_by_email`, inserta),
  `revokeAdmin(userId)` con guarda **anti auto-lockout** (no puedes revocarte).
- **UI** (`/admin`): stat-cards + desgloses por estado + tabla de solicitudes con
  cambio de estado inline (`<select>` nativo para evitar el gotcha de `Select`
  de Base UI) + gestión de admins. Componentes en `src/components/admin/`.
- **Decisión**: reembolsos y gestión de usuarios/planes NO se ejecutan en 8.7
  (los `refunded` solo se muestran); candidatos a 8.8/posterior.

### 8.8 — Pruebas y validación comercial (cierre de Fase 8)
- **Infra de pruebas**: **Vitest** (MIT, comercializable, sin phone-home — 3
  condiciones OSS ✅). `vitest.config.mts` (alias `@/→src`, entorno node),
  scripts `test`/`test:watch` en `package.json`. Solo devDep, no toca producción.
- **Suite unitaria (37 tests, verdes)** sobre lógica de dinero determinista:
  `plans.test.ts` (`resolveExpiry` 3 ramas, `minimalPlanForModules`,
  `premiumModulesFor`, `planAllowsModule`, precios de campaña), `config.test.ts`
  (`formatPrice`, `isLaunchCampaignActive` con corte, parsing de crédito),
  `mp-signature.test.ts` (9 casos: válida + tampering + fail-closed),
  `mp-status.test.ts` (mapeo MP→estado), `referrals/codes.test.ts`.
- **Refactor mínimo**: `mapStatus` + tipo se movieron a un módulo PURO
  `src/lib/billing/mp-status.ts` (sin `server-only`, que lanzaría al importarse
  en Vitest); `fulfillment.ts` lo reusa. Sin efecto en runtime.
- **Docs en repo**: `docs/pruebas-sandbox.md` (E2E de pago: túnel, webhook,
  tarjetas de prueba MP, verificación por caso, expiración, idempotencia) y
  `docs/checklist-pagos-reales.md` (go-live: credenciales producción, dominio,
  webhook, migraciones `0001`→`0009`, sembrar admin, secretos, smoke test).
- **README** refrescado del "Fase 1" viejo al estado real de Fase 8 (stack,
  rutas, migraciones, env vars, `pnpm test`, seguridad).
- **Solo unit** (acordado): las invariantes de BD (idempotencia/RLS/expiración)
  ya se verificaron en local en subfases previas y se documentan en la guía
  sandbox; no se automatizó integración con BD (evita Supabase en el runner).

## Variables de entorno de la Fase 8 (todas en `.env.example`)
- `NEXT_PUBLIC_DEFAULT_CURRENCY` (MXN), `NEXT_PUBLIC_PRICING_LAUNCH_ENABLED`,
  `NEXT_PUBLIC_LAUNCH_CAMPAIGN_END_DATE`, `PAYMENT_PROVIDER`.
- `MP_ACCESS_TOKEN` (secreto), `NEXT_PUBLIC_MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`.
- `SUPABASE_SERVICE_ROLE_KEY` (secreto, server-only).
- `MP_PUBLIC_BASE_URL` (URL pública para back/notification URLs; en local = túnel).
- **(8.6)** `NEXT_PUBLIC_SUPPORT_WHATSAPP` (número de soporte para wa.me; vacío =
  sin enlace directo), `NEXT_PUBLIC_REFERRAL_CREDIT_MXN` (crédito por referido,
  default 50), `NEXT_PUBLIC_REFERRAL_ENABLED` (on/off del programa, default true).

## Estado del entorno al cerrar la sesión
- **Credenciales MP del dev = de PRUEBA (sandbox).** Verificado vía `/users/me`:
  cuenta `test_user` (`TESTUSER…`, email `@testuser.com`, site MLM). **NO cobra
  dinero real.** Se paga con tarjetas de prueba de MP. Cobros reales solo al pasar
  a credenciales de **producción** (checklist 8.8).
- **Túnel cloudflared** activo en la sesión (efímero, cambia al reiniciar):
  `https://boxes-april-yield-explained.trycloudflare.com` (webhook =
  `…/api/webhooks/mercadopago`). Config MP webhook: evento **"Pagos (legacy)"**.
  Para apagarlo: `kill 64145` (o `pkill cloudflared`).
- **Stack Supabase LOCAL** levantado (Docker) para verificar migraciones. Apagar
  con `supabase stop`. Creó `supabase/config.toml` (nuevo).
- Dev server del dev con `MP_PUBLIC_BASE_URL` = URL del túnel para probar redirect.

## PENDIENTE / lo que sigue

1. **✅ `0006` + `0007` CONFIRMADAS en el Supabase REMOTO** (sesión 2026-08-11,
   vía query de diagnóstico read-only contra `pg_*`: tablas, funciones, índice
   único, RLS, 3 policies, seed de planes y el gate de `get_public_invitation`
   todos presentes). Ya no hay pendiente ahí.
2. **⚠️ Aplicar `0008` + `0009` al Supabase REMOTO** antes de usar
   servicios/referidos y el panel admin en real. En esta sesión solo se
   aplicaron/verificaron en LOCAL. Vía SQL Editor o `supabase db push`.
   - Tras aplicar `0009`, **sembrar el primer admin** por SQL (bootstrap, no hay
     UI para el primero): `insert into public.admin_users(user_id) values
     ('<TU_USER_UUID>');` (el UUID sale de Authentication → Users o
     `select id from auth.users where email='tu@email';`).
3. **✅ Prueba E2E sandbox CERRADA (2026-08-11).** Pago real de prueba con
   comprador `TESTUSER…` + tarjeta `APRO` → orden `7542f923…` quedó `paid`
   ($699 Premium, `provider_payment_id=172362178821`) y el entitlement de la
   invitación `active` (`expires_at` = evento + 90d, `guest_limit=500`). El
   webhook validó firma (200) tras corregir `MP_WEBHOOK_SECRET`. Gotchas
   aprendidos abajo.
4. **✅ 8.8 hecha:** suite Vitest (37 tests) + `docs/pruebas-sandbox.md` +
   `docs/checklist-pagos-reales.md`. Fase 8 COMPLETA.
5. **SIGUIENTE (post Fase 8):** puesta en producción / lanzamiento (deploy a
   Vercel, dominio https, SEO/sitemap, analytics) — la vieja "Fase 7". Requiere
   aprobación antes de empezar. El checklist de go-live de pagos está en
   `docs/checklist-pagos-reales.md`.

## Gotchas nuevos de la Fase 8
- **`auto_return` de MP exige `back_url` pública (https).** En localhost falla; por
  eso `MP_PUBLIC_BASE_URL` + condicional. Sin túnel, el checkout funciona pero sin
  auto-return y el webhook no llega a localhost.
- **Cuota de storage = barrera BLANDA:** la subida es directa cliente→Storage; el
  pre-check es evitable. Enforcement duro requiere mover la subida a un route
  handler o policy de Storage (mejora futura; es límite de recurso, no desbloqueo
  premium).
- **Seed de `plans`** debe mantenerse sincronizado con `src/lib/billing/plans.ts`
  (el `0006` reaplica con `on conflict do update`).
- El webhook usa evento MP **"Pagos (legacy)"** (topic `payment`), NO "Order
  (Mercado Pago)" (API nueva, estructura distinta que el código no parsea).
- **Sandbox "una de las partes es de prueba":** el comprador NO puede ser tu
  cuenta MP real; hay que pagar con un **usuario de prueba comprador** (panel MP →
  Cuentas de prueba). El login usa el campo **Usuario** (`TESTUSER…`), no un email
  (MP no genera correo); si el form exige email, `TESTUSER…@testuser.com`. Usar
  ventana de incógnito para no arrastrar la sesión real de MP.
- **`MP_WEBHOOK_SECRET` debe ser el de la config del webhook del panel.** Si no
  coincide → webhook responde **401 "firma inválida"** y la orden se queda
  `pending` (el pago sí existe en MP). Verificar el pago real con
  `GET /v1/payments/<id>` y, para re-disparar, usar **"Simular notificaciones"**
  del panel (manda una notificación FIRMADA con el secreto; probar con el `data.id`
  del pago real). El panel nuevo de MP no siempre tiene botón "Reenviar".
- **`live_mode:true` en pagos de usuarios de prueba es NORMAL** (simulan
  producción con dinero ficticio); no implica cobro real. Confirmar cuenta con
  `GET /users/me` → tags incluye `test_user`.
- **Túnel efímero:** cloudflared cambia de URL al reiniciar; hay que actualizar
  `MP_PUBLIC_BASE_URL` + la URL del webhook en MP + `allowedDevOrigins` en
  `next.config.ts` (Next 16 bloquea recursos dev cross-origin del túnel).

---

# Fase 7 — Producción y lanzamiento

> Arranca tras cerrar la Fase 8. Decisiones tomadas: **hosting = Vercel**,
> **analytics = Vercel Web Analytics**, **dominio = aún no** (se arranca con la
> URL `*.vercel.app` y se conecta dominio en 7.4). Se trabaja por sub-bloques con
> aprobación explícita.

## Plan de sub-bloques
- **7.1** SEO técnico ✅ — **7.2** Analytics (Vercel) — **7.3** Deploy a Vercel
  (config + env vars) — **7.4** Dominio + post-deploy (Auth/OAuth/`SITE_URL`) —
  **7.5** Go-live pagos reales (usar `docs/checklist-pagos-reales.md`).

## 7.1 — SEO técnico (hecho)
- `src/app/layout.tsx`: `metadataBase` derivado de `NEXT_PUBLIC_SITE_URL` (no se
  hardcodea dominio; en Vercel/prod se vuelve absoluto solo) + defaults de
  `openGraph`/`twitter` (siteName, `locale es_MX`, type website).
- `src/app/robots.ts`: permite marketing, **bloquea** `/dashboard`, `/admin`,
  `/editor`, `/billing`, `/api` y rutas de auth; apunta al sitemap.
- `src/app/sitemap.ts`: solo marketing (`/`, `/pricing`). Las invitaciones
  públicas NO van (contenido de usuario, ya tienen su propio OG desde Fase 3);
  queda como opción indexarlas después.
- `src/app/opengraph-image.tsx`: OG de marca 1200×630 con `next/og` (sin assets
  ni fuentes remotas). Las públicas conservan su OG propio.
- `src/app/manifest.ts`: manifest PWA (mobile-first); íconos referencian el
  `favicon.ico` (cuando haya PNG 192/512 de marca se agregan).
- `src/app/pricing/page.tsx`: fix del título (usaba `"… · InvitaFlow"` y el
  template raíz lo duplicaba) → ahora solo `"Planes y precios"`.
- Verificado en vivo: `/robots.txt`, `/sitemap.xml` (XML válido), `/opengraph-image`
  (image/png 92KB). `tsc`/`lint`/`build` limpios.
- Gotcha Next 16: un `title` string de página hijo se envuelve con el `template`
  del root → no incluir "· InvitaFlow" en los títulos de página.

## 7.2 — Analytics (hecho)
- `@vercel/analytics@2.0.1` + `<Analytics/>` (de `@vercel/analytics/next`) en el
  layout raíz. Cookieless, agregado; mide tráfico del sitio público, no datos de
  cliente ni contenido de invitaciones. **No-op en local**; solo emite en Vercel.
- ⚠️ En el deploy (7.3) hay que **activar Analytics** una vez en el panel de
  Vercel (proyecto → pestaña Analytics). Sin env vars.

## Prompt para continuar (pegar al retomar)

> Retomo InvitaFlow en "/Users/arturocastillo/Documents/Personal projects/invitaflow".
> Lee primero HANDOFF.md (secciones "Fase 8" y "Fase 7") y README.md. La **Fase 8
> (Monetización) está COMPLETA** (8.1–8.8, incl. prueba E2E sandbox cerrada).
> Ahora estamos en la **Fase 7 (Producción y lanzamiento)**: hosting **Vercel**,
> analytics **Vercel Web Analytics**, **sin dominio aún** (se arranca con
> `*.vercel.app`). **7.1 (SEO) y 7.2 (Vercel Analytics) aprobadas**; la
> **siguiente es la 7.3** (deploy a Vercel: config + env vars + conexión del
> repo). Reglas: se trabaja por sub-bloques, uno a la
> vez, y **cada uno requiere mi aprobación explícita** — NO avances solo; al
> terminar muéstrame resumen, archivos, migraciones, env vars, cómo probar,
> pendientes y riesgos, y pregúntame si apruebo. **Pendientes operativos ANTES de
> cobrar en real** (ver docs/checklist-pagos-reales.md): pasar MP a credenciales de
> PRODUCCIÓN, webhook en el dominio, `MP_PUBLIC_BASE_URL`=dominio. Estado remoto:
> migraciones `0001`–`0009` aplicadas y admin sembrado; credenciales MP siguen de
> PRUEBA. NO guardes nada en tu cerebro/memoria ni en el workflow Personal Projects.
