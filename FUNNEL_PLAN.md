# FUNNEL_PLAN — ver plantillas → elegir → (correo) → editar → pagar para publicar

> Estado: **PLAN, sin implementar.** Ninguna fase arranca sin «APROBADO FASE N».
> Decisiones del dev (2026-10-22): **(1) se quita la publicación demo de 14 días.
> (2) camino barato: el correo se pide al ELEGIR plantilla, no hay edición anónima.**

## 0. Tesis

Hoy el muro de cuenta está **antes** de ver nada útil y la publicación gratis
(demo) le quita fuerza al cobro. Se invierte:

```
HOY     landing → /register → dashboard → plantillas → editor → publicar GRATIS (demo 14d) → [pagar]
DESPUÉS landing → galería pública → vista de plantilla → «Usar esta» → correo/Google → editor → publicar = PAGAR
```

Se queda gratis: ver plantillas, crear borradores ilimitados, editar, previsualizar.
Se cobra: **publicar** (hacer la liga accesible a invitados).

## 1. Estado medido del código (anclado a fuente, 2026-10-22)

| Hecho | Dónde |
|---|---|
| Plan Free = «paga solo cuando quieras publicar» **pero** con demo de 14 días | `src/lib/billing/plans.ts:52-78` (`publishTrialDays: 14`) |
| `setPublished` crea un entitlement Free de 14 días si no hay plan pagado | `src/lib/invitations/actions.ts` (`setPublished`, bloque «publicación DEMO») |
| `createFromTemplate` manda a `/login` **sin** `redirectTo`: se pierde la plantilla elegida | `actions.ts:114` |
| El botón «Usar plantilla» vive solo en el dashboard (requiere sesión) | `components/dashboard/use-template-button.tsx` |
| `/plantilla/[slug]` es público pero `noindex` y sin CTA | `src/app/plantilla/[slug]/page.tsx` |
| El registro por correo **fuerza** `next=/dashboard` tras confirmar | `src/lib/auth/actions.ts:68` |
| Login y Google **sí** respetan `redirectTo`/`next` (solo rutas que empiezan con `/`) | `auth/actions.ts:29-43, 93-101`; `auth/callback/route.ts` |
| `/billing/checkout` ya pide plan e invitación y exige sesión | `src/app/billing/checkout/page.tsx` |
| La página de precios y 3 pruebas **acoplan** copy y contrato al demo | `pricing/page.tsx:166`, `billing/value-prop.test.ts:10,15,74` |
| Planes de pago: Esencial $199, Celebración $399, Premium $699 (lanzamiento) | `plans.ts:89,122,160` |

**No medido (hay que medir en Fase 0):** cuántas invitaciones públicas viven hoy
bajo un entitlement Free-demo y cuándo expiran; el embudo actual.

## 2. Reglas duras de este plan

- **Las invitaciones existentes siguen funcionando.** Una demo ya publicada vive
  hasta su `expires_at`; no se despublica nada. Solo se cierra la puerta de entrada.
- §34: si una fase exige migración de Supabase, cambia un contrato de precios o
  muestra riesgo para invitaciones vivas → **parar y preguntar**.
- Pagos, auth y borrado de datos son dominios críticos: revisión humana antes de
  mergear (Fases 2 y 3).
- Cada aserción de prueba se valida **mutándola** (que muera), y cada cambio se
  verifica por efecto observado en el navegador, no solo con `tsc`/vitest en verde.

## 3. Fases

### Fase 0 — Medir (sin tocar código de producto)
- Consulta de solo lectura: invitaciones con `is_published` y entitlement `free`
  activo, con fecha de expiración (conteo + muestra, no borrar nada).
- Instrumentar eventos mínimos: `plantilla_vista`, `plantilla_elegida`,
  `registro_completo`, `editor_abierto`, `publicar_tocado`, `checkout_iniciado`,
  `pago_completo`. **Sin esto no se sabrá si el cambio mejoró algo.**
- Entregable: línea base del embudo actual + conteo de demos vivas.
- **Parar y decidir** si hay demos vivas que expiren con invitados ya
  respondiendo (qué se les dice y cuándo).

#### Resultados de la Fase 0 (medido 2026-10-22 con `scripts/medir-embudo.mjs`)

Base: `ncxglanrfeepzenrfvoh.supabase.co`, el host que ven los usuarios en el login
de Google (`HANDOFF.md`, sección «Branding OAuth de Google») → es la base **real**.
El script es de solo lectura y solo imprime agregados; se repite tras cada fase.

| Paso del embudo | Valor |
|---|---|
| Cuentas (`profiles`) | **17** |
| … que crearon ≥1 invitación | **11** — 6 (35%) **nunca** crearon una |
| Invitaciones creadas | 14 (6 desde plantilla · 8 en blanco) |
| Publicadas ahora | 4 |
| Entitlements alguna vez | 3, **todos Free/demo**; vencieron hace 58, 58 y 32 días |
| Demos Free **vigentes hoy** | **0** |
| Publicadas sin entitlement | 1 (comp/admin) |
| Órdenes | 8: 3 pending · 3 failed · 1 paid · 1 refunded |

Lo que dicen los números, y lo que NO:

- **La Fase 3 no pone en riesgo ninguna invitación viva:** hoy no hay una sola
  demo vigente. El «parar y decidir» de arriba queda **resuelto sin acción**.
- **Las 3 demos que se usaron no convirtieron:** las 3 vencieron sin pasar a
  plan de pago. Es n = 3: indicio, no prueba.
- **35% de las cuentas nunca crearon una invitación.** Es consistente con el
  muro de registro previo, pero no lo demuestra: no sé cuántas son cuentas de
  prueba del propio equipo.
- **Las 8 órdenes son de un solo día de pruebas** (hace 72–73 días), todas con
  `invitation_id` nulo (sus invitaciones se borraron; la columna es
  `on delete set null`). Lo más probable es sandbox (`docs/pruebas-sandbox.md`),
  pero **la BD no dice si el pago `paid` fue dinero real**: hay que confirmarlo
  en el panel de Mercado Pago (1 pago de $699, hace ~72 días).
- **Conversión real medida hasta hoy: 0.** Ningún cliente ha pagado un plan que
  sobreviva en la BD. El producto está en etapa previa al lanzamiento; con 11
  usuarios, **ningún porcentaje del embudo es estadísticamente interpretable**.
  La línea base sirve para comparar cambios grandes, no para optimizar a 1 punto.

**Eventos (decisión tomada, contrato C3):** casi todo el embudo ya sale de la BD
sin emitir nada: registro = `profiles`, plantilla elegida =
`invitations.template_id`, checkout iniciado y pago = `orders`, publicada =
`invitation_entitlements`. Vistas de plantilla y de precios = páginas vistas por
ruta de Vercel Web Analytics (ya montado en el layout). Solo `editor_abierto` y
`publicar_tocado` necesitaban evento, y los emite Codex desde el editor
(`e659663`). **No se emite nada más.**

**Pregunta abierta para el dev:** los eventos personalizados de Vercel son de
planes **Pro y Enterprise** (documentación de Vercel, consultada hoy). Si el
proyecto está en Hobby, `editor_abierto` y `publicar_tocado` no se registran y el
emisor es un no-op. ¿Qué plan tiene el proyecto?

### Fase 1 — Galería pública que vende
- `/plantillas` pública (hoy la galería está en `/dashboard/templates`): filtro
  por evento, miniaturas, **precio visible** («desde $199 por evento») y CTA.
- `/plantilla/[slug]` con CTA «Usar esta plantilla» y vista en vivo; **indexable**
  (hoy `noindex`) solo si se resuelve el riesgo de contenido casi duplicado
  (canonical por tipo de evento) — decidir en la fase, con evidencia.
- Landing y menú apuntan a la galería, no a `/register`.
- Aceptación: un visitante sin sesión llega a una plantilla y ve precio + CTA
  sin pasar por login (verificado en Chrome, sesión cerrada).

#### Resultados de la Fase 1 (2026-10-22)

**Qué se construyó, y dos desviaciones del plan escrito arriba (con su porqué):**

| Plan | Lo que se hizo | Por qué |
|---|---|---|
| «desde $199» | **Precio real por tarjeta**, calculado con el mismo criterio que el gate de publicación | Medido contra la BD (65 plantillas): **35 cuestan $199, 20 cuestan $399 y 10 cuestan $699**. Un «desde $199» habría sido falso para 30 de 65 |
| CTA dentro de `/plantilla/[slug]` | Ruta **nueva** `/plantillas/[slug]` que reutiliza la anterior por composición | `/plantilla/[slug]` la usan 5 scripts (capturas, hojas de contacto, medición de cajas de texto, contraste); un botón ahí se quemaría en las miniaturas |

- `/plantillas`: **indexable**, canonical propio, en el sitemap. Sus vistas de
  detalle `/plantillas/<slug>` van `noindex` y fuera del sitemap (contenido casi
  idéntico entre sí). Esto resuelve la pregunta abierta §7.1 con la opción
  conservadora: el índice posiciona, los detalles no diluyen.
- Se reutilizó el marketplace del dashboard con `modo="publico"` (sin favoritas,
  que exigen sesión). El modo por defecto no cambia.
- `plantillas` reservada como vanity; la guarda existente que barre `src/app`
  la habría hecho fallar de no estarlo (mutada: muere). 0 vanities y 0 usuarios
  con ese nombre hoy.
- Landing: el botón principal sin sesión pasa de «Empieza gratis → /register» a
  «Ver plantillas → /plantillas».

**Verificado por efecto, en navegador, sin sesión:** a 375 px ni la galería ni la
landing desbordan (`scrollWidth` 375); 65 botones llevan a
`/register?next=/plantillas/<slug>`; sin corazones ni «Favoritas»; sin errores de
consola; `?evento=Boda` filtra (13 de 65); plantilla inexistente → 404;
`/plantilla/<slug>` (captura) **sigue sin barra de compra**; el sitemap lista
`/plantillas` y ningún detalle. Botones de 44 px en móvil.

**Defecto encontrado y corregido durante la medición:** la barra de compra
`fixed` era 13 px más alta que su espaciador y **tapaba el final de la
invitación**. Pasó a `sticky bottom-0` al final del flujo (solape medido: 0).

**Lo que NO está verificado ni hecho (dicho sin adornos):**
- **Con sesión iniciada no lo vi en navegador** (no tengo una sesión de prueba).
  Ese camino usa el `UseTemplateButton` que ya existía; está verificado solo por
  lectura de código.
- **El botón sin sesión pierde la plantilla hoy.** Lleva `?next=` pero el
  registro lo ignora (el correo fuerza `/dashboard`, Google no recibe destino).
  Cablearlo es la **Fase 2**. Hasta entonces, quien se registra aterriza en el
  dashboard y tiene que volver a buscarla.
- **El texto de la galería ya describe el modelo de la Fase 3** («pagas al
  publicar») mientras la demo de 14 días sigue existiendo. No es falso, pero
  **esta fase no debe llegar sola a producción**: se sube junto con la Fase 3.
- La vista de venta hereda `animations: false` de la ruta de captura: la
  invitación se ve estática, menos viva que la real.
- No medí LCP ni Lighthouse de las páginas nuevas.

### Fase 2 — «Usar esta plantilla» conserva la intención
- Sin sesión: `createFromTemplate` deja de mandar a `/login` pelado; manda a
  `/register?next=/plantilla/<slug>/usar` (o equivalente). Tras correo **o**
  Google, vuelve y **crea la invitación** con la plantilla elegida.
- Corregir `emailRedirectTo` para llevar `next` (hoy fuerza `/dashboard`) y
  validar `next` como ruta interna (ya se hace con `startsWith("/")`; endurecer
  contra `//host` — un `startsWith("/")` deja pasar `//evil.com`).
- Idempotencia: refrescar o doble clic no crea dos invitaciones.
- Aceptación (por efecto): visitante → plantilla → registro → editor con ESA
  plantilla cargada. Probar con correo y con Google.

#### Resultados de la Fase 2 (2026-10-23) — **pendiente de tu revisión: es auth**

Probado de punta a punta en una **base Supabase local descartable** (no se tocó
producción), con la **plantilla de correo real** del repo y un usuario nuevo.

**Hallazgo de seguridad medido (redirección abierta).** Con el código original,
iniciar sesión con `/login?redirectTo=//evil.com` terminó en **`http://evil.com`**
(origen de la pestaña medido). Con la corrección termina en `/dashboard`. De los 5
sitios que validaban con `startsWith("/")`, solo 2 eran explotables (`login` y
`confirmEmail`, que llaman `redirect(valor)` directo); en `callback` el destino
se concatena a `origin`, y ahí `//evil.com` **no** salía del sitio. Los 5 ahora
usan una sola función, `rutaInternaSegura`.

**El correo de confirmación ignora el `emailRedirectTo` del código.** La plantilla
de Supabase trae `next=/dashboard` escrito a mano (medido en el correo real
recibido en el buzón local). Cambiar el código no la toca. Solución sin tocar
Supabase: `register` deja el destino en una cookie (`httpOnly`, `SameSite=Lax`, 1
día) que `confirmEmail` lee **solo si el enlace trae el destino por defecto**.

| Camino | Resultado medido |
|---|---|
| Inicio de sesión con `redirectTo=/plantillas/x?usar=1` | Editor con la plantilla; **+1** invitación |
| Registro por correo → confirmar (plantilla real) → vuelta | Editor con la plantilla; **exactamente 1** invitación `boda-elegante` |
| «Atrás» desde el editor | No crea nada (total sin cambio) |
| `?usar=1` con inicio de sesión de hace 10 min | No crea nada; vista normal con su botón |
| `redirectTo=//evil.com` | `/dashboard`, ya no `evil.com` |
| Botón de Google en el registro | La acción recibe `"/plantillas/xv-anos?usar=1"` |

**Dos defectos míos, encontrados midiendo (no con las pruebas):**
1. **Dos invitaciones en vez de una.** Un `useRef` como guardia no bastó: Next
   monta una **instancia nueva** del componente al reconstruir el árbol desde la
   caché de la navegación original. La memoria pasó al módulo + `sessionStorage`
   (`lanzamiento-unico.ts`).
2. **El usuario se quedaba en la plantilla sin llegar al editor.** Quitar `?usar=1`
   con `history.replaceState` antes de la acción dispara una navegación interna
   de Next que **pisa** la redirección de la acción. Ahora la propia redirección
   *reemplaza* la entrada del historial (`RedirectType.replace`).
   Además la función nueva tenía un error de lógica (`Number(null) === 0`) que
   las pruebas atraparon.

**Decisión de seguridad:** crear la invitación al volver solo ocurre con `?usar=1`
**y** un inicio de sesión de hace ≤ 2 min. Sin esa ventana, un enlace ajeno a
`…?usar=1` crearía borradores en la cuenta de quien ya tenga sesión.

**Lo que NO está verificado ni hecho (dicho sin adornos):**
- **Google de punta a punta:** la base local no tiene proveedor OAuth. Solo vi que
  la acción recibe el destino; el viaje a Google y de vuelta no lo probé.
- **Confirmar el correo desde OTRO dispositivo o navegador** no conserva la
  plantilla (la cookie es del navegador donde se registró): cae en `/dashboard`
  sin error. Cubrirlo exige cambiar la plantilla de correo en el **panel de
  Supabase** (usar `{{ .Data.* }}`); no lo hago porque es config fuera del repo.
  Está cubierto por prueba unitaria, **no** lo probé en un segundo navegador real.
- **Hallazgo de infraestructura, fuera del alcance:** en un Supabase **nuevo**
  las migraciones del repo no otorgan permisos a los roles de la API
  (`SELECT` sobre cualquier tabla da 403 / la plantilla da 404). Las imágenes
  recientes ya no conceden permisos por defecto. Producción funciona porque su
  proyecto es anterior. Quien levante un proyecto nuevo desde `supabase/migrations`
  se encontraría con la app rota. Para mis pruebas repliqué los permisos **solo en
  la base local**. No lo arreglé: es una decisión tuya (§34).
- El panel «Mis eventos» del dashboard mostró «Aún no tienes invitaciones» con 6
  creadas en la base local; casi seguro es la misma causa de permisos (no lo
  investigué más).
- No probé con Google ni con cuentas reales de producción.

### Fase 3 — Publicar = pagar (quitar la demo)
- `setPublished`: sin entitlement activo y sin comp → **no** crear entitlement
  Free; devolver `needsPayment` con el plan mínimo que cubre sus módulos
  (`minimalPlanForModules`). El editor abre el checkout con la invitación ya
  elegida.
- Free queda como plan de **borrador** (`code: "free"` se conserva para no tocar
  datos ni migraciones). `publishTrialDays → null`; actualizar copy de
  `plans.ts`, `pricing/page.tsx:166` y las **3 pruebas** acopladas al demo
  (cambiarlas es intencional: son pruebas de contrato).
- Compatibilidad: `is_entitlement_active` / `get_public_invitation` no cambian;
  los entitlements Free ya creados siguen vigentes hasta expirar.
- Checkout: modo invitado de Mercado Pago, OXXO/SPEI/MSI visibles, **precio total
  mostrado desde antes del editor** (Baymard: costos inesperados = 39% de abandono).
- Aceptación: publicar sin plan **no** hace pública la invitación (404 para
  invitados, medido) y sí ofrece pagar; publicar con plan funciona; una demo
  vieja sigue abierta.

### Fase 4 — Vista previa privada compartible (reemplaza el valor de la demo)
- Liga con token para que el anfitrión se la enseñe a su pareja/familia, **sin**
  RSVP real, con marca «Vista previa» y que no sirve para repartirla.
- **Probable migración de Supabase** (columna/tabla de token) → §34: se detiene
  aquí a pedir decisión antes de escribir SQL.
- Aceptación: la liga abre sin sesión, no aparece en sitemap ni indexada, y se
  puede revocar.

### Fase 5 — Recuperar abandono
- Correo al borrador sin publicar (24 h, 3 días, 7 días antes del evento).
  Requiere consentimiento y baja (LFPDPPP); revisar `privacidad`/`terminos`.

## 4. Riesgos

| Riesgo | Mitigación |
|---|---|
| Competidores con «gratis con marca de agua» (Olivia Estudio, Invitar.com.mx) parecen más baratos | La vista previa privada (Fase 4) y mostrar el precio por evento; el mercado mayoritario ya cobra al publicar ($249–$300) |
| Fricción del correo al elegir plantilla | Google en un clic; conservar la plantilla (Fase 2); medir `plantilla_elegida → registro_completo` |
| Romper demos vivas | Fase 0 las cuenta; nada se despublica; pruebas de que `get_public_invitation` no cambia |
| Redirección abierta vía `next` | Validar ruta interna estricta + prueba mutada |
| Dos agentes editando lo mismo | Ver §5 |

## 5. Reparto con Codex (si trabaja en paralelo)

Coordinación solo por git: **un worktree y una rama por agente**, partiendo de
`origin/main`; este archivo es el punto de acuerdo.

| Zona | Archivos | Dueño propuesto |
|---|---|---|
| Editor / canvas | `src/components/editor/**`, `src/lib/editor/**` | Codex |
| Billing / publicar | `src/lib/billing/**`, `invitations/actions.ts`, `app/billing/**`, `pricing/**` | Claude |
| Auth / intención | `src/lib/auth/**`, `app/(auth)/**`, `app/auth/**` | Claude |
| Galería pública | `app/plantillas/**`, `app/plantilla/**`, landing | a acordar |

Regla: nadie toca la zona del otro sin avisarlo aquí.

## 6. Fuentes (qué respalda qué, y con cuánta confianza)

- Forzar cuenta: 19% abandonó por eso — [Baymard](https://baymard.com/blog/reduce-cart-abandonment) (dato propio; es de checkout, no de editores). Costos inesperados 39%.
- Modo invitado y abandono en México — [Mercado Pago](https://www.mercadopago.com.mx/blog/como-reducir-abandono-carrito-de-compras) (cualitativo).
- «Diseña gratis, paga al publicar» ya es el modelo local: [Invitaplus](https://www.invitaplus.mx/) $249, [Invitarme](https://invitarme.com.mx/) $300, [Invita Fiestas](https://invitafiestas.com/) $249; [Invitio Chile](https://invitio.cl/).
- Freemium/trial: [ChartMogul](https://chartmogul.com/reports/saas-conversion-report/) (≈200 respuestas; cifras orientativas).
- Edición anónima (descartada por ahora): [Supabase anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous) — exige CAPTCHA, RLS con `is_anonymous` y limpieza manual.
- Pagos MX: [Antom](https://www.antom.com/guides/markets/mexico), [Rebill](https://www.rebill.com/blog/main-payment-methods-in-mexico) (las fuentes discrepan en el peso del efectivo).
- **Sin evidencia primaria**: ningún estudio comparó «registrarse al elegir plantilla» contra «registrarse antes» para editores; la recomendación es inferencia propia respaldada por Baymard, no por un A/B.

## 7. Preguntas abiertas

1. ¿La galería pública debe ser indexable (SEO) o seguir `noindex` al inicio?
2. ¿Qué se le dice a quien tenga una demo viva cuando expire? (depende de Fase 0)
3. ¿Quién de los dos agentes toma la galería pública (Fase 1)?
