# Checklist para activar pagos reales (go-live)

Dominio crítico (dinero). Recorre **todo** antes de aceptar el primer pago real.
No actives producción con credenciales o URLs de prueba.

---

## 1. Credenciales de Mercado Pago (producción)

- [ ] Cambiar `MP_ACCESS_TOKEN` al **Access Token de producción** (empieza por
      `APP_USR-…` de tu app en modo productivo).
- [ ] Cambiar `NEXT_PUBLIC_MP_PUBLIC_KEY` a la **Public Key de producción**.
- [ ] Confirmar que **NO** son de prueba: `GET https://api.mercadopago.com/users/me`
      con el token → la cuenta **no** debe ser `test_user…`.
- [ ] Regenerar el **secreto de firma del webhook** en el panel de producción y
      ponerlo en `MP_WEBHOOK_SECRET`.

## 2. URLs y dominio

- [ ] `MP_PUBLIC_BASE_URL` = tu **dominio https real** (no un túnel).
- [ ] `NEXT_PUBLIC_SITE_URL` = tu dominio real (redirect de auth y enlaces).
- [ ] Webhook en el panel de MP apuntando a
      `https://TU-DOMINIO/api/webhooks/mercadopago`, evento **"Pagos"** (topic
      `payment`).
- [ ] En Supabase → Authentication → URL Configuration: agregar el dominio a
      **Site URL** y **Redirect URLs** (`https://TU-DOMINIO/auth/callback`).

## 3. Base de datos

- [ ] Aplicar **todas** las migraciones al remoto en orden: `0001`→`0012`.
      Las posteriores al corte original: `0010` (vanity slugs), `0011` (lista de
      invitados con QR) y `0012` (branding condicional por plan). Sin `0012` el
      pie "Hecho con Sobrely" se muestra en TODOS los planes, incluidos los que
      lo venden sin marca.
- [ ] Verificar con un query de diagnóstico (tablas, funciones, RLS, policies).
- [ ] **Sembrar el primer admin** (bootstrap, no hay UI para el primero):
      ```sql
      insert into public.admin_users(user_id) values ('<TU_USER_UUID>');
      ```
- [ ] Confirmar que el **seed de `plans`** coincide con `src/lib/billing/plans.ts`
      (precios, módulos, vigencias). El `0006` lo reaplica con `on conflict`.

## 4. Secretos y seguridad

- [ ] `SUPABASE_SERVICE_ROLE_KEY` presente **solo server-side**; NUNCA en una var
      `NEXT_PUBLIC_*` ni en el cliente.
- [ ] Ningún secreto commiteado (`.env.local` fuera de git; `.env.example` sin
      valores reales).
- [ ] RLS activo en todas las tablas de dinero (`orders`, `invitation_entitlements`,
      `service_requests`, `referrals`, `referral_credits`, `admin_users`): dueño
      solo LEE, escritura solo `service_role`.

## 5. Producto y precios

- [ ] Revisar campaña de lanzamiento: `NEXT_PUBLIC_PRICING_LAUNCH_ENABLED` y
      `NEXT_PUBLIC_LAUNCH_CAMPAIGN_END_DATE` (si la campaña ya terminó, aplica el
      precio regular).
- [ ] Revisar `NEXT_PUBLIC_DEFAULT_CURRENCY` (MXN) y `PAYMENT_PROVIDER=mercadopago`.
- [ ] Revisar crédito de referidos `NEXT_PUBLIC_REFERRAL_CREDIT_MXN` y
      `NEXT_PUBLIC_REFERRAL_ENABLED`.
- [ ] `NEXT_PUBLIC_SUPPORT_WHATSAPP` con el número real de soporte (servicios
      asistidos).
- [ ] Textos "Próximamente" (analytics avanzados, dominio propio) siguen atenuados
      y **no** se cobran.

## 6. Smoke test en producción

- [ ] Un **pago real chico** con tarjeta propia → orden `paid` + entitlement activo
      + invitación pública visible.
- [ ] Un **reembolso** desde el panel de MP → el webhook marca la orden `refunded`
      (aparece en el panel admin). *(La ejecución del reembolso es manual desde MP;
      la app solo refleja el estado.)*
- [ ] Verificar que el panel `/admin` muestra las métricas correctas (ingresos,
      conversión, órdenes por estado).

## 7. Post go-live

- [ ] Monitorear los primeros webhooks (logs) para confirmar firma válida y
      fulfillment ok.
- [ ] Confirmar que el túnel de pruebas quedó apagado y no hay `MP_PUBLIC_BASE_URL`
      apuntando a un `trycloudflare.com`.
