# Resend (SMTP propio) para los correos de Supabase

Objetivo: reemplazar el SMTP **compartido** de Supabase (bloquea la edición de
plantillas, límite ~3–4 correos/hora, cae en spam) por **Resend** con dominio
propio `sobrely.com`, para:

1. **Desbloquear** la edición de plantillas de correo de auth (Subject/Body).
2. Enviar desde `noreply@sobrely.com` con SPF/DKIM/DMARC → **no cae en spam**.
3. Marca Sobrely en confirmación de registro, reset de contraseña y magic link.

> Resend: 3,000 correos/mes y 100/día gratis. Suficiente para el volumen actual.

---

## Reparto de trabajo

Los pasos de **crear cuenta**, **DNS en Vercel** y **SMTP en Supabase** son
manuales y los haces tú (yo no puedo tocar tu DNS ni tu panel de Supabase). Aquí
está el orden exacto y qué pegar. Las plantillas ya están listas en
[`email-templates/`](./email-templates/).

---

## Paso 1 — Crear cuenta y agregar el dominio en Resend

1. Entra a <https://resend.com> y crea una cuenta (puedes usar el login con Google).
2. En el panel: **Domains → Add Domain** → escribe `sobrely.com`.
3. Elige la región (por cercanía a MX, cualquiera funciona; `us-east-1` está bien).
4. Resend te mostrará **una lista de registros DNS** que debes crear. Son
   **específicos de tu dominio** (el selector DKIM se genera por dominio), así que
   **cópialos del panel de Resend** — los de abajo son solo la forma que tienen.

### Registros que Resend te va a pedir (formas típicas)

| Tipo | Nombre / Host | Valor (ejemplo — usa el que te dé Resend) |
|---|---|---|
| `MX` | `send` (→ `send.sobrely.com`) | `feedback-smtp.us-east-1.amazonses.com` (prioridad 10) |
| `TXT` | `send` (→ `send.sobrely.com`) | `v=spf1 include:amazonses.com ~all` (SPF) |
| `TXT` | `resend._domainkey` | `p=MIGfMA0G...` (clave pública DKIM, cadena larga) |
| `TXT` | `_dmarc` *(opcional pero recomendado)* | `v=DMARC1; p=none;` |

> ⚠️ El registro **DKIM** (`resend._domainkey`) es una cadena larga: cópiala
> completa, sin espacios ni saltos de línea de más.

---

## Paso 2 — Pegar los registros DNS en Vercel

`sobrely.com` tiene el DNS gestionado por **Vercel** (ahí verificaste el dominio).

1. Vercel → tu cuenta → **Domains** → `sobrely.com` → pestaña **DNS Records**
   (o **Project → Settings → Domains** si lo gestionas desde el proyecto).
2. Por cada registro de Resend, **Add**:
   - **Type**: `MX` / `TXT` según corresponda.
   - **Name**: el host que da Resend (p.ej. `send`, `resend._domainkey`, `_dmarc`).
     - En Vercel el **Name** es relativo al dominio: pon `send`, **no**
       `send.sobrely.com`.
   - **Value**: el valor exacto de Resend.
   - **MX** lleva además **Priority** (p.ej. `10`).
3. Guarda todos.

> DNS puede tardar de minutos a ~1 hora en propagar. Vercel suele ser rápido.

---

## Paso 3 — Verificar el dominio en Resend

1. Vuelve a Resend → **Domains → sobrely.com → Verify** (o **Check DNS Records**).
2. Cuando todos los registros aparezcan **Verified/green**, el dominio está listo.
   Si alguno falla, revisa que el **Name** en Vercel no lleve `.sobrely.com`
   duplicado (Vercel ya lo agrega).

---

## Paso 4 — Crear la API Key (será la contraseña SMTP)

1. Resend → **API Keys → Create API Key**.
2. Nombre: `supabase-smtp`. Permiso: **Sending access** (con eso basta).
3. **Copia la key** (empieza con `re_...`). **Solo se muestra una vez.**
   - Esta key es la **contraseña** del SMTP en el paso 5. **No** la subas al repo
     ni la pegues en el chat; guárdala en tu gestor de contraseñas.

---

## Paso 5 — Configurar el SMTP en Supabase

Supabase → **Project → Authentication → Emails → SMTP Settings** (a veces bajo
**Settings → Auth → SMTP**). Activa **Enable Custom SMTP** y pon:

| Campo | Valor |
|---|---|
| **Sender email** | `noreply@sobrely.com` |
| **Sender name** | `Sobrely` |
| **Host** | `smtp.resend.com` |
| **Port** | `465` |
| **Username** | `resend` |
| **Password** | tu **API Key** de Resend (`re_...`) |
| **Minimum interval between emails** | déjalo en el default (o `60s`) |

> El **Username es literalmente `resend`** (no un correo). La **Password es la API
> Key**. Puerto `465` (SSL). Si `465` diera problemas de conexión, prueba `587`
> (STARTTLS).

Guarda. En cuanto el SMTP quede activo, **se desbloquean las plantillas**.

---

## Paso 6 — Pegar las plantillas brandeadas

Supabase → **Authentication → Emails → Templates**. Para cada plantilla, pega el
**Subject** sugerido y el **Message body** (HTML) del archivo correspondiente:

| Plantilla en Supabase | Archivo | Asunto sugerido |
|---|---|---|
| **Confirm signup** | [`email-templates/confirm-signup.html`](./email-templates/confirm-signup.html) | `Confirma tu cuenta en Sobrely` |
| **Reset Password** | [`email-templates/reset-password.html`](./email-templates/reset-password.html) | `Restablece tu contraseña de Sobrely` |
| **Magic Link** | [`email-templates/magic-link.html`](./email-templates/magic-link.html) | `Tu enlace de acceso a Sobrely` |

- Las plantillas usan `{{ .TokenHash }}` y apuntan a **nuestro** dominio
  (`https://sobrely.com/auth/confirm?...`) en vez del endpoint de Supabase, para
  que el enlace visible sea `sobrely.com` (lo resuelve el route handler
  `src/app/auth/confirm/route.ts`). No cambies el `token_hash`, el `type` ni el
  `next` de cada plantilla.
- El logo se carga desde `https://sobrely.com/sobrely-logo-horizontal.png` (ya
  está en producción; el correo lo trae de ahí).
- **Guarda cada plantilla.**

---

## Paso 7 — Probar de punta a punta

1. **Confirm signup**: registra una cuenta nueva con un correo real tuyo →
   verifica que llega desde `Sobrely <noreply@sobrely.com>`, **no** cae en spam,
   se ve el logo y el botón confirma la cuenta.
2. **Reset Password**: en `/forgot-password` pide el reset → llega el correo, el
   botón lleva a `/reset-password` y puedes cambiar la contraseña.
3. Revisa en **Resend → Emails** que aparezcan como **Delivered**.

> Si un correo **no llega**: revisa Resend → Emails (¿bounced/blocked?),
> confirma que el dominio siga **Verified**, y que en Supabase el SMTP esté
> **enabled** con la API Key correcta.

---

## Notas / gotchas

- **DKIM/SPF importan para no caer en spam.** No omitas esos TXT; sin ellos
  Gmail/Outlook marcan el correo como no autenticado.
- **La API Key es un secreto** (equivale a poder enviar como tu dominio). Si se
  filtra, revócala en Resend y crea otra.
- **`contacto@sobrely.com`**: las plantillas y las páginas legales (`/privacidad`,
  `/terminos`) referencian este buzón. Existe como cuenta real de Google
  Workspace, así que **sí recibe** correo entrante (Resend solo envía).
- **Sender vs Reply-To**: Supabase envía desde `noreply@sobrely.com`. Si quieres
  que las respuestas vayan al buzón de contacto, eso no se configura en Supabase
  SMTP; se resuelve con un forwarding de `noreply@` → `contacto@`, o dejando claro
  en el cuerpo el correo de contacto (ya está en el footer de las plantillas).
