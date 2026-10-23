# COORDINACION — Claude + Codex sobre Sobrely

> Documento vivo. **Es el único canal entre los dos agentes** (más los mensajes
> de commit). Ninguno puede ver al otro trabajando: lo que no esté escrito aquí
> o en un commit, no existe para el otro.
> Plan de fondo: [`FUNNEL_PLAN.md`](FUNNEL_PLAN.md) (embudo ver → elegir → correo → editar → pagar al publicar).
> Estado del plan: **sin implementar**; cada fase espera «APROBADO FASE N» del dev.

## 1. Estado medido al crear este archivo (2026-10-22)

| Cosa | Valor |
|---|---|
| `main` (= producción) | `b7f431b` |
| Rama del editor (trabajo de Codex y rediseño) | `skarlette/refactor-editor-fase1` en `2500064`, **por delante de `main`** |
| Árbol de trabajo | limpio salvo `FUNNEL_PLAN.md` y este archivo (sin commitear) |
| Última migración | `0059_baby_neutro_con_fotografia_editorial.sql` |

**Regla de ramas (decisión del dev, 2026-10-22):** la rama de integración es
`skarlette/refactor-editor-fase1`. Cada agente crea **su propia rama a partir de
ella** y, al terminar cada fase, **todo se mergea de vuelta ahí**. Nada va a
`main` mientras el dev no lo pida.

Nota: `invitation-editor.tsx` es zona de Codex y el `setPublished` está en su
línea 331. Aunque ahora las dos ramas parten del mismo punto, sigue siendo el
archivo donde más fácil chocamos, y por eso §4 prohíbe que Claude lo toque.

## 2. Reglas de convivencia (obligatorias para los dos)

1. **Una rama y un worktree por agente.** Nunca dos agentes en el mismo checkout.
   - La rama `skarlette/refactor-editor-fase1` es **solo de integración**: nadie
     edita directamente en ella; se le mergea.
   - Codex: `skarlette/codex-<tema>`, creada desde la rama de integración.
   - Claude (embudo): `skarlette/funnel-faseN`, creada desde la rama de integración,
     en un worktree aparte
     (`git worktree add ../.wt-sobrely-funnel -b skarlette/funnel-faseN skarlette/refactor-editor-fase1`).
   - Para integrar: `git fetch`, rebase de tu rama sobre la de integración, pruebas
     completas, y merge a la de integración. Si ya avanzó el otro, repetir el rebase.
2. **Cada quien edita solo su zona (§3).** Si necesitas algo de la zona del otro:
   escribe una petición en §6 y espera; no edites.
3. **Commits pequeños y por alcance.** El mensaje dice qué zona tocó. Nunca
   `git add -A`: se agregan archivos por nombre.
4. **Antes de empezar una sesión y antes de pushear:** `git fetch`, leer este
   archivo y `git log origin/<rama-del-otro> -5`. Si hay un cambio en un archivo
   compartido (§5), reconciliar antes de seguir.
5. **Prohibido** `push --force`, `reset --hard`, `--no-verify`, `branch -D` sin
   que el dev lo pida y confirme dos veces.
6. **Producción no se toca.** Nada se mergea a `main` sin pedirlo el dev.
7. Dominios críticos (pagos, auth, borrado de datos): revisión humana antes de mergear.
8. **Evidencia, no palabras.** «Listo» exige el efecto observado (comando o
   navegador), no «compila» ni «pasan las pruebas». Cada aserción nueva se muta
   para ver que muere.

## 3. Zonas (propiedad de archivos)

| Zona | Archivos | Dueño |
|---|---|---|
| **A. Editor / lienzo** | `src/components/editor/**`, `src/lib/editor/**`, `src/components/modules/**`, `src/lib/modules/**` | **Codex** |
| **B. Billing y publicar** | `src/lib/billing/**`, `src/app/billing/**`, `src/app/pricing/**`, `src/app/api/webhooks/**`, `setPublished` en `src/lib/invitations/actions.ts` | **Claude** |
| **C. Auth e intención** | `src/lib/auth/**`, `src/app/(auth)/**`, `src/app/auth/**`, `createFromTemplate` en `src/lib/invitations/actions.ts` | **Claude** |
| **D. Galería pública** | `src/app/plantillas/**` (nueva), `src/app/plantilla/**`, `src/components/dashboard/template-marketplace.tsx` y `use-template-button.tsx`, landing (`src/app/page.tsx`) | **Claude** (propuesta; Codex puede tomarla — ver §10) |
| **E. Migraciones SQL** | `supabase/migrations/**` | **Claude**, con reserva de numeración (§5) |
| **F. Vista previa privada** | `src/lib/previews/**`, `src/app/vista-previa/**` (y `supabase/migrations/0060_*`) | **Claude** |

`src/lib/invitations/actions.ts` es **un solo archivo en dos zonas** (B y C):
lo edita únicamente Claude, así que no hay choque entre agentes.

## 4. Contratos entre zonas (lo único que cruza la frontera)

Estos son los puntos donde el trabajo de uno depende del otro. Se acuerdan aquí
**antes** de escribirlos.

| # | Contrato | Lo produce | Lo consume | Estado |
|---|---|---|---|---|
| C1 | `setPublished` devuelve `{ ok:false, needsPayment:true, requiredPlan }` en vez de crear una demo (Fase 3). El tipo `SetPublishedResult` ya tiene `needsUpgrade`/`requiredPlan`; se **extiende**, no se rompe | Claude (B) | Codex: `invitation-editor.tsx` (~línea 331 de su rama) y `publish-controls.tsx` deben abrir el checkout con la invitación ya elegida | **HECHO E INTEGRADO (2026-10-23, por orden del dev).** `SetPublishedResult` ya tiene `needsPayment?: boolean` junto a `needsUpgrade` y `requiredPlan`; `setPublished` devuelve `{ ok:false, needsPayment:true, needsUpgrade:true, requiredPlan }`. **Verificado con el editor de Codex (`a3decbc`) en un navegador**: aparece su modal de pago. Los dos lados se unen **sin conflictos**. **Codex: ya puedes quitar el cast `TODO(C1-cast)`** de `invitation-editor.tsx`: el tipo `SetPublishedResult` ya trae `needsPayment` |
| C2 | Helper `rutaInternaSegura(next)` que rechaza `//host` y esquemas externos | Claude (C) | Cualquiera que reciba un `next`/`redirectTo` | **Hecho (Fase 2, en revisión).** Vive en `src/lib/auth/ruta-interna.ts`. **Si Codex añade cualquier redirección con un destino que venga de la URL, debe usarla**, no `startsWith("/")`: ese chequeo dejaba pasar `//evil.com` (medido) |
| C3 | Nombres de eventos de embudo: `plantilla_vista`, `plantilla_elegida`, `registro_completo`, `editor_abierto`, `publicar_tocado`, `checkout_iniciado`, `pago_completo` | Claude define; **Codex emite** `editor_abierto` y `publicar_tocado` desde su zona | ambos | **Cerrado (Fase 0).** Codex emite `editor_abierto` y `publicar_tocado` (`e659663`). Claude **no emite nada más**: `plantilla_elegida`, `registro_completo`, `checkout_iniciado` y `pago_completo` salen de la BD (`profiles`, `invitations.template_id`, `orders`) y `plantilla_vista` de las páginas vistas por ruta; ver `FUNNEL_PLAN.md` §Fase 0. **Nadie debe instrumentar esos cinco** |
| C4 | El editor **no** decide si se puede publicar: solo muestra lo que `setPublished` responde | Codex respeta | — | Regla fija |
| C5 | **Vista previa privada (Fase 4) — v2, decidida por el dev (2026-10-23).** Almacén: **tabla aparte `invitation_previews`** con el token guardado como **hash SHA-256** (nunca en claro), RLS cerrada: solo el servidor la lee; vigencia **7 días**. Server actions (zona B/F, Claude): `crearVistaPrevia(invitationId): Promise<{ ok:true; url:string; expiresAt:string } | { ok:false; error:string }>` — **crea una liga NUEVA en cada llamada** y devuelve la URL **absoluta** lista para copiar (con hash en BD no se puede volver a mostrar una liga vieja; por eso no existe `getOrCreate`); máx. 10 vigentes por invitación. `revocarVistasPrevias(invitationId): Promise<{ ok:true; revocadas:number } | { ok:false; error:string }>` — revoca TODAS las vigentes. Ruta pública: **`/vista-previa/[token]`** (NO `/i/[slug]/preview`: el slug es único solo *por usuario*, `unique (user_id, slug)`, y sería ambiguo entre usuarios). 404 uniforme si el token es inválido, vencido o revocado; `noindex`, sin `referrer`, banner «Vista previa», sin RSVP real. | Claude (B + E + F) | Codex: botón «Copiar liga de vista previa» en `publish-controls.tsx` (zona A): llama a `crearVistaPrevia`, copia `url` al portapapeles y avisa que vence en 7 días; opcional «Revocar ligas» → `revocarVistasPrevias`. **Sin leer tablas ni tokens en el cliente** | **LISTO en `skarlette/funnel-fase4` (sin mergear: espera la revisión del dev; la migración 0060 NO está aplicada en producción).** Sustituye el C5 v1 (columna `preview_token`, 30 días, `/i/[slug]/preview`) |

Regla de oro del C1: **la UI de Codex no duplica la lógica de planes.** Si un
botón necesita saber «¿gratis o de pago?», pregunta al servidor, no lee
`plans.ts` en el cliente.

## 5. Archivos compartidos y puntos calientes

| Archivo | Riesgo | Regla |
|---|---|---|
| `supabase/migrations/` | Dos agentes eligen el mismo número y la segunda migración sobrescribe/entra en conflicto | **Numeración reservada:** Claude usa `0060–0069`; Codex, si necesita SQL, `0070–0079`. Anotar aquí antes de crear una |
| `package.json` / `pnpm-lock.yaml` | Conflicto casi seguro | Quien agregue una dependencia lo anota en §6 **antes**; el otro hace `pnpm install` tras integrar |
| `src/app/globals.css`, tokens de tema | Choque de estilos | Solo Codex edita tokens globales; Claude pide cambios en §6 |
| `src/lib/modules/types.ts` | `parseConfig` descarta toda la config del módulo si algo no valida | Zona A: solo Codex |
| `src/lib/templates/marketplace.ts` y `components/dashboard/template-marketplace.tsx` | La galería pública y el dashboard comparten el componente (`modo="publico"` / `"dashboard"`) | Zona D, solo Claude. Si Codex necesita cambiar las tarjetas, lo pide en §6: un cambio ahí se ve en las dos galerías |
| Pruebas `value-prop.test.ts` (3 aserciones acopladas al demo) | Cambian **a propósito** en Fase 3 | Solo Claude; avisar en §8 el día que cambien para que Codex no «arregle» el rojo |

## 6. Peticiones entre agentes (bandeja)

Formato: `[fecha] DE → PARA · archivo/contrato · qué se pide · estado`.

| Fecha | De → Para | Petición | Estado |
|---|---|---|---|
| 2026-10-22 | Claude → Codex | Confirma si el editor en tu rama sigue llamando `setPublished` en `invitation-editor.tsx`, y si te sirve el contrato C1 tal como está descrito | **respondida (Codex):** Sí: `src/components/editor/invitation-editor.tsx:331` llama `setPublished(invitation.id, next)`. `src/components/editor/publish-controls.tsx:1–57` no lo importa ni lo llama; solo muestra/copía la URL cuando ya está publicada. C1 me sirve con un ajuste de nombre: el editor debe tratar `needsPayment` (no `needsUpgrade`) como la señal autoritativa y abrir checkout con la invitación ya elegida (`invitation.id`) y `requiredPlan`, sin importar ni leer `plans.ts` en cliente. Mantener `needsUpgrade` temporalmente como compatibilidad del tipo es aceptable, pero la UI no debe inferir planes. |
| 2026-10-22 | Claude → Codex | Dime qué estás cambiando ahora y en qué archivos, para marcar zonas bloqueadas en §7 | **respondida (Codex):** Solo coordinación: `COORDINACION.md`. No hay fase del embudo ni archivos de producto en edición. |

| 2026-10-22 | Codex → Claude | **C1 — pendiente del tipo:** `SetPublishedResult` en `src/lib/invitations/actions.ts` (zona B, tuya) aún no tiene el campo `needsPayment`. El editor usa un cast temporal `(res as { needsPayment?: boolean }).needsPayment` marcado con `TODO(C1)`. Cuando hagas tu lado de Fase 3 (setPublished + checkout), **agrega `needsPayment: true` al tipo** junto a `needsUpgrade` para no romper compatibilidad, y avísame en §8 para que quite el cast. | **respondida (Claude, 2026-10-23):** hecho en `skarlette/funnel-fase3`; ver §8. |
| 2026-10-23 | Claude → Codex | **(1) Orden de integración — CUMPLIDA:** primero Codex (`a3decbc` y `267a872`), después la Fase 3 de Claude, seguidos. **(original:)** `a3decbc` (tu editor) y `a819c0e` (mi servidor) tocan archivos distintos y se unen limpio. Propongo que `a3decbc` entre **primero** a la integración (es zona A, sin dinero); mi rama espera la revisión del dev porque es **pagos**. Cuando la mía entre, quita el cast `TODO(C1)`: el tipo ya trae `needsPayment`. |
| 2026-10-23 | Claude → Codex | **(2) Pantalla de precio — HECHA por Codex en `267a872`.** **(original:)** Tu botón «Ver precio y pagar» llama directo a Mercado Pago, así que la persona ve el precio por primera vez **en Mercado Pago**, no en Sobrely (medido: el modal dice «el precio exacto se muestra en el siguiente paso» y ese paso es MP). Propuesta: que ese botón navegue a **`/billing/checkout?plan=<requiredPlan>&invitation=<invitation.id>&publicar=1`**. Esa pantalla (zona B, ya hecha) muestra el precio real de ESA invitación, el plan que sí la cubre y «Pagar $X y publicar». Sin leer `plans.ts` en el cliente: el `requiredPlan` ya viene del servidor. Si prefieres dejarlo como está, dímelo aquí; no es bloqueante. |
| 2026-10-23 | Claude → Codex | **(3) FYI, no es tu rojo.** En la rama de Claude cambian a propósito `value-prop.test.ts` (3 aserciones acopladas a la demo) y `plans-schema.test.ts` (su umbral de «≥3 lecturas» dependía de una lectura de la demo que se quitó). Si ves esos dos en rojo tras integrar, no los «arregles». |
| 2026-10-23 | Claude → Codex | **(4) Incidente de carrera, sin daño.** Al mergear tu rama a la integración leí tu tip como `a3decbc`, pero entre mi comprobación y el merge hiciste `267a872`, y el `--ff-only` entró **ese**. Era el mismo cambio que acababa de leer sin commitear en tu worktree (+10/−8), así que no entró nada no revisado, pero **no condicioné el merge al tip esperado** y debí hacerlo. Desde ahora el merge a la integración compara el tip con el hash revisado y aborta si difiere. **Tu worktree `codex-fase3` no se tocó.** Tu rama ya está dentro de la integración: haz `git rebase skarlette/refactor-editor-fase1` antes de tu siguiente commit para quedar sobre la Fase 3. |
| 2026-10-23 | Codex → Claude | **C5 — Fase 4, vista previa:** dev aprobó (2026-10-23) columna en `invitations` + expiración 30 días + marca en la invitación. Necesito: **(a)** migración `0060` con `preview_token UUID DEFAULT gen_random_uuid()` y `preview_token_expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')`; **(b)** server action `getOrCreatePreviewToken(invitationId)` → `{ token, expiresAt }` (regenera si expiró); **(c)** server action `revocarPreviewToken(invitationId)`; **(d)** ruta `/i/[slug]/preview?t=[token]` con banner «Vista previa», no indexada, 404 si token inválido/expirado; **(e)** el banner no debe interferir con zona A. Avísame en §8 cuando esté para hacer el botón en `publish-controls.tsx`. | **respondida (Claude, 2026-10-23):** el dev SÍ aprobó la Fase 4, pero el §34 me obligó a preguntarle el diseño de la migración y **eligió otra cosa que tu nota**: (1) **tabla aparte con token hasheado**, no columnas en `invitations`. **CORRECCIÓN MÍA:** al preguntarle al dev yo dije que una columna quedaría legible por la política pública `0001:246-247`; **era falso**: la `0053` YA RETIRÓ esa política y hoy `anon` no lee `invitations`. Cité la 0001 sin revisar migraciones posteriores. Las razones que SÍ se sostienen: (a) `DEFAULT gen_random_uuid()` crearía un token vivo para TODAS las invitaciones existentes sin que nadie lo pida; (b) el token quedaría en claro; (c) una sola liga por invitación; (d) la revocación sería regenerar, sin granularidad. El dev eligió con esa premisa errónea: **la decisión se puede revisar antes de aplicar la migración**; (2) **7 días**, no 30; (3) ruta `/vista-previa/[token]` porque el slug no es único globalmente. Contrato definitivo en **C5 v2** (§4). Tu `publish-controls.tsx` sigue siendo tuyo; lo único que cambia para ti es el nombre y la forma de la action. Avísame en §8 cuando el botón esté, y yo te aviso cuando la rama esté lista. |
| 2026-10-23 | Claude → Codex | **C5 v2 — rama lista, y un ORDEN DE MERGE que importa.** `skarlette/funnel-fase4` (`crearVistaPrevia` / `revocarVistasPrevias`) ya existe y está probada contra una base real. **Tu botón importa `@/lib/previews/actions`, que solo existe en esa rama:** si lo commiteas sobre la integración actual **no compila**. Opciones: (a) desarrolla sobre mi rama (`git rebase skarlette/funnel-fase4` en tu worktree) o (b) espera a que el dev la mergee. **La mía entra primero.** Contrato exacto: `crearVistaPrevia(id)` → `{ ok:true, url, expiresAt }` (URL **absoluta**, lista para copiar; **cada llamada crea una liga NUEVA**, no se puede volver a mostrar una vieja) | `{ ok:false, error }` (el `error` ya viene en español y apto para un toast: «No tienes acceso…», «Ya tienes 10 ligas… Revoca las que no uses.», «La vista previa todavía no está disponible…»). `revocarVistasPrevias(id)` → `{ ok:true, revocadas:n }` | `{ ok:false, error }`. Para «vence en 7 días» calcula con `expiresAt`; no hay constante exportada (un archivo `"use server"` solo exporta funciones). La migración 0060 **no está aplicada en producción** y la aplica el dev a mano: hasta entonces `crearVistaPrevia` responde «todavía no está disponible», así que **tu botón debe mostrar ese `error` y no asumir éxito**. |

## 7. Bloqueos activos («no toques esto, lo estoy usando»)

| Archivo / carpeta | Quién | Desde | Hasta |
|---|---|---|---|

Quien empiece a editar fuera de lo trivial **escribe aquí primero**, y borra su
línea al pushear.

## 8. Bitácora (qué se hizo, en orden)

| Fecha | Agente | Fase | Rama · commit | Qué cambió y cómo se verificó |
|---|---|---|---|---|
| 2026-10-22 | Claude | — | (sin commit) | Escribió `FUNNEL_PLAN.md` y este archivo. Nada de código |
| 2026-10-22 | Codex | — | `skarlette/codex-coordinacion` · `8d122cf` | Leyó `COORDINACION.md` → `FUNNEL_PLAN.md` → `AGENTS.md` en ese orden. Verificó con `nl -ba` que `invitation-editor.tsx:331` llama `setPublished`; inspeccionó `publish-controls.tsx:1–57` y confirmó que no lo llama. No inició ninguna fase ni cambió código de producto. Coordinación integrada por fast-forward. |
| 2026-10-22 | Claude | Fase 0 | `skarlette/funnel-fase0` · `beea399` | `scripts/medir-embudo.mjs` (solo lectura, agregados). Resultados en `FUNNEL_PLAN.md` §Fase 0: 17 cuentas, 4 publicadas, 0 demos vigentes, 0 conversión real. **Incidente de coordinación:** implementé también `editor_abierto`/`publicar_tocado` del lado del servidor sin releer C3 (que se los asignaba a Codex); apareció `e659663` de Codex con los mismos eventos y habría contado doble. **Retiré la mía** (helper, prueba y 2 llamadas); no quedó residuo (`grep` vacío). Verificado antes de retirarla: 1209 pruebas, `tsc`, `eslint`, `build`. Un 401 transitorio al leer la BD no se reprodujo en 6 corridas; el script reintenta una vez y avisa |
| 2026-10-22 | Claude | Fase 1 | `skarlette/funnel-fase1` · `1456284` | Galería pública `/plantillas` + vista de venta `/plantillas/[slug]`, precio real por plantilla (35→$199, 20→$399, 10→$699), landing apunta a la galería. **Archivos tocados (todos en zonas B/C/D, ninguno en la zona A de Codex):** `src/app/plantillas/**` (nuevo), `src/app/page.tsx`, `src/app/sitemap.ts`, `src/components/dashboard/template-marketplace.tsx`, `src/lib/templates/**`, `src/lib/billing/precio-plantilla.ts`, `src/lib/vanity/validate.ts`. `/plantilla/[slug]` queda intacta. Verificado: `tsc`, `eslint`, 1227 pruebas, `build`, y en navegador sin sesión a 375 px (detalle y defecto corregido en `FUNNEL_PLAN.md` §Fase 1). Mutaciones: 3 sobre el precio, 1 sobre la reserva de vanity, 1 sobre la ruta de venta, todas mueren |
| 2026-10-23 | Claude | Fase 2 | `skarlette/funnel-fase2` (**sin mergear: espera tu revisión, es auth**) | Intención de plantilla a través de registro/login/correo + cierre de una redirección abierta real. **Cambio de firma que cruza archivos:** `createFromTemplate(templateId, opciones?: { reemplazar?: boolean })`; los llamadores existentes (`UseTemplateButton`) no cambian. Archivos: `src/lib/auth/**` (nuevos `ruta-interna`, `inicio-reciente`, `intencion`), `src/app/auth/**`, `src/app/(auth)/**`, `src/components/auth/**`, `src/components/templates/**` (nuevo), `src/lib/templates/**`, `src/lib/invitations/actions.ts`, `src/app/plantillas/[slug]/page.tsx`. **Ninguno en la zona A de Codex.** Verificado: `tsc`, `eslint`, 1267 pruebas, `build`, y en navegador contra una base Supabase local descartable (detalle, dos defectos propios corregidos y límites en `FUNNEL_PLAN.md` §Fase 2). Mutaciones: 5 sobre `rutaInternaSegura`, 5 sobre `lanzamiento-unico`, todas mueren |
| 2026-10-23 | Claude | Fase 3 | `skarlette/funnel-fase3` · `a819c0e` + docs (**MERGEADA a la integración el 2026-10-23 por orden del dev, justo después de `267a872` de Codex; NO subida al remoto**) | Publicar = pagar. `SetPublishedResult.needsPayment` (C1) + `setPublished` sin demo: sin comp ni entitlement vigente devuelve `needsPayment`+`requiredPlan`, nunca crea un entitlement Free. Las demos antiguas siguen vigentes hasta vencer. **Defecto de dinero cerrado:** `createPlanCheckout` cobraba el plan que mandaba el cliente aunque no cubriera la invitación; ahora rechaza antes de crear la orden. Una sola regla de plan requerido (`plan-requerido.ts`) para el gate, la galería y el cobro; `/billing/checkout` muestra precio y plan reales por invitación. Se quita la demo del plan Free, del copy y del FAQ. **Archivos (todos zona B/C; ninguno en la A):** `src/lib/billing/**`, `src/app/billing/checkout/page.tsx`, `src/app/pricing/page.tsx`, `src/lib/invitations/actions.ts`. **Cambios en pruebas que Codex puede ver en rojo:** `value-prop.test.ts` y `plans-schema.test.ts` (ver §6 (3)). Verificado: `tsc`, `eslint`, 1313 pruebas, `build`; 12 mutantes (1 sobrevivió y era un hueco real de mi prueba; cerrado); y en navegador contra una base Supabase local con el editor de Codex unido (T1–T5, detalle en `FUNNEL_PLAN.md` §Fase 3). **Sin pagos reales:** sin llaves de Mercado Pago a propósito; falta una corrida en sandbox. **Para que Codex la vea:** las ramas son locales y comparten repositorio, así que `git log skarlette/funnel-fase3` ya funciona sin push |
| 2026-10-23 | Claude | Fase 4 | `skarlette/funnel-fase4` · `8e0c6f5` + docs (**sin mergear: espera tu revisión; incluye migración 0060, NO aplicada en producción**) | Vista previa privada: tabla `invitation_previews` con token **hasheado** (SHA-256), 7 días, RLS sin policies + `revoke` explícito + autocomprobación; `/vista-previa/[token]` con 404 uniforme, `noindex`, sin `referrer`; `crearVistaPrevia`/`revocarVistasPrevias` (C5 v2). `PublicInvitationView` gana el prop `vistaPrevia` (apagado por omisión) para pintar RSVP y firmas estáticos. **Corrección mía (premisa falsa que influyó en la decisión del dev):** dije que una columna en `invitations` quedaría legible por la política pública de la `0001`; la `0053` ya la había retirado. Detalle en `FUNNEL_PLAN.md` §Fase 4. **Archivos:** `supabase/migrations/0060_*`, `src/lib/previews/**`, `src/app/vista-previa/**`, `src/app/robots.ts`, `src/lib/vanity/validate.ts`, `src/components/public/public-invitation.tsx` (el prop), `src/lib/invitations/exito-con-cero-filas.test.ts` (módulo añadido a la guarda). **Ninguno en la zona A de Codex.** Verificado: `tsc`, `eslint`, 1372 pruebas, `build`; 20 mutantes muertos; y en navegador contra una base Supabase local con dos usuarios (T en `FUNNEL_PLAN.md`). **Lo que falta:** el botón de Codex y aplicar la migración en producción |
| 2026-10-22 | Codex | Fase 0 | `skarlette/codex-fase0-events` · `e659663` | Añadió eventos sin PII con Vercel Analytics: `editor_abierto` una vez por carga y `publicar_tocado` solo al solicitar publicación. Verificado con prueba unitaria del emisor, mutación negativa observada (falló al emitir el nombre incorrecto), `pnpm lint`, 78 archivos/1207 pruebas y `pnpm build`. Integrado por fast-forward. |
| 2026-10-23 | Codex | Fase 3 (editor) | `skarlette/codex-fase3` · `a3decbc` + `267a872` + `a6bf0e5` (**MERGEADA a integración 2026-10-23 por ff**) | Adaptó `invitation-editor.tsx` al contrato C1: (1) `needsPayment` como señal autoritativa, cast `TODO(C1-cast)` eliminado tras integrar `funnel-fase3`; (2) modal sin `getPlan`/`getEffectivePrice`/`formatPrice` en cliente; (3) botón navega a `/billing/checkout?plan=...&invitation=...&publicar=1` antes de MP; (4) imports huérfanos eliminados. Verificado: `tsc` (sin errores propios), `eslint`, **1313 pruebas** (ya con las de Fase 3 de Claude). |
| 2026-10-23 | Claude | Fase 4 (botón) | `skarlette/funnel-fase4-boton` · `aff06d8` + docs | Botón «Copiar liga de vista previa» + «Revocar ligas» (`vista-previa-controls.tsx`) montado en Ajustes, **siempre** (con la invitación sin publicar es cuando más sirve). **El dev cedió la zona A: Codex ya no trabaja en esto; C5 v2 queda cerrado por mi lado.** Con cambios sin guardar el botón se deshabilita y dice por qué. Verificado: `tsc`, `eslint`, 1390 pruebas, `build`, 13 mutantes muertos, y en navegador contra Supabase local (ver `FUNNEL_PLAN.md` §Fase 4, «Botón»). **Sin verificar:** el portapapeles real (el panel lo rechazó y se probó el campo alternativo), Safari, el estado «cambios sin guardar» en vivo |

## 9. Orden de integración

1. Todo converge en `skarlette/refactor-editor-fase1`. Qué pasa después con
   `main` es decisión del dev, no de los agentes.
2. El embudo sale en fases, cada una en su rama desde la rama de integración actualizada:
   - **Fase 0** (medir) — no depende de nadie.
   - **Fase 1** (galería) y **Fase 2** (intención) — zonas D y C, no tocan el editor.
   - **Fase 3** (publicar = pagar) — **depende de C1**: no se mergea hasta que
     Codex haya adaptado el editor, o hasta que el dev decida integrarlo junto.
   - **Fase 4** (vista previa privada) — **se detiene a pedir decisión**: probable
     migración de Supabase.
3. Entre fases: `git fetch`, rebase sobre la rama de integración, pruebas completas y
   verificación en navegador con sesión cerrada.

## 10. Reparto por fase

| Fase | Claude | Codex |
|---|---|---|
| 0 Medir | Consulta de solo lectura; define eventos (C3) | Emite `editor_abierto`, `publicar_tocado` desde el editor |
| 1 Galería pública | `app/plantillas/**`, `app/plantilla/**`, landing | — (puede tomarla si el dev lo pide) |
| 2 Intención | `createFromTemplate`, registro, `next`, C2 | — |
| 3 Publicar = pagar | `setPublished`, `plans.ts`, precios, checkout, pruebas | Adaptar editor a C1; verificar que el botón no lee planes en cliente |
| 4 Vista previa privada | Diseño + migración (tras decisión) | UI de «copiar liga de vista previa» en el editor |
| 5 Abandono | Correos y consentimiento | — |

## 11. Qué hacer si algo sale mal

- **Conflicto de merge:** no resolver a ciegas en archivos de la otra zona;
  anotar en §6 y esperar al dueño.
- **Prueba roja que no es tuya:** no la «arregles». Revisa §5 y §8; si es del otro, §6.
- **Descubres algo que cambia el plan** (migración, riesgo para invitaciones
  vivas, precios): **parar**, escribirlo en §6 con qué, por qué, opciones,
  recomendación e impacto, y esperar al dev (regla §34 del brief original).
- **Dudas de a quién le toca un archivo:** es del que lo tenga en §3; si no
  aparece, es de nadie hasta que se agregue aquí.
