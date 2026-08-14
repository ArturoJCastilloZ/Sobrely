# Estudio de diseño — Invitados personalizados con QR

> Estudio, **sin código todavía**. Fuentes ancladas: el modelo actual sale del schema
> (`supabase/migrations/`), y el del competidor se verificó **en vivo** navegando la
> invitación de referencia de `invitio.events` (renderizada, no de memoria).

## 1. Modelo actual de Sobrely — RSVP abierto (verificado en código)

- `invitations` = 1 por evento (slug, `is_published`, `theme_config`).
- La pública `/public/[username]/[slug]` muestra un **form abierto**: cualquiera con el
  link llena `rsvp_responses` (`guest_name`, `guest_email`, `attendance_status`,
  `guest_count`, `message`).
- **No existen invitados pre-registrados, ni token/QR por invitado, ni check-in.**
- El tope de cupo vive en `invitation_entitlements.guest_limit` y se valida server-side
  en `canAddGuest` (suma de `guest_count` de todas las respuestas).

## 2. Modelo del competidor (invitio.events — verificado en vivo)

Una invitación es **para una persona específica**. Al final de la invitación, tras
confirmar, aparece:

- Estado **"Asistencia confirmada — ¡Gracias por confirmar!"**
- Invitado nombrado (**"Mara González"**) + cupo asignado (**"2 adultos"**)
- Acciones: **Cancelar asistencia** · **Confirmar para menos invitados**
- **QR "Muestra este QR en la entrada"** + **Descargar pase** + tarjeta **"PASE DE ACCESO"**
  (nombre + nº de invitados + QR)
- En el DOM: referencias a **Apple/Google Wallet** y **añadir a calendario**.

**Diferencia clave:** el organizador **genera N invitaciones personalizadas** (un
registro por invitado, cada uno con su cupo), y cada invitado recibe un **link único +
QR** para control de acceso en la puerta. Es un modelo cerrado y nominal, opuesto al
RSVP abierto actual.

## 3. Propuesta para Sobrely

Los dos modelos **coexisten**: un toggle por invitación (`rsvp_mode`) elige
**Abierto** (el de hoy) o **Lista de invitados** (nuevo). No se rompe nada existente.

### 3.1 Modelo de datos (nuevo)

Tabla `invitation_guests`:

| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid pk | |
| `invitation_id` | uuid fk → invitations | on delete cascade |
| `name` | text | nombre del invitado (p.ej. "Mara González") |
| `max_guests` | int | cupo asignado (los "2 adultos") |
| `access_token` | text unique | aleatorio, ≥32 chars, **no adivinable** → link/QR |
| `status` | text | `pending` / `confirmed` / `declined` |
| `confirmed_count` | int null | cupo que sí confirmó (≤ `max_guests`) |
| `checked_in_at` | timestamptz null | sello de check-in en la puerta |
| `created_at` / `updated_at` | timestamptz | |

- **Link personalizado:** `/g/[access_token]` (o `/public/.../[token]`). El token es la
  credencial: RLS deja leer/escribir SOLO por token vía RPC server-side, nunca listar.
- **QR:** codifica el link del invitado (o un token de check-in). Generado con **lib
  local** (p.ej. `qrcode`), cero llamadas externas → respeta soberanía de datos.
- **Escritura anónima** (el invitado confirma sin login) igual que el RSVP abierto hoy:
  vía RPC `security definer` que valida el token, no acceso directo a la tabla.

### 3.2 Flujos

1. **Organizador (dashboard):** modo "Lista de invitados" → CRUD de invitados (alta 1×1
   o carga masiva CSV), cada uno con nombre + cupo. Ve estado (pendiente/confirmado/
   declinado) y genera/descarga los links/QR.
2. **Invitado (link único):** ve la invitación **con su nombre y cupo**; acciones
   Confirmar / Confirmar para menos / Cancelar; tras confirmar ve su **QR / pase**.
3. **Puerta (check-in):** vista de escáner para el organizador → escanea el QR → marca
   `checked_in_at`; muestra nombre y cupo, y evita doble entrada.

### 3.3 Encaje con planes / gating (dominio de pago — revisar)

- Es claramente **Premium**. Nueva feature flag en `plans.ts`/`types.ts` (p.ej.
  `guest_management`), gateada server-side igual que `custom_art` en
  `canPublishInvitation` / al activar el modo lista.
- El **tope de invitados** se reusa desde `entitlements.guest_limit` (ya existe): la
  suma de `max_guests` no puede exceder el límite del plan.

## 4. Fases sugeridas (para aprobar por separado)

- **P1 — Núcleo:** migración `invitation_guests` + RLS/RPC por token + toggle de modo +
  CRUD en dashboard + página por invitado (confirmar / menos / cancelar). Sin QR aún.
- **P2 — Acceso:** QR local (sin externos) + descargar pase (PNG/PDF local) + vista de
  check-in/escáner para el organizador.
- **P3 — Opcional/pesado:** **Añadir a calendario** (`.ics` es local y fácil) y
  **wallet passes** (Apple `.pkpass` requiere certificado de Apple; Google Wallet
  requiere issuer + llamadas externas → **rompe el "cero phone-home"**; evaluar aparte
  si vale el tradeoff de soberanía).

## 5. Riesgos / decisiones abiertas

- **Soberanía vs wallet:** los pases de Apple/Google exigen servicios externos. El QR +
  pase descargable local cubren el 90% del valor sin exfiltración. Recomendación:
  hacer P1+P2 locales; wallet solo si el negocio lo pide, marcándolo como excepción.
- **Token en URL:** el link ES la credencial (como hoy el RSVP). Debe ser largo,
  aleatorio y no listable; nunca meter PII en el query string.
- **Gating de dinero:** toca dominio crítico → revisión + secaudit antes de publicar.
- **Migración de datos:** los dos modos conviven; una invitación en modo abierto no se
  ve afectada. Definir qué pasa si se cambia de modo con respuestas ya cargadas.
