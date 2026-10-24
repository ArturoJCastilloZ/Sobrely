# 01 · Auditoría técnica

Fecha de los datos: 23–24 oct 2026. Rama de trabajo: `docs/auditoria-estrategica`. No se modificó código de producción.

Etiquetas de evidencia: **[MEDIDO]** lo medí yo en producción o en el entorno local; **[CÓDIGO]** leído en el repositorio; **[REPORTADO]** lo dijo el dueño y no pude comprobarlo; **[NO VERIFICABLE]** exige acceso o herramientas que no tuve.

## 1. Arquitectura y dependencias [CÓDIGO]

| Pieza | Valor |
|---|---|
| Framework | Next.js 16.3.0 (App Router, Server Actions), React 19.2.8. No es una SPA de React puro: el HTML inicial ya trae el contenido (ver SEO) |
| Estilos | Tailwind 4, `@base-ui/react`, framer-motion 13, `@dnd-kit/core` |
| Datos y auth | Supabase (Postgres + RLS + Auth + Storage), `@supabase/ssr` 0.12.4, 62 migraciones |
| Pagos | Mercado Pago (`mercadopago` 3.3), webhook firmado, cron de reconciliación |
| Tamaño | 428 archivos TS/TSX, 111 archivos de prueba, 1656 pruebas que pasan (`vitest` 4.1) |
| Despliegue | Vercel, 3 crons (`recordatorios`, `reconciliar-pagos`, `limpiar-invitados`) |
| Observabilidad | Solo Vercel Web Analytics con 2 eventos propios. **No hay** GA4, GTM, Meta Pixel ni Sentry |

## 2. Rutas

Públicas: `/`, `/plantillas`, `/plantillas/[slug]` (noindex), `/plantilla/[slug]` (noindex, duplicada), `/pricing`, 5 landings de evento, `/blog` y `/blog/[slug]`, `/privacidad`, `/terminos`, `/[username]/[invitationSlug]` (invitación publicada), `/r/[token]` (RSVP), `/g/[token]` (invitado), `/vista-previa/[token]` (vista privada), `/recordatorios/baja`.
Privadas: `/dashboard/*`, `/editor/[id]`, `/admin`, `/billing/*`. Auth: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/*`.
API: webhook de Mercado Pago, 3 crons, `/api/health`, baja de recordatorios.

Hallazgo: hay **dos rutas para la ficha de plantilla** (`/plantilla/[slug]` y `/plantillas/[slug]`); la segunda reutiliza a la primera. Ambas son `noindex`, así que no dañan, pero es deuda de mantenimiento.

## 3. Estado de cada funcionalidad

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Landing | Operativa y comprobada | [MEDIDO] 200, 1 H1, JSON-LD, sin desborde a 375 px. Hero y secciones nuevas en producción desde el 24 oct |
| Catálogo `/plantillas` | Operativa con problemas | [MEDIDO] 65 plantillas, 1 filtro (evento); 14 900 px de alto en móvil; HTML de 376 KB; sin filtros de estilo/precio |
| Ficha de plantilla | Operativa | [MEDIDO] noindex, sin canonical; sin resumen de lo que incluye |
| Editor | Operativo y comprobado | [MEDIDO] abre desde plantilla en 2 clics; guardado; barra inferior móvil; vista previa Móvil/Escritorio; deshacer/rehacer |
| Edición sin cuenta | Operativa y comprobada | [MEDIDO] visitante limpio en producción llega al editor; conversión por correo conserva el mismo `user_id`; traslado a cuenta existente probado en local |
| Google tras el arreglo | Operativa [REPORTADO] | El dueño la probó en su Docker contra la base de producción y dijo que funciona |
| Publicación | Operativa | [CÓDIGO] `setPublished` con puerta por plan, lista previa, `needsAccount`, `needsPayment`; trigger en base impide publicar a invitados |
| Planes y precios | Operativa con inconsistencias | [CÓDIGO] `plans.ts`: Esencial $199 (regular $299), Celebración $399 ($499), Premium $699 ($899). Ver §5 |
| Checkout Mercado Pago | Implementada; E2E real no verificable | [CÓDIGO] orden, webhook, `fulfillment`, reconciliación. [MEDIDO] la base tiene 1 orden `paid` y 1 `refunded` de hace 73–74 días, más 3 `failed` y 3 `pending`; no puedo distinguir pruebas de clientes. La lista `docs/checklist-pagos-reales.md` pide un pago real chico antes de aceptar ventas |
| Webhook y reconciliación | Implementada con pruebas unitarias; activación [NO VERIFICABLE] | Depende de variables en Vercel (`RECONCILE_ENABLED`, `CRON_SECRET`) que no vi |
| Panel de usuario | Operativo | [CÓDIGO]/[MEDIDO] borradores, estados, recordatorios, facturación, referidos |
| Panel admin | Operativo, limitado | [CÓDIGO] `get_admin_metrics`: ingresos, órdenes, conversión. No tiene embudo por fuente ni vistas por plantilla |
| Lista de invitados, QR y check-in | Implementada | [CÓDIGO] `invitation_guests`, `/dashboard/invitations/[id]/checkin`; la página de check-in no consulta el plan |
| Servicios asistidos | Implementada como solicitud manual | [CÓDIGO] `services.ts`: configuración por WhatsApp $299, portada a la medida desde $499, carga de fotos y textos $299, renovación desde $199, invitación express creada por el equipo desde $1,499. Solo se ven dentro del panel de facturación; `/pricing` los menciona en una nota |
| Referidos | Implementada | [CÓDIGO] crédito de $50 por referido; sin evidencia de uso |
| Recordatorios por correo | Implementada, gated por entorno | [NO VERIFICABLE] variables de Vercel pendientes según las notas del proyecto |
| Álbum colaborativo | No implementada (decisión del dueño) | Solo existe la tabla `invitation_album_photos` (0 filas); ver `album-dormido` |
| Analítica avanzada, dominio propio | No implementadas | [CÓDIGO] aparecen como «próximamente» en `plans.ts` |
| Monitoreo de errores | No implementado | [CÓDIGO] no hay Sentry ni equivalente |

## 4. Seguridad, permisos y privacidad

Verificado en esta sesión con sesiones reales contra la base local y contra producción (lectura):

- RLS: un invitado no lee, edita ni borra lo de otro invitado (3 pruebas, 0 filas) [MEDIDO].
- Un invitado no puede publicar ni por la API directa: el trigger `ANONIMO_NO_PUBLICA` lo rechaza [MEDIDO].
- Topes de invitado: 3 borradores y 20 archivos, bucket limitado a JPEG, PNG, WebP y GIF de hasta 10 MiB (migración 0062, aplicada y comprobada en producción) [MEDIDO].
- Cabeceras de producción [MEDIDO]: HSTS presente (sin `preload`), `X-Frame-Options: sameorigin`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. **No hay Content-Security-Policy**; `next.config.ts` lo deja pendiente a propósito.
- Webhook de pago con firma y reconciliación diaria [CÓDIGO]; el cron de limpieza de invitados tiene sus puertas (`CRON_SECRET`, bandera, simulacro) [MEDIDO en local].

Riesgos abiertos:
1. **Revisión humana pendiente** del código de autenticación y de las políticas de la migración 0062. Está en producción sin esa revisión.
2. **Sin CAPTCHA** en el inicio de sesión anónimo: alguien puede crear invitados en masa. Lo acotan el límite de Supabase de 30 por hora por IP, los topes de la migración y el cron de limpieza (aún apagado). Riesgo aceptado, a revisar si aparece abuso.
3. **Sin CSP** y sin monitoreo de errores: si algo falla en el checkout, hoy nadie se entera por sí solo.
4. `service_role` solo en servidor [CÓDIGO]; los scripts locales leen `.env.local` de producción, lo que exige disciplina (el `compose.dev.yaml` nuevo lo evita).

## 5. Inconsistencias de precio y promesa (críticas para la confianza)

1. **QR de acceso:** `plans.ts` lista «Invitados nominales con link único y QR de acceso» solo en **Premium ($699)**; el código de `guests/actions.ts` dice que «el modo lista está en todos los planes» y la página de check-in no consulta el plan; `/pricing` no menciona el QR. La landing y la descripción SEO lo promocionan sin decir en qué plan va. **Decisión del dueño necesaria:** qué plan lo incluye, y alinear código, `plans.ts`, `/pricing`, la landing y el blog.
2. **«Borradores ilimitados»:** es cierto con cuenta; un invitado sin cuenta tiene tope de 3.
3. **Precios de lanzamiento:** la campaña tacha $299, $499 y $899. `NEXT_PUBLIC_LAUNCH_CAMPAIGN_END_DATE` decide cuándo terminan; conviene fijarla y comunicarla, y no usar descuentos permanentes como ventaja (ver finanzas).
4. **Alcance geográfico:** el JSON-LD y el pie declaran «Monterrey y área metropolitana» como zona de servicio, pero el producto es nacional y digital. Es una decisión consciente (perfil de Google Business), pero limita el mensaje; ver SEO.

## 6. Rendimiento y accesibilidad

Rendimiento [MEDIDO en producción, una muestra, desde esta máquina]:
- TTFB de 0.18 a 0.36 s; HTML comprimido de 18 KB en la home.
- La home responde `cache-control: private, no-cache, no-store` y `x-vercel-cache: miss`: **es dinámica en cada visita** porque lee la sesión para decidir los botones. No se sirve desde la caché de borde. Mi cambio del hero agregó una consulta de plantillas a esa misma carga.
- **14 archivos de fuente se descargan en cada página, incluida la landing: 409 KB**, más que el JavaScript (184 KB) y el CSS (26 KB). Son las fuentes decorativas del editor (Dancing Script, Pacifico, Great Vibes, Bebas Neue, Abril Fatface, etc.) cargadas globalmente desde el layout raíz. Las 3 miniaturas del hero pesan 71 KB.
- Lighthouse y Core Web Vitals de campo: **no medidos**. La API de PageSpeed devolvió «cuota excedida» y el panel integrado no es fiable para tiempos. Hay que medir en pagespeed.web.dev antes y después de cambiar.

Accesibilidad e interacción táctil [MEDIDO, viewport emulado de 375 px, no dispositivos reales]:
- Sin desborde horizontal en landing, blog, landing de evento, plantillas, precios y legales.
- Botones del encabezado público: 28 px de alto; interruptor de tema, 32 px; en el editor móvil, Volver, Deshacer, Rehacer y Publicar miden 28 px de alto. Cumple el mínimo de WCAG 2.2 AA (24 px) pero queda lejos de los 44 px recomendados para el pulgar. Los filtros de la galería sí miden 44 px.
- No se probó con lector de pantalla, ni se midió contraste con herramienta.

## 7. Calidad y estabilidad

- 1656 pruebas pasan en 110 archivos, con guardas estructurales (por ejemplo, que ninguna escritura declare éxito con 0 filas). Es una base sólida.
- No hay pruebas de extremo a extremo en CI; hay scripts de Playwright manuales en `scripts/`.
- Sin monitoreo de errores en producción: es el hueco más barato de cerrar.

## 8. Qué NO es un problema (para no gastar tiempo)

- **No hace falta migrar de framework ni prerenderizar:** el HTML inicial ya contiene el contenido, los títulos y el JSON-LD.
- Las 65 plantillas cargan y se ven bien; la complejidad del editor no es, por sí sola, una falla.
