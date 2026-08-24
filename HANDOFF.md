# Sobrely — Handoff de sesión

> Documento de traspaso. Registra lo hecho, lo pendiente y lo que sigue.
> No es memoria del agente ni se guarda en ningún brain — vive en el repo.

---

# Sesión 2026-08-14 — Invitados personalizados con QR (lista de invitados)

> **LO MÁS RECIENTE.** Todo en la rama **`skarlette/feature-responsive-web-themes`**
> (encima del trabajo responsive/temas). `main` INTACTO. Commits `1a5c741` (P1),
> `2cdb63f` (P2), `70c17ad` (fix contraste), `5956873` (P3). Calidad al cierre:
> `tsc`/`lint`/`build` limpios, **71/71 tests**. NO probado contra BD real ni con
> cámara — requiere aplicar migración y probar en el entorno del dev.

## Qué se construyó — un segundo modo de RSVP: "Lista de invitados"

Modelo nuevo junto al RSVP abierto de siempre. Cada invitación tiene `rsvp_mode`
(`open` = form público de siempre | `guest_list` = invitados nominales). El
organizador crea una lista; cada invitado tiene un `access_token` no adivinable
que ES su credencial: deriva su link único (`/g/<token>`) y su QR.

### P1 — Núcleo (commit `1a5c741`)
- **Migración `0011_invitation_guests.sql`:** columna `rsvp_mode` (+check) en
  `invitations`; tabla `invitation_guests` (id, invitation_id, name, max_guests,
  access_token unique [default `encode(gen_random_bytes(24),'hex')`], status
  [pending/confirmed/declined], confirmed_count, checked_in_at). RLS: **solo el
  dueño** gestiona; el anónimo NO tiene política (denegado). **2 RPCs SECURITY
  DEFINER** acotadas por token: `get_guest_invitation` (solo publicadas en modo
  lista) y `respond_guest` (confirmar/declinar, clamp al cupo).
- **El modo se elige al CREAR** la invitación (menú en "+ Nueva invitación"). En
  modo lista se **auto-agrega el módulo RSVP** con `allowGuestCount:false`.
- **Página del invitado** `/g/[token]` (`noindex`): renderiza la invitación con
  su nombre + cupo; reemplaza el RSVP abierto por **Confirmar / No podré asistir**
  (cupo fijo, decisión del dev; sin selector de cantidad ni re-edición).
- **Gestión** en el editor (pestaña **Invitados**, aparece en modo lista) y en
  **Respuestas**: agregar 1×1 o masivo ("Nombre, cupo" por línea), editar,
  eliminar, copiar enlace. `GuestManager` se auto-carga vía `listGuests`.
- **Gating de plan:** el modo lista está en **TODOS los planes**; lo que cambia
  es el número de invitados = `maxGuests` del plan efectivo (Free 25, Esencial
  100, Celebración 250, Premium 500), enforced server-side al crear/editar en
  `src/lib/guests/actions.ts`. `guest_management` es feature en los 4 planes.

### P2 — QR + pase + check-in (commit `2cdb63f`)
- **Pase con QR** en la página del invitado al confirmar (`GuestPass`): QR local
  (`qrcode`) que codifica su link; **"Descargar pase"** compone una tarjeta PNG
  en canvas. Cero llamadas externas.
- **Check-in:** escáner de cámara en `/dashboard/invitations/[id]/checkin`
  (`html5-qrcode`, decodifica local) + **marcado manual** ("Marcar ingreso"/
  "Deshacer") desde la lista. Acciones `checkInByToken` (dueño, RLS, idempotente)
  y `setGuestCheckIn`. **Sin migración nueva:** reusa `checked_in_at`.
- **Deps nuevas (OSS-selfhost ✓):** `qrcode` (MIT), `html5-qrcode` (Apache-2.0),
  `@types/qrcode`. Ambas puras cliente, sin phone-home.

### P3 — Añadir a calendario (commit `5956873`)
- Botón **"Añadir a calendario"** en el pase: genera un **`.ics` local** (Apple/
  Google/Outlook) con título, fecha y ubicación (del módulo mapa). Builder
  `src/lib/calendar/ics.ts` puro y testeado. Cero llamadas externas.

## Cómo probar
1. Aplicar `supabase/migrations/0011_invitation_guests.sql`.
2. Dashboard → **+ Nueva invitación → Lista de invitados** → pestaña Invitados →
   agregar "Mara, 2" → copiar enlace. **Publicar**.
3. Abrir `/g/<token>` en incógnito → **Confirmar** → aparece el pase con QR +
   "Descargar pase" + "Añadir a calendario".
4. Dashboard → Invitados → **Escanear en la puerta →** (cámara) o "Marcar
   ingreso" manual.

## Pendiente / riesgos
- **Wallet passes Apple/Google:** NO hechos. Requieren certificado de Apple /
  issuer de Google + **llamadas externas** → rompen "cero phone-home". Recomendado
  NO hacerlo salvo que el negocio lo pida (QR + pase + `.ics` ya cubren el valor).
- **Dominio de dinero:** el gating por plan toca facturación → pasar secaudit +
  revisión antes de tu merge a `main`.
- **Env vars:** ninguna nueva (el link usa `NEXT_PUBLIC_SITE_URL`, ya existente).
- La cámara del check-in requiere HTTPS (localhost sirve) y permiso de cámara.

---

# Sesión 2026-08-12 (tarde) — Responsive web + Claro/Oscuro + Temáticas/arte propio

> **LO MÁS RECIENTE.** TODO vive en la rama **`skarlette/feature-responsive-web-themes`**
> (el guard del repo obliga el prefijo `skarlette/*` para ramas nuevas; `feat/…` lo
> rechaza). **`main` está INTACTO, NADA pusheado.** 21 commits (`6ea9b0f`→`484926c`).
> Calidad al cierre: `tsc`/`lint`/`build` limpios, **56/56 tests (Vitest) pasan**.
> Todo verificado en navegador por **medición** (no solo screenshots).

## Qué se construyó (3 features + pulido)

### Feature A — Invitaciones responsive en web
Antes la pública estaba fijada a `max-w-[480px]` (tira móvil en desktop). Ahora:
- **Container queries** `@container/inv` scopeadas a la vista pública → el editor NO
  se afecta (sin ese contenedor, las variantes no aplican). Arquitectura clave.
- `Section` (en `modules/previews.tsx`) = banda full-width + contenido centrado.
  Escala tipográfica hasta **ultra-wide** (`@4xl`/`@5xl`): hero 72px, headings 36px,
  y **todo el texto secundario** (subtítulos, CTA, badges, etiquetas/desc del
  dresscode, botones, footer) — se corrigió en 3 pasadas porque al inicio solo
  escalaban los títulos.
- Galería (4 col), video, itinerario (2 col) usan más ancho; dresscode figuras más
  grandes; RSVP: form legible + **campos con superficie/borde de la paleta de la
  invitación** (no tokens de app) + banda con tinte propio; botones del RSVP usan
  `--inv-primary` (no `bg-primary` de app) → no se pierden con la app en oscuro.
- **Toggle Móvil/Escritorio** en el `PreviewPane` del editor (paridad real).
- **Lección aplicada:** cuando el dev señala elementos específicos, medir ESOS
  exactos, no un subconjunto "representativo".

### Feature C — Claro/oscuro (app + invitación)
- **C1 (app):** `next-themes` (ya era dep) cableado en el layout raíz + toggle
  Sol/Luna en el header del dashboard. `defaultTheme=light`, sin system (para no
  voltear invitaciones públicas). Fix de hydration mismatch en el toggle
  (`isDark` gateado con `mounted` vía `useSyncExternalStore`).
- **C2 (invitación):** campo `theme.mode` (light/dark, retro-compat). Switch
  Claro/Oscuro en el panel de Tema (ajusta fondo+texto a presets). **Blindado del
  tema de la app**: las tarjetas usan `var(--inv-card)` → una invitación clara se ve
  clara aunque el dashboard esté en oscuro, y viceversa (medido).

### Feature B — Temáticas + arte propio
- **B1:** 6 packs genéricos nuevos en `theme-packs.ts` (capibara [free], dinos,
  tropical, futbol, terracota-otono, **noche-estelar** [oscuro, estrena `mode`]).
  `ThemePackTheme.mode` opcional. Todos genéricos, **cero IP**.
- **B2 (Premium `custom_art`, feature nueva en `plans.ts`/`types.ts`):**
  - **B2.1 fondo de imagen** propio (`theme.backgroundImage {url, overlay}`),
    render en `ThemeScope` con overlay para legibilidad. Uploader + slider en el panel.
  - **B2.2 stickers colocables** (`theme.stickers[]`): **arrastrar libre**, capas
    (z-index = orden del arreglo), toolbar (escala/rotar/**redondear**/eliminar),
    barra oscura. `StickerLayer` (público) + `StickerEditorLayer` (editor).
  - **Decoración con imagen propia** (`decoration.imageUrl`): tu `.png` sin fondo
    reemplaza al emoji en las partículas flotantes.
  - Gate en `canPublishInvitation`: fondo, stickers o imagen de decoración sin plan
    Premium bloquean al publicar (mismo patrón que theme packs).

### Pulido de animaciones (a raíz de feedback)
- **Re-play automático** en el preview al cambiar animación (global o override por
  módulo) — antes no se veía cambio porque los módulos ya se habían revelado.
- **Rango de intensidad ampliado** (dist 8/30/72, antes 12/24/40) → Sutil/Moderada/
  Llamativa se distinguen claro.
- **Selector de Transición** (preset) en el panel global de animaciones (antes solo
  vía "Estilo de animación"); evita duplicado con el "Animación de entrada" por módulo.
- **Gradiente ambiental** de 16% → 34% de opacidad (antes casi invisible).
- Aclaración de modelo (por diseño): **el override de animación por módulo gana sobre
  el global**; "Aplicar a todos los módulos" limpia los overrides.

## PENDIENTE / lo que sigue
1. **Validar la rama** en el entorno del dev y, con su OK, **mergear a `main`** (ff) +
   deploy. **OJO: dominio con gating de pago** (Premium `custom_art`) → pasar el
   secaudit y revisión antes de publicar. Recordar: `secaudit_guard.py --mark` en
   comando SEPARADO del push; push vía SSH-443.
2. **(No hecho, quedó como idea a explorar) Quitar fondo de imagen de sticker**:
   versión simple local (canvas, key de color sólido) para logos/pngs con fondo
   plano — cero llamadas externas por soberanía de datos. Bg-removal de fotos reales
   = modelo IA local, feature grande aparte.
3. **⭐ NUEVA FEATURE A EXPLORAR — Invitados personalizados / registros con QR.**
   Validar/estudiar esta invitación de referencia (competidor):
   `https://invitio.events/es-MX/invitacion/19308aa3-ab9a-4678-8d8f-bba8cb8382cd/d9493ccb-39ac-4bd1-a49e-acadb027639a?v=8ebd8f87-6e44-482e-8cd4-b53909cd40cd`
   — al final la invitación es **para alguien específico** ("Mara González", "2
   adultos"), con **QR de acceso**, pases de **Apple/Google Wallet**, "Descargar pase",
   "Añadir a calendario", y acciones "Cancelar asistencia / Confirmar para menos
   invitados". Hipótesis: el organizador **genera N invitaciones personalizadas**
   (un registro/guest por invitado con su cupo), cada una con **link único + QR**
   para control de acceso en la puerta. Es un modelo distinto al RSVP abierto actual
   de Sobrely (form público). Explorar: modelo de datos (guests con token/QR),
   generación masiva, página personalizada por guest, escaneo/check-in, wallet passes.



> **LO MÁS RECIENTE.** Todo desplegado en producción (`main`, commits `f88f508`→
> `2105758`) y probado en vivo por el dev. Push vía **SSH sobre puerto 443**
> (`ssh://git@ssh.github.com:443/…`) porque el puerto 22 estaba bloqueado en la
> red del dev. **El repo se renombró en GitHub a `ArturoJCastilloZ/Sobrely`** y el
> remote local ya apunta ahí vía SSH-sobre-443
> (`ssh://git@ssh.github.com:443/ArturoJCastilloZ/Sobrely.git`) — push/pull normales
> funcionan sin redirect ni bloqueo del puerto 22.

## Resend (SMTP propio) para los correos de Supabase — ✅ HECHO
- **Por qué:** el SMTP compartido de Supabase bloquea editar plantillas, tiene
  límite bajo y cae en spam. Se migró a **Resend** (3,000/mes gratis) con dominio
  propio → correos salen de `noreply@sobrely.com`.
- **Config (la hizo el dev, guía en `docs/resend-smtp.md`):** dominio verificado en
  Resend (SPF+DKIM en Vercel DNS), API Key como password SMTP en Supabase
  (`smtp.resend.com:465`, user `resend`), Sender `noreply@sobrely.com`.
  - Gotcha: el **Sender** NO necesita ser buzón real; solo el **dominio** debe estar
    verificado en Resend. El correo del footer/legales SÍ necesita buzón real
    (Resend no recibe correo entrante) — **resuelto**: es `contacto@sobrely.com`,
    cuenta de Google Workspace.
- **Plantillas brandeadas** en `docs/email-templates/` (`confirm-signup`,
  `reset-password`, `magic-link`), email-safe (tablas + inline), logo desde
  `https://sobrely.com/sobrely-logo-horizontal.png`. Pegar en Supabase → Auth →
  Emails → Templates.

## DMARC (anti-spam) — ✅ HECHO
- Faltaba el registro DMARC → Gmail/Yahoo mandaban a spam (SPF+DKIM ya estaban).
  Se agregó TXT `_dmarc` = `v=DMARC1; p=none;` en Vercel.
- **Gotcha:** el dev lo pegó duplicado (`v=DMARC1; p=none;v=DMARC1; p=none;`) →
  inválido; se corrigió a uno solo. (Medido con `dig +short TXT _dmarc.sobrely.com`.)

## Confirmación de correo en dominio propio (`/auth/confirm`) — ✅ HECHO y PROBADO
- **Objetivo:** que el enlace de los correos de auth se vea en `sobrely.com`, no en
  `<project>.supabase.co`. Se eligió la vía gratis (token_hash + ruta propia) sobre
  el Supabase Custom Domain (de pago).
- **Ruta `src/app/auth/confirm/`** (page.tsx + actions.ts). Las plantillas apuntan a
  `https://sobrely.com/auth/confirm?token_hash={{ .TokenHash }}&amp;type=…&amp;next=…`
  (signup→`/dashboard`, recovery→`/reset-password`, magiclink→`/dashboard`).
- **GOTCHA CLAVE — escáneres de correo:** la 1ª versión verificaba con `verifyOtp`
  en el **GET** de la ruta. Los escáneres de correo (Safe Links/Defender)
  **pre-visitan** el enlace y **consumen el token de un solo uso** antes del clic
  del usuario → `verifyOtp` fallaba con *"Email link is invalid or has expired"*.
  Se **midió**: un GET server-side a un token fresco SÍ funcionaba, pero el clic del
  usuario fallaba → firma del pre-fetch. **Fix:** `/auth/confirm` ahora es una
  **página con botón "Confirmar"** que verifica solo al **enviar el form (POST)**;
  los escáneres hacen GET y no envían el form → el token sobrevive. Probado en vivo
  (botón y enlace → dashboard). El GET a la ruta devuelve **200** (página), no 307.
- **Otros gotchas medidos:**
  - El token de signup es **PKCE** (prefijo `pkce_`); `verifyOtp({token_hash})` SÍ
    lo acepta (probado). El `type` correcto en el flujo token_hash puede ser `email`
    en vez de `signup` → el route/acción intenta el `type` dado y luego el
    equivalente (`signup`↔`email`); un verify fallido NO consume el token.
  - Ante fallo, la acción propaga el motivo real en `/login?error=auth&reason=…`
    (sin exponer el token) para diagnóstico.
  - Los `&` en los `href` de las plantillas van como `&amp;` (encoding HTML) para
    que ningún cliente pierda `type`/`next`.

## Fix: aviso de correo ya registrado — ✅ HECHO y PROBADO
- **Bug reportado:** registrar un correo ya existente mostraba un falso "revisa tu
  correo" y el correo nunca llegaba.
- **Causa (medida en código):** la *email enumeration protection* de Supabase hace
  que `signUp` de un correo existente **no** devuelva error (para no filtrar qué
  correos tienen cuenta); regresa `user` con `identities` vacío y no manda correo.
- **Fix** (`src/lib/auth/actions.ts`, `register`): se detecta
  `data.user.identities?.length === 0` y se avisa *"Ese correo ya está registrado.
  Inicia sesión o recupera tu contraseña."* **Decisión del dev:** mensaje **directo**
  (revela existencia) en vez del neutro — mejor UX, acepta el tradeoff de enumeración.

## PENDIENTE al cerrar
1. ~~**`soporte@sobrely.com`:** confirmar/crear buzón o forwarding real.~~
   ✅ **RESUELTO:** el buzón es `contacto@sobrely.com`, cuenta real de Google
   Workspace. Ya actualizado en /privacidad, /terminos y en los footers.
2. **Branding OAuth de Google:** sigue en revisión de Google (login ya funciona;
   cosmético). Esperar correo de Confianza y Seguridad y responder el hilo.
3. ~~Actualizar el remote git al nombre nuevo~~ ✅ HECHO (apunta a `Sobrely` vía 443).

---

## Qué es el proyecto

> **Rename (2026-08-11):** el proyecto se llamaba **InvitaFlow** y se rebautizó a
> **Sobrely** (invitaflow.com ya existía). El código/UI/README ya dicen Sobrely.
> Lo que AÚN conserva el nombre viejo (infra, no urge): la carpeta local
> `…/Personal projects/invitaflow`, la rama `feat/invitaflow-project`, la URL de
> Vercel `invitaflow-lemon.vercel.app` y el repo GitHub `ArturoJCastilloZ/invitaflow`.
> Dominio: `sobrely.com` verificado LIBRE por whois → se va a registrar y conectar
> como dominio custom.

**Sobrely**: SaaS de invitaciones digitales dinámicas, modulares y
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
| 7.3 | Deploy a Vercel (LIVE en `invitaflow-lemon.vercel.app`) | ✅ Aprobada |
| 7.4 | Post-deploy (Auth/OAuth verificado) + security headers | ✅ Aprobada |
| 7.5 | Go-live pagos reales (checklist) | 🚧 **SIGUIENTE** |

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
2. **✅ `0008` + `0009` CONFIRMADAS en el REMOTO** + **admin sembrado** (count=1).
   Ya no hay pendiente ahí.
   **⚠️ Nuevo pendiente: aplicar `0010_vanity_slugs.sql` al REMOTO** (URL
   personalizada premium; solo verificada en LOCAL). Vía SQL Editor o `db push`.
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
- `src/app/pricing/page.tsx`: fix del título (usaba `"… · Sobrely"` y el
  template raíz lo duplicaba) → ahora solo `"Planes y precios"`.
- Verificado en vivo: `/robots.txt`, `/sitemap.xml` (XML válido), `/opengraph-image`
  (image/png 92KB). `tsc`/`lint`/`build` limpios.
- Gotcha Next 16: un `title` string de página hijo se envuelve con el `template`
  del root → no incluir "· Sobrely" en los títulos de página.

## 7.2 — Analytics (hecho)
- `@vercel/analytics@2.0.1` + `<Analytics/>` (de `@vercel/analytics/next`) en el
  layout raíz. Cookieless, agregado; mide tráfico del sitio público, no datos de
  cliente ni contenido de invitaciones. **No-op en local**; solo emite en Vercel.
- ⚠️ En el deploy (7.3) hay que **activar Analytics** una vez en el panel de
  Vercel (proyecto → pestaña Analytics). Sin env vars.

## 7.3 — Deploy a Vercel (hecho) — LIVE
- **URL de producción actual:** `https://invitaflow-lemon.vercel.app`. Deploy desde
  `main` (merge de `feat/invitaflow-project`). **Se conectará `sobrely.com` como
  dominio custom** (decisión revisada tras el rename); al hacerlo hay que
  actualizar `NEXT_PUBLIC_SITE_URL`/`MP_PUBLIC_BASE_URL` + Supabase redirect +
  webhook MP al dominio nuevo.
- **Env vars en Vercel** (Production+Preview): las 14 que usa el código. Ojo:
  `NEXT_PUBLIC_*` se hornean en build → cambiarlas exige **redeploy**. NO se usa
  `NEXT_PUBLIC_MP_PUBLIC_KEY` (el código no lo referencia). `NODE_ENV` lo pone
  Vercel. MP en credenciales de **PRUEBA** (cero cobros reales).
- **Supabase Auth** (URL Configuration): Site URL = la de Vercel; Redirect URLs =
  `https://invitaflow-lemon.vercel.app/**` (wildcard, para que `/auth/callback` y
  los `redirectTo` matcheen). Google OAuth NO necesita cambios en Google Console
  (su redirect va a `…supabase.co/auth/v1/callback`, ya configurado en Fase 1).
- **Fix aplicado:** `NEXT_PUBLIC_SITE_URL` con `/` final generaba `//` en
  robots/sitemap → se normalizó (`.replace(/\/+$/,"")`) en `robots.ts` y
  `sitemap.ts`. Verificado en vivo: `/robots.txt`, `/sitemap.xml`, `/pricing`,
  `/login`, `/opengraph-image`, `/manifest.webmanifest` → todos 200 y URLs limpias.
- **Gotcha env var:** un typo en Vercel (`EXT_PUBLIC_...` sin la `N`) deja la var
  "muerta" → el código cae al default. Verificar nombres exactos.
- **Gotchas de hooks al pushear:** `secaudit_guard.py --mark` debe correr en un
  comando SEPARADO del `git push` (mismo comando no registra a tiempo); y NO se
  commitea directo en `main` (branch guard) → commit en `feat` + merge ff a `main`.
  Push a `main` dispara auto-redeploy de Vercel.

## 7.4 — Post-deploy + hardening (hecho)
- **Smoke test en prod OK** (registro, login, Google) — confirmado por el dev.
- **Sin dominio propio**: la URL de Vercel es definitiva.
- **Security headers** en `next.config.ts` (`async headers()` sobre `/:path*`):
  HSTS (2 años), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
  (camera/mic/geo off). Verificados en vivo con `curl -I`.
- **CSP completo DEFERIDO**: requiere allowlist de Supabase Storage, script de
  Vercel Analytics, redirect de MP y fuentes + pruebas; no meter sin calibrar.

## URL de invitaciones públicas (rebranding · post-Fase 7)
- **Fase A (hecha):** las públicas se movieron de `/public/<u>/<slug>` a
  `/<u>/<slug>` (ruta `app/[username]/[invitationSlug]`). Redirect 301/308 de
  `/public/...` en `next.config.ts`. Las estáticas (pricing/login/dashboard…)
  tienen prioridad sobre el dinámico; no hay edición de username (autogenerado)
  así que el riesgo de colisión con reservadas es nulo.
- **Fase B (hecha) — vanity URL premium `/<slug>` (ALIAS):** solo Premium puede
  reclamar un slug **global único** → migración `0010_vanity_slugs.sql` (tabla
  `vanity_slugs`, RLS dueño-lee, `vanity_slug_available()`,
  `get_public_invitation_by_vanity()`). `src/lib/vanity/` (validación con
  reservadas + acciones claim/release/check/state con gate Premium). Ruta
  `app/[username]/page.tsx` (1 segmento = vanity; Next NO permite dos nombres de
  slug dinámico distintos en el mismo nivel, por eso vive bajo `[username]`).
  UI `VanitySlugCard` en el editor (solo Premium publicado). `/<usuario>/<slug>`
  sigue funcionando (es alias). **Falta aplicar `0010` al remoto.**

## Temas temáticos (MVP) — SIGUIENTE bloque (planeado, NO implementado)
- **Origen:** exploración hecha por un agente en background (chip). Docs traídos al
  repo: `docs/temas-tematicos-exploracion.md` (contexto + análisis legal + catálogo
  de 20 temas) y `docs/temas-tematicos-plan-mvp.md` (plan por fases). **Plan
  revisado y aprobado** por el dev; supuestos verificados contra el código.
- **Alcance MVP:** aplicar un "theme pack" a una invitación existente con **1 clic**
  desde el tab "Tema" del editor. Reusa `applyStylePreset`, `saveEditor`,
  `updateTheme` y el gate premium (patrón commit `c33390e`). Fases:
  1. `src/lib/theme/theme-packs.ts` (catálogo tipado + `applyThemePack()` puro) + tests.
  2. `themeSchema.themePack: z.string().optional()` (retro-compat, como `stylePreset`).
  3. Gate: `minimalPlanForFeature('advanced_personalization')` (Celebración+); sumar
     el themePack premium al enforcement de `canPublishInvitation`.
  4. UI `theme-pack-picker.tsx` dentro de `theme-panel.tsx`.
- **Decisiones tomadas:** gate = **Celebración+** (`advanced_personalization`);
  **fondos de imagen = V2** (MVP solo paleta/fuente/decoración/animación).
- **LEGAL (duro):** cero IP de terceros. Nada de "tema Spiderman/anime/Pokémon" ni
  arte que evoque un personaje protegido. Solo temas genéricos "inspirados"
  (Superhéroe, Kawaii, Galaxia…) + (V2) el usuario sube su propio arte con ToS de
  indemnización. Sobrely NUNCA distribuye la IP. Revisión humana del arte antes de
  publicar cualquier catálogo.
- **Matiz de diseño:** el plan MVP eligió "config en código aplicada a `theme_config`"
  (no la ruta de `templates` que sugería la exploración) — correcto para el caso
  "re-tematizar en el editor con 1 clic".

# Sesión 2026-08-11 (continuación) — Temas, marca y go-live de pagos

## Temas temáticos (MVP) — ✅ HECHO (Fases 1–4) y en `main`
- **Fase 1+2** (`27582f0`): `src/lib/theme/theme-packs.ts` (catálogo `THEME_PACKS`,
  10 packs genéricos sin IP: 2 free + 8 premium) + `applyThemePack()` puro (gemelo de
  `applyStylePreset`, no pisa `theme.animations`) + campo `themeSchema.themePack`
  opcional (retro-compat). Tests `theme-packs.test.ts`.
- **Fase 3** (`905aca1`): `minimalPlanForFeature()` en `plans.ts` + gate en
  `canPublishInvitation` (ahora lee `theme_config`; bloquea al publicar un pack ⭐ sin
  `advanced_personalization`; plan requerido = el más alto entre módulos y temática).
- **Fase 4** (`8ed0e9e`): `src/components/editor/theme-pack-picker.tsx` en `theme-panel.tsx`
  (galería con swatch de paleta+fuente, badge ⭐ estático como el ModulePalette).
- **Verificado en vivo** (editor de prod local): aplicar pack cambia preview + persiste;
  gate al publicar. **Fase 5 (previews imagen) = V2.** Sin migración (vive en el JSON
  `theme_config`).

## Marca: favicon/isotipo + lockup — ✅ HECHO y en `main`
- El dev entregó los SVG reales (`~/Downloads/sobrely_web_svgs/`): **sobre + corazón**.
  Se **recolorearon a oro/champán** (solapa `#f0d488`, cuerpo `#d4af37→#a9822f`, corazón
  tinta `#211d17`) con `sharp`. Reemplaza el favicon default de create-next-app.
- Archivos (`8446ab6`): `src/app/icon.svg` (vector), `favicon.ico` (48px PNG-in-ICO),
  `apple-icon.png` (180, tile tinta `#14110b`), `public/icon-192.png`/`icon-512.png`,
  `public/sobrely-logo-horizontal.{svg,png}` (lockup con wordmark Sobre+ly serif + tagline).
- **Lockup en el header del landing** (`dda6473`): `src/components/brand/logo-lockup.tsx`
  (`BrandMark` SVG inline + `LogoLockup`), usado en `page.tsx`. Los otros headers
  (dashboard/admin/auth/pricing) siguen con wordmark de texto — pendiente opcional.

## Fase 7.5 — Go-live de pagos reales — ✅ COMPLETA y VERIFICADA en producción
- MP pasó a **credenciales de PRODUCCIÓN** (Access Token `APP_USR-…`) + webhook en
  `https://sobrely.com/api/webhooks/mercadopago`, evento **"Pagos (legacy)"** (topic
  `payment`). `MP_PUBLIC_BASE_URL`/`NEXT_PUBLIC_SITE_URL` = `https://sobrely.com`.
- **Verificado end-to-end con dinero real:** pago real ($199 Esencial) → orden `paid` +
  entitlement activo (en `/admin`). **Reembolso** desde MP → orden `refunded` +
  Reembolsos $199 + bucket "Reembolsadas 1" en `/admin`.
- Limpieza (`b83d5ea`): se quitó el `allowedDevOrigins` del túnel muerto en `next.config.ts`.
- **Gotchas confirmados:**
  - La URL del webhook DEBE ser la ruta completa `/api/webhooks/mercadopago` (no solo el
    dominio: `POST /` da 200 falso-positivo y la orden se queda `pending`). Sin `/` final.
  - "Simular notificación" del panel: **500 = éxito** (firma OK; el pago simulado 123456
    no existe). **401 = secreto no coincide.**
  - **No puedes pagarte a ti mismo** (comprador = cuenta vendedora): usar tarjeta de otra
    persona / checkout como invitado en incógnito.
  - El panel **Webhooks → "Notificaciones entregadas 0%"** es LAGGY/incompleto: no refleja
    entregas reales. Prueba de que el webhook entregó = la orden quedó `paid`/`refunded`
    (solo el webhook lo hace; `/billing/success` solo LEE, no reconcilia).

## Fix de reembolso + auto-publicación — ✅ HECHO y en `main`
- **Reembolso revoca acceso** (`a561567`): el guard de idempotencia (`order.status==='paid'
  → return`) cortaba también los reembolsos. Se reemplazó por `isRedundantTransition()`
  en `mp-status.ts` (ignora duplicados exactos y no degrada un `paid` por notificaciones
  tardías, PERO deja pasar `refunded`/`charged_back`). En `fulfillment.ts`, al reembolsar
  un plan: entitlement→`revoked` + `is_published=false`. **Probado en vivo** (ver 7.5).
- **Auto-publicar al pagar SOLO desde el botón "Publicar"** (`0f500ee`): la intención se
  guarda en `orders.metadata.publish_on_paid` (sin migración; la columna ya existía).
  `CheckoutButton` propaga `publishOnPaid`; **solo el modal de upgrade del editor** lo
  pasa (`/pricing` y `/billing/checkout` no). En `fulfillment`, al pagar auto-publica solo
  si `publish_on_paid` **y** `canPublishInvitation` lo permite. **No ejercitado en vivo**
  (el pago de prueba no vino del botón Publicar) — validar con un pago desde "Publicar".

## Análisis confirmado (para futuras dudas)
- **¿Pagar habilita los módulos del plan?** Sí, funcional: el pago activa el entitlement →
  el plan efectivo de la invitación = el pagado → `canPublishInvitation` permite esos módulos.
- **¿Pagar publica?** Solo si el checkout salió del botón "Publicar" (ver auto-publish). Si
  no, el entitlement queda activo y el usuario publica manualmente.

## Lockup en TODOS los headers + páginas legales — ✅ HECHO y en `main`
- **Lockup en todos los headers** (`8ae9e53`): `LogoLockup` (isotipo + wordmark) reemplaza
  el wordmark de texto en dashboard, admin, auth, pricing y el 404 público (antes solo el
  landing). Todo el "ly" en oro (`text-brand-gold`) — antes dashboard/admin usaban `text-primary`.
- **Páginas legales** (`75c76e8`): `/privacidad` (Aviso de Privacidad) y `/terminos`
  (Términos y Condiciones), shell `LegalPage` con el lockup. Contenido base para SaaS de
  invitaciones (Supabase/Mercado Pago/Vercel/Google, derechos ARCO, **contenido del usuario
  con declaración de derechos + indemnización** que amarra el legal de los theme packs).
  Enlaces en el footer del landing + en `sitemap.ts`. Correo de contacto usado:
  `contacto@sobrely.com` (buzón real en Google Workspace).
- **SEO del landing** (`3c0a4ae`): el hero ahora nombra "Sobrely" + su propósito explícito
  (para la verificación de marca de Google — ver abajo).

## Branding OAuth de Google (login con Google) — 🚧 EN REVISIÓN DE GOOGLE (no bloquea)
- **Problema:** el login con Google mostraba `ncxglanrfeepzenrfvoh.supabase.co` en vez de
  "Sobrely". Causa: para mostrar el nombre/logo, Google exige **verificación de marca** del
  OAuth consent screen (Google Auth Platform del proyecto GCP cuyo Client ID usa Supabase).
- **Hecho por el dev + agente (los 3 requisitos ya cumplen, verificado en el HTML vivo):**
  1. ✅ Dominio `sobrely.com` **verificado** en Search Console (TXT en DNS de Vercel).
  2. ✅ Nombre de la app = **"Sobrely"** (coincide con `<title>`, `application-name`,
     `og:site_name`, header y body del landing).
  3. ✅ Landing describe el propósito + nombra Sobrely (desplegado, `3c0a4ae`).
- **Gotcha clave:** el panel "Problemas… del intento ANTERIOR" **no se re-evalúa al reabrirlo**;
  Google re-checa contra su **caché/índice** de la home. Palancas: **Search Console → Inspección
  de URLs → Solicitar indexación** de `https://sobrely.com/`, y/o **apelar** ("los problemas
  son incorrectos → revisión adicional").
- **Estado actual:** el dev **envió la apelación** con la evidencia; el **Branding status = "en
  proceso de revisión"** (revisión humana de Google Trust & Safety). Google pide **responder al
  hilo de correo** de Confianza y Seguridad. **Tarda días.** El login **YA FUNCIONA**; esto es
  cosmético. Alternativa definitiva si se quiere el callback en el propio dominio: **Supabase
  Custom Domain** (de pago, ~$10/mes → `auth.sobrely.com`). NO se hizo.

## Plantillas de correo (Supabase) + Resend — ⬜ PENDIENTE (no hecho)
- El dev quiso brandear el correo de **confirmación de registro**. **Supabase ahora exige
  configurar SMTP propio para editar las plantillas** (con el SMTP compartido los campos
  Subject/Body están BLOQUEADOS). Además el SMTP compartido tiene límite bajo (~3-4/hora) y
  cae en spam → **para producción hace falta SMTP propio de todas formas.**
- **Recomendado:** **Resend** (3,000 correos/mes gratis). Pasos: crear cuenta → verificar
  `sobrely.com` (registros DNS en Vercel) → API Key → Supabase **Authentication → Emails →
  SMTP Settings** (Host `smtp.resend.com`, Port 465, User `resend`, Pass = API Key, Sender
  `noreply@sobrely.com` / "Sobrely") → guardar → se desbloquean las plantillas.
- **Ya se redactó** una **plantilla HTML brandeada** (email-safe, tablas + inline styles, logo
  vía `https://sobrely.com/icon-192.png`) para "Confirm signup" — está en el historial de esta
  sesión (chat), lista para pegar cuando el SMTP esté configurado.

## PENDIENTE al cerrar (para la próxima sesión)
1. **Branding OAuth de Google:** esperar la respuesta de Google (revisión en curso) y **responder
   el hilo de correo** de Confianza y Seguridad. Nada más que hacer en código.
2. **Email propio + plantillas:** configurar **Resend** (SMTP) → pegar la plantilla brandeada de
   "Confirm signup" (+ opcional: reset password, magic link). Requiere DNS en Vercel.
3. ~~**Correo de soporte:** confirmar/crear `soporte@sobrely.com`.~~ ✅ RESUELTO: es
   `contacto@sobrely.com` (usado en /privacidad y /terminos).
4. (Opcional) Smoke test del auto-publish desde el botón "Publicar" — **el dev dijo que YA lo probó
   y funciona** (Boda elegante quedó Publicada tras pagar). ✅
5. (Ya NO pendiente) `0010` aplicada al remoto ✅; lockup en todos los headers ✅.

---

## Prompt para continuar (pegar al retomar)

> Retomo **Sobrely** en "/Users/arturocastillo/Documents/Personal projects/invitaflow".
> Lee primero HANDOFF.md (la sección **"Sesión 2026-08-12 (tarde) — Responsive web + Claro/
> Oscuro + Temáticas/arte propio"** arriba, que es el estado más reciente) y README.md.
>
> **Estado:** LIVE en `https://sobrely.com`. Fase 8 COMPLETA. Fase 7 COMPLETA incl. 7.5 (pagos
> reales en PRODUCCIÓN). Correo propio (Resend) + DMARC + confirmación en dominio propio
> (`/auth/confirm`) HECHO. **Hay trabajo NUEVO sin mergear en la rama
> `skarlette/feature-responsive-web-themes` (22 commits, `main` INTACTO, nada pusheado):**
> A) invitaciones responsive en web; C) claro/oscuro (app + por invitación); B) temáticas
> (6 packs nuevos) + arte propio Premium (fondo de imagen, stickers arrastrables, decoración
> con imagen); + pulido de animaciones (re-play, intensidad, transición). `tsc`/`lint`/`build`
> limpios, 56/56 tests. Todo verificado por medición en navegador.
>
> **Lo primero a hacer:** ayúdame a **validar la rama** (`git checkout
> skarlette/feature-responsive-web-themes && pnpm dev`) y, con mi OK, **mergear a `main`** (ff)
> + deploy. ⚠️ Toca **gating de pago** (Premium `custom_art`) → pasar secaudit y revisión antes.
>
> **Pendientes que ya venían:** (1) ✅ resuelto, el buzón es `contacto@sobrely.com`;
> (2) Branding OAuth de Google en revisión (login ya funciona; cosmético).
> **Ideas a explorar (en el HANDOFF):** quitar fondo de sticker (canvas local);
> **⭐ Invitados personalizados con QR** (competidor invitio.events: N invitaciones
> personalizadas, guest/registro con link único + QR + Apple/Google Wallet + check-in).
>
> **Notas de entorno:** push vía **SSH sobre 443**
> (`ssh://git@ssh.github.com:443/ArturoJCastilloZ/Sobrely.git`) — puerto 22 bloqueado. El guard
> del repo exige ramas con prefijo **`skarlette/*`** (rechaza `feat/…`).
>
> **Reglas:** trabajo por fases, cada una requiere mi aprobación explícita — NO avances solo; al
> cerrar muéstrame resumen, archivos, migraciones, env vars, cómo probar, pendientes y riesgos.
> NO guardes nada en cerebro/memoria ni en el workflow Personal Projects. Git: rama
> `skarlette/*` → merge ff a `main`; `secaudit_guard.py --mark` en comando SEPARADO del push.
