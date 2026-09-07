# Resend (SMTP propio) para los correos de Supabase

Objetivo: reemplazar el SMTP **compartido** de Supabase (bloquea la edición de
plantillas, límite ~3–4 correos/hora **para todo el proyecto**, cae en spam) por
**Resend** con dominio propio `sobrely.com`, para:

1. **Desbloquear** la edición de plantillas de correo de auth (Subject/Body).
2. Enviar desde `noreply@sobrely.com` con SPF/DKIM/DMARC → **no cae en spam**.
3. Marca Sobrely en confirmación de registro, reset de contraseña y magic link.

> Resend: 3,000 correos/mes y 100/día gratis. Suficiente para el volumen actual.

---

## Estado verificado al 2026-09-07

Este doc se escribió el 2026-08-24 describiendo el trabajo COMPLETO. Al
retomarlo se verificó contra la realidad viva (`dig` al DNS, lectura del código,
`curl` a producción) y **buena parte ya está hecha**. Lo que queda es menos de lo
que el doc sugiere.

| Paso | Estado | Cómo se verificó |
|---|---|---|
| 1. Cuenta + dominio en Resend | ✅ **hecho** (implícito) | los registros DKIM existen y sólo Resend los genera |
| 2. Registros DNS en Vercel | ✅ **hecho** | `dig` — los 4 resuelven, ver abajo |
| 3. Verificar dominio en Resend | ⚠️ **por confirmar en el panel** | el DNS está publicado; falta ver el "Verified" verde |
| 4. Crear la API Key | ❓ **tú sabes** | no es observable desde fuera |
| 5. Custom SMTP en Supabase | ❓ **por confirmar** | hay una lectura decisiva, ver Paso 5 |
| 6. Pegar las plantillas | ⬜ **pendiente** | los 3 HTML están listos en `email-templates/` |
| 7. Probar de punta a punta | ⬜ **pendiente** | ojo con la cuota, ver Paso 7 |
| — Código de la app | ✅ **listo, sin cambios** | ver "El lado del código" |

### El DNS ya está publicado y resolviendo

Salida real de `dig` el 2026-09-07:

```
MX   send.sobrely.com        10 feedback-smtp.us-east-1.amazonses.com.
TXT  send.sobrely.com        "v=spf1 include:amazonses.com ~all"
TXT  resend._domainkey       "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC/xfkoETX9FSm5sMFg+qDiRPdY..."
TXT  _dmarc.sobrely.com      "v=DMARC1; p=none; rua=mailto:contacto@sobrely.com; fo=1"
```

**No hay conflicto con Google Workspace.** La raíz mantiene su correo entrante
(`MX 1 smtp.google.com`) y su `v=spf1 include:_spf.google.com ~all`; Resend firma
sobre el subdominio `send`, que es otro nombre. Los dos SPF coexisten porque
están en hosts distintos — lo que rompe es tener DOS `v=spf1` en el MISMO host, y
eso no pasa aquí.

El DMARC además quedó mejor que la forma sugerida más abajo: trae `rua` y `fo=1`,
así que los reportes de autenticación llegan a `contacto@sobrely.com`.

**Conclusión: no vuelvas a tocar el DNS.** Salta directo al Paso 3.

### El lado del código: listo, y no necesita cambios

- Las plantillas apuntan a `https://sobrely.com/auth/confirm?token_hash=...`, y
  eso lo resuelve **`src/app/auth/confirm/page.tsx` + `actions.ts`** — NO un
  `route.ts` como decía este doc antes. La diferencia es deliberada y vale
  conservarla: la verificación corre en un **form POST**, no en el GET, para que
  los escáneres de correo que pre-cargan la URL no consuman el token de un solo
  uso.
- El contrato plantilla ↔ página cuadra: los tres `type` que emiten las
  plantillas (`signup`, `recovery`, `magiclink`) están en el `LABEL` de la
  página, y los dos `next` (`/dashboard`, `/reset-password`) existen y pasan la
  validación `startsWith("/")` de `actions.ts`.
- **Pegar las plantillas no rompe el flujo actual ni impone un orden.** Hoy
  `signUp` y `resetPasswordForEmail` mandan `emailRedirectTo` a
  `/auth/callback`, que es lo que usa la plantilla default de Supabase vía
  `{{ .ConfirmationURL }}`. Las plantillas nuevas usan `{{ .TokenHash }}` y se
  van por `/auth/confirm`. **Las dos rutas existen y funcionan**, así que el
  cambio es reversible: si despegas una plantilla, el flujo viejo sigue vivo.
- Producción ya sirve las dos piezas: `/auth/confirm` → HTTP 200,
  `/reset-password` → HTTP 200, y el logo del correo
  `sobrely.com/sobrely-logo-horizontal.png` → HTTP 200, 31,201 bytes (idéntico al
  archivo del repo).

---

## Reparto de trabajo

Los pasos de **crear cuenta**, **DNS en Vercel** y **SMTP en Supabase** son
manuales y los haces tú (yo no puedo tocar tu DNS ni tu panel de Supabase). Aquí
está el orden exacto y qué pegar. Las plantillas ya están listas en
[`email-templates/`](./email-templates/).

**Lo que queda es de panel, y son 4 pasos:** confirmar el `Verified` en Resend
(Paso 3) · la API Key (Paso 4) · activar el Custom SMTP en Supabase (Paso 5) ·
pegar las 3 plantillas (Paso 6). Luego probar (Paso 7). **El DNS y el código ya
están; no hay nada que programar.**

---

## Paso 1 — Crear cuenta y agregar el dominio en Resend · ✅ HECHO

> Los registros DKIM de `sobrely.com` están publicados y sólo Resend los genera,
> así que la cuenta y el dominio ya existen. Se deja el detalle por si hay que
> rehacerlo.

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

## Paso 2 — Pegar los registros DNS en Vercel · ✅ HECHO

> Verificado con `dig` el 2026-09-07: los 4 registros resuelven. **No lo repitas.**
> El detalle queda como referencia.

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

## Paso 3 — Verificar el dominio en Resend · ⚠️ EMPIEZA AQUÍ

El DNS ya está publicado; lo único que falta es confirmar que Resend lo dé por
bueno.

1. Resend → **Domains → sobrely.com**.
2. **Lo que tienes que ver: el estado en `Verified` (verde).** Si ya lo está, no
   toques nada y sigue al Paso 4.
3. Si aparece `Pending`, dale **Verify / Check DNS Records** — el DNS lleva
   semanas publicado, así que debería pasar de inmediato.

> Si falla algún registro **no vuelvas a crearlo**: ya existe y lo verificamos.
> Sería un desajuste de valor, no una ausencia. Compara el valor del panel
> contra la salida de `dig` de arriba y dime cuál difiere.

---

## Paso 4 — Crear la API Key (será la contraseña SMTP)

1. Resend → **API Keys → Create API Key**.
2. Nombre: `supabase-smtp`. Permiso: **Sending access** (con eso basta).
3. **Copia la key** (empieza con `re_...`). **Solo se muestra una vez.**
   - Esta key es la **contraseña** del SMTP en el paso 5. **No** la subas al repo
     ni la pegues en el chat; guárdala en tu gestor de contraseñas.

---

## Paso 5 — Configurar el SMTP en Supabase

### Antes: la lectura decisiva de si esto ya está hecho

No se puede saber desde fuera si el Custom SMTP está activo, pero hay un **read
gratis, sin mandar ningún correo**:

> Abre Supabase → **Authentication → Emails → Templates** e intenta editar
> cualquier plantilla. Con el SMTP **compartido**, Supabase **bloquea** la
> edición. **Si puedes escribir en el cuerpo, el Custom SMTP ya está activo** y
> puedes saltar al Paso 6.

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
  que el enlace visible sea `sobrely.com`. Lo resuelve
  **`src/app/auth/confirm/page.tsx`** con la server action de
  `actions.ts` — es una **página con form POST**, no un route handler de GET, y
  eso es a propósito: así un escáner de correo que pre-carga la URL no consume el
  token de un solo uso. **No cambies el `token_hash`, el `type` ni el `next`** de
  cada plantilla: son exactamente los tres parámetros que la página lee.
- El logo se carga desde `https://sobrely.com/sobrely-logo-horizontal.png` (ya
  está en producción; el correo lo trae de ahí).
- **Guarda cada plantilla.**

---

## Paso 7 — Probar de punta a punta

### Dos cosas que hay que saber antes de mandar el primer correo

**(a) La prueba se hace en PRODUCCIÓN, no en localhost.** Las plantillas traen
`https://sobrely.com` **escrito duro** en el `href`. El correo va a apuntar a
producción aunque lo dispares desde `localhost:3000`, así que el botón del correo
te llevará al sitio publicado. Regístrate en <https://sobrely.com/register>, no
en local. (Producción ya sirve `/auth/confirm` y `/reset-password` — verificado.)

**(b) Mientras siga el SMTP compartido, cada correo de prueba le quita el suyo a
un usuario real.** El límite compartido es de ~3–4 correos/hora **para todo el
proyecto**, y es la misma cuota de la que sale la confirmación de registro de
cualquiera que se dé de alta. El 2026-09-07 entraron **dos usuarias nuevas en un
día**, así que quemar la cuota probando puede dejar a una sin su correo de
confirmación — y ese fallo es silencioso: no se queja, se va.

> Por eso **estas pruebas van DESPUÉS de activar el Custom SMTP**, nunca antes.
> Con Resend el techo es 100/día y la cuota deja de ser un problema.

### Las pruebas

1. **Confirm signup**: registra una cuenta con un correo real tuyo en
   <https://sobrely.com/register>.
2. **Reset Password**: en <https://sobrely.com/forgot-password> pide el reset →
   llega el correo, el botón lleva a `/reset-password` y puedes cambiar la
   contraseña.

### El veredicto: qué mirar para saber que de verdad funcionó

Que llegue el correo **no** prueba que salió por Resend — el SMTP compartido
también entrega. Los dos chequeos que sí lo prueban:

1. **El remitente.** Tiene que decir `Sobrely <noreply@sobrely.com>`. Si dice
   `noreply@mail.app.supabase.io` (o similar), el Custom SMTP **no** está activo
   y estás viendo el flujo viejo.
2. **La autenticación.** En Gmail: abre el correo → menú de los tres puntos →
   **Mostrar original**. Busca `DKIM: 'PASS'` y `SPF: 'PASS'` con dominio
   `sobrely.com`. Eso es lo que decide que no caiga en spam, y es el único
   chequeo que prueba que el DNS que verificamos está haciendo su trabajo.
3. Y de refuerzo: **Resend → Emails** debe listar los dos como **Delivered**. Si
   ahí no aparece nada, no pasaron por Resend.

> Si un correo **no llega**: revisa Resend → Emails (¿bounced/blocked?),
> confirma que el dominio siga **Verified**, y que en Supabase el SMTP esté
> **enabled** con la API Key correcta.

> Si el botón del correo da "Enlace inválido": es la página haciendo su trabajo
> —falta `token_hash` o `type`— y casi siempre significa que la plantilla se
> pegó con los parámetros alterados. Compárala contra el archivo de
> `email-templates/`.

---

## Notas / gotchas

- **DKIM/SPF importan para no caer en spam.** No omitas esos TXT; sin ellos
  Gmail/Outlook marcan el correo como no autenticado. (Ya están puestos y
  resolviendo — verificado el 2026-09-07.)
- **No pruebes el SMTP desde tu laptop.** Quien se conecta a
  `smtp.resend.com:465` son los servidores de Supabase, no tu máquina. Muchas
  redes domésticas y de oficina bloquean los puertos 465/587 de salida (en esta
  máquina los dos salen bloqueados), y eso **no dice nada** sobre si la
  configuración funciona. El único veredicto válido es el del Paso 7.
- **La API Key es un secreto** (equivale a poder enviar como tu dominio). Si se
  filtra, revócala en Resend y crea otra.
- **`contacto@sobrely.com`**: las plantillas y las páginas legales (`/privacidad`,
  `/terminos`) referencian este buzón. Existe como cuenta real de Google
  Workspace, así que **sí recibe** correo entrante (Resend solo envía).
- **Sender vs Reply-To**: Supabase envía desde `noreply@sobrely.com`. Si quieres
  que las respuestas vayan al buzón de contacto, eso no se configura en Supabase
  SMTP; se resuelve con un forwarding de `noreply@` → `contacto@`, o dejando claro
  en el cuerpo el correo de contacto (ya está en el footer de las plantillas).
