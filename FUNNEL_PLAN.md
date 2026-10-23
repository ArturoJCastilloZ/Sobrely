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

### Fase 1 — Galería pública que vende
- `/plantillas` pública (hoy la galería está en `/dashboard/templates`): filtro
  por evento, miniaturas, **precio visible** («desde $199 por evento») y CTA.
- `/plantilla/[slug]` con CTA «Usar esta plantilla» y vista en vivo; **indexable**
  (hoy `noindex`) solo si se resuelve el riesgo de contenido casi duplicado
  (canonical por tipo de evento) — decidir en la fase, con evidencia.
- Landing y menú apuntan a la galería, no a `/register`.
- Aceptación: un visitante sin sesión llega a una plantilla y ve precio + CTA
  sin pasar por login (verificado en Chrome, sesión cerrada).

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
