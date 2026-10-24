# 07 · Embudo comercial e instrumentación

Fecha: 24 oct 2026. Fuentes: lectura del código (`invitation-editor.tsx`, `invitado.ts`, `setPublished`, `billing/*`), uso del flujo en local y en producción, y la medición agregada de `scripts/medir-embudo.mjs` (solo lectura, sin datos personales).

## 1. Línea base medida en producción [MEDIDO, 24 oct 2026]

| Dato | Valor |
|---|---|
| Cuentas (`profiles`) | 17 |
| …que crearon al menos una invitación | 10 (7 nunca crearon una) |
| Invitaciones creadas | 11 (3 desde plantilla, 8 en blanco) |
| Publicadas ahora | 3 |
| Órdenes | 1 pagada, 1 reembolsada, 3 fallidas, 3 pendientes, de hace 73–74 días |
| Tráfico | Vercel Web Analytics por ruta (no revisado) y Search Console: 378 impresiones, 0 clics |

Lectura prudente: **estas cifras incluyen las cuentas y órdenes de prueba del equipo** y no puedo separarlas. Las órdenes de hace 73–74 días son coherentes con pruebas de pago [ESTIMACIÓN]. No hay base para decir que el embudo convierte mal: no ha pasado tráfico real.

## 2. Recorrido actual, paso a paso [CÓDIGO y uso]

Visitante → landing → galería → (ficha, opcional) → «Usar esta plantilla» → editor como invitado → edita → Publicar → lista previa → «Publicar de todos modos» → modal de cuenta → (correo: enviar, abrir, confirmar) o Google → vuelve al editor → Publicar otra vez → lista previa otra vez → (si falta plan) elegir plan → Mercado Pago → confirmación → publicada.

- **Hasta el primer cambio en el editor:** 3 a 4 clics (muy corto frente a registrarse primero).
- **Hasta pagar:** 11 pasos con Google y 14 a 16 con correo [ESTIMACIÓN por conteo del flujo].

## 3. Fricción y confusión

| # | Fricción | Impacto probable | Corrección |
|---|---|---|---|
| F1 | La verificación de correo saca a la persona del flujo (abrir el correo, volver) | Alto | Ofrecer Google primero; al volver, **reanudar la publicación** en vez de pedir otro clic |
| F2 | La lista previa a publicar aparece **dos veces** (antes y después de crear la cuenta) | Medio | No repetirla si ya se confirmó |
| F3 | El plan se elige al final; la persona vio un precio por plantilla pero puede necesitar otro plan según los módulos que usó | Medio | Recomendación de plan visible dentro del editor («con lo que usas, te toca Celebración, $399») |
| F4 | El QR y su plan no se explican | Alto para quien lo busca | Ver `01` §5 |
| F5 | El pago ocurre en una página de Mercado Pago sin contexto de confianza previo | Medio | Señales de confianza antes de salir: método de pago, pago único, qué pasa al pagar |
| F6 | No se informa cuánto tarda la activación ni qué pasa si el pago queda pendiente | Medio | Página de pendiente clara (existe `/billing/pending`); comprobar texto y correo de confirmación |
| F7 | Sin analítica no se sabe en cuál de estos pasos se pierde la gente | Alto | Sección 4 |

Información que falta: qué incluye cada plan en lenguaje de beneficios, qué pasa después de publicar (cómo compartir, cómo ver confirmaciones), duración de la vigencia, formas de pago aceptadas, cómo pedir ayuda.

## 4. Instrumentación propuesta

### Estado actual
Solo **Vercel Web Analytics** (sin cookies, agregado) y dos eventos propios: `editor_abierto` y `publicar_tocado`. No hay GA4, GTM, Meta Pixel ni monitoreo de errores. Search Console: se asume verificado por el dueño; no pude comprobarlo.

### Arquitectura recomendada
1. **Primera parte (propia):** una tabla `funnel_events` en Supabase con inserciones solo desde el servidor, sin datos personales, para contar el embudo aunque haya bloqueadores de anuncios. Es la fuente de verdad del embudo interno.
2. **Google Analytics 4 con Google Tag Manager** para fuentes de tráfico, campañas y conversión a Google Ads o Meta cuando haya campañas. Gratis, se integra con Search Console. Alternativa si se prefiere privacidad: Plausible o PostHog (de pago o autoalojado; fuera del alcance de esta decisión).
3. **Compra confirmada desde el servidor:** el evento `purchase` se envía solo cuando el webhook verifica el pago (con el Protocolo de Medición de GA4 y `transaction_id` igual al `order_id`), nunca desde el navegador al volver de Mercado Pago.
4. **Monitoreo de errores:** Sentry u otro, con prioridad en el webhook, el checkout y la publicación.
5. Mantener Vercel Web Analytics.
6. **Privacidad:** ningún nombre, correo, teléfono, texto de invitación ni datos de invitados se envía a plataformas. Parámetros acotados (identificadores de plantilla, plan, evento, moneda). El aviso de privacidad debe mencionar la analítica; si se activa publicidad con remarketing, revisar el consentimiento.

### Eventos

| Evento | Disparador | Parámetros permitidos | Finalidad | Validación | Prevención de duplicados |
|---|---|---|---|---|---|
| `page_view` | Carga de ruta pública | `page_path`, `source`, `medium`, `campaign` | Visitas y fuentes | Lista de rutas permitidas; sin query con datos personales | Por navegación; GA4 lo maneja |
| `view_category` | Entrada a un pilar de evento o filtro de galería | `event_type` | Intención por evento | `event_type` en la lista de 9 tipos | Una vez por vista de página |
| `view_template` | Abrir la ficha o la vista rápida | `template_slug`, `event_type` | Plantillas más vistas | `template_slug` existe y está activa | Una por plantilla y sesión |
| `start_customization` | Éxito de `empezarComoInvitado` o de «Usar» con sesión | `template_slug`, `event_type`, `is_guest` | Inicios reales de personalización | Solo si se creó la invitación | Clave por `invitation_id`, una vez |
| `sign_up` | Conversión de invitado a cuenta (correo confirmado o Google) | `method` | Registros | Solo tras verificación de correo o retorno de Google | Una por `user_id` |
| `complete_draft` | Se alcanzan los puntos esenciales (nombres, fecha, lugar, foto) | `template_slug`, `modules_count` | Borradores completos | Cálculo en servidor con `getPublishPreflight` | Una por invitación |
| `view_pricing` | Carga de `/pricing` o del selector de plan en el editor | `from` (página o editor) | Intención de compra | — | Una por sesión y origen |
| `begin_checkout` | Se crea la orden en `createPlanCheckout` | `plan_code`, `value`, `currency` | Pagos iniciados | Orden creada con éxito; valor desde `plans.ts`, no del cliente | Clave por `order_id` |
| `payment_failed` | Webhook o reconciliación marca la orden como fallida o rechazada | `plan_code`, `reason_code` | Fricción de pago | Solo desde el servidor | Clave por `order_id` y estado |
| `purchase` | Pago verificado en el backend y entitlement activo | `transaction_id`, `plan_code`, `value`, `currency` | Ingresos y conversión | Firma del webhook válida; orden `paid`; monto igual al esperado | `transaction_id = order_id`, una sola vez |

Eventos adicionales útiles: `publish_attempt` (existente como `publicar_tocado`), `publish_success`, `invitation_shared`, `rsvp_submitted` (sin identificar al invitado), `guest_checkin`.

### Panel de métricas comerciales (administrativo)
Fuentes: `funnel_events` (embudo), tablas `orders` y `invitation_entitlements` (ingresos), GA4 o Vercel (visitantes y fuentes).

| Métrica | Fuente |
|---|---|
| Visitantes y fuentes de tráfico | GA4 o Vercel Analytics |
| Usuarios registrados | `profiles` sin invitados |
| Plantillas más vistas | `view_template` |
| Invitaciones iniciadas y borradores completados | `start_customization`, `complete_draft` |
| Pagos iniciados | `begin_checkout` |
| Compras confirmadas e ingresos | `orders` pagadas |
| Tasa de conversión visita → compra y por paso | Embudo |
| Abandonos entre pasos | Diferencias del embudo |

Esfuerzo: M (3 a 5 días) para la tabla de eventos, los 10 disparos y una vista en `/admin`; S para la configuración de GA4 y Search Console.
