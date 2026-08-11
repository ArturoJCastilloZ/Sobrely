# Guía de pruebas E2E en sandbox (Mercado Pago)

Prueba el flujo completo de pago **con credenciales de PRUEBA** (no cobra dinero
real). Cubre: checkout → webhook → orden `paid` → entitlement activo → crédito de
referido, y los casos de rechazo/pendiente, expiración e idempotencia.

> Requisitos: migraciones `0001`→`0009` aplicadas en tu Supabase, `.env.local`
> con las claves **de prueba** de Mercado Pago y `SUPABASE_SERVICE_ROLE_KEY`.

---

## 1. Levantar un túnel público

Mercado Pago necesita una URL pública (https) para el `notification_url` (webhook)
y el `auto_return`. En local se usa un túnel efímero:

```bash
cloudflared tunnel --url http://localhost:3000
```

Copia la URL `https://<algo>.trycloudflare.com` que imprime. Es **efímera**:
cambia cada vez que reinicias el túnel.

## 2. Configurar el entorno y el webhook

En `.env.local`:

```bash
MP_PUBLIC_BASE_URL=https://<algo>.trycloudflare.com
```

Reinicia `pnpm dev` para que tome la variable.

En el panel de Mercado Pago (**Tus integraciones → tu aplicación → Webhooks**):

- **URL:** `https://<algo>.trycloudflare.com/api/webhooks/mercadopago`
- **Evento:** **"Pagos"** (topic `payment`) — NO "Órdenes/Order", que tiene otra
  estructura que el código no parsea.
- Copia el **secreto de firma** del webhook a `MP_WEBHOOK_SECRET` en `.env.local`
  (reinicia `pnpm dev`).

## 3. Pagar con tarjetas de prueba

Inicia un checkout desde `/pricing` o el editor (publicar con un plan de pago).
En el checkout de MP usa una **tarjeta de prueba**:

| Marca | Número | CVV | Vencimiento |
|---|---|---|---|
| Mastercard | 5474 9254 3267 0366 | 123 | cualquiera futura |
| Visa | 4075 5957 1648 3764 | 123 | cualquiera futura |

El **estado** se fuerza con el **nombre del titular**:

| Nombre titular | Resultado |
|---|---|
| `APRO` | Aprobado |
| `OTHE` | Rechazado (error general) |
| `CONT` | Pendiente |

Usa cualquier email de prueba y `123456` como documento si lo pide.

## 4. Verificar el resultado

Tras pagar, el webhook llega al túnel y el fulfillment aplica el estado. Verifica
en Supabase (SQL Editor) — sustituye el email/tu invitación según el caso:

```sql
-- Última orden y su estado
select id, product_type, status, amount, provider_payment_id, created_at
from public.orders order by created_at desc limit 5;

-- Entitlement de la invitación pagada
select invitation_id, status, expires_at
from public.invitation_entitlements order by updated_at desc limit 5;
```

Esperado por caso:

- **APRO** → orden `paid`, entitlement `active` con `expires_at` según el plan
  (`resolveExpiry`: evento + margen, o fallback). La invitación pública se ve.
- **OTHE** → orden `failed`, sin entitlement. La pública no se publica.
- **CONT** → orden `pending`, sin entitlement todavía.

## 5. Verificar crédito de referido (si aplica)

Si quien pagó **aplicó un código de referido** antes (en `/dashboard/referrals`):

```sql
select status, credit_amount, qualifying_order_id
from public.referrals order by updated_at desc limit 5;

select user_id, amount, referral_id, created_at
from public.referral_credits order by created_at desc limit 5;
```

Esperado tras un pago **APRO**: el `referral` pasa a `credited` con
`credit_amount` = `NEXT_PUBLIC_REFERRAL_CREDIT_MXN` (default 50) y hay una fila en
`referral_credits` para el referente. El saldo aparece en su panel de referidos.

## 6. Verificar expiración (gate público `0007`)

Fuerza una expiración y confirma que la invitación pública se oculta:

```sql
update public.invitation_entitlements
set expires_at = now() - interval '1 day'
where invitation_id = '<ID>';
```

Visita `/public/<username>/<slug>` → debe dar 404 (la RPC
`get_public_invitation` exige `is_entitlement_active`). Revierte subiendo
`expires_at` a futuro.

## 7. Verificar idempotencia

En el panel de MP, reenvía la notificación del pago (o espera un reintento). El
webhook **no** debe duplicar la orden ni el crédito:

- `orders`: sigue una sola fila `paid` (índice único
  `orders_provider_payment_unique`).
- `referral_credits`: sigue una sola fila para ese `referral_id` (índice único
  `referral_credits_referral_unique`).

---

## Notas

- Sin túnel, el checkout **redirige** a MP pero el webhook no llega a `localhost`
  y no se activa nada (el fulfillment solo ocurre server-side por webhook).
- Confirma que tus credenciales son de **prueba** con `GET /users/me` (debe ser
  `test_user…`). Ver el checklist de pagos reales para pasar a producción.
