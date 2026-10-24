# 10 · Roadmap de 90 días

Reglas: prioridad **P0** = bloquea vender o medir; **P1** = mueve conversión o adquisición; **P2** = optimiza o escala. Complejidad: S (1–2 días), M (3–6), L (7+). El tiempo es una estimación para un desarrollador que conoce el código y no incluye espera de terceros. Nada se ejecuta hasta que apruebes la dirección. Los KPI son metas de seguimiento, no pronósticos de ventas.

Dependencia transversal: **ninguna inversión pagada (T24, T30, T32) antes de T01 y T05**.

## Días 1–14 · Fundamentos

| ID | P | Tarea | Problema que resuelve | Complejidad · tiempo | Depende de | Riesgo | Criterio de aceptación | KPI |
|---|---|---|---|---|---|---|---|---|
| T01 | P0 | Pago real chico de punta a punta con tarjeta propia, más reembolso; confirmar variables de producción de pagos y crons | Nadie ha verificado que el cobro funcione con dinero real; sin eso, cada venta es un riesgo | S · 1 día | Credenciales de producción de Mercado Pago | Dinero real; usar monto mínimo y reembolsar | Orden `paid`, entitlement activo e invitación pública visible; reembolso reflejado como `refunded`; webhook con firma válida en logs | 1 pago real confirmado y 1 reembolso reflejado |
| T02 | P0 | Decidir qué plan incluye el QR y alinear `plans.ts`, `/pricing`, landing, blog y descripción SEO | La promesa del QR es inconsistente (ver `01` §5) | S · 1–2 días | Decisión del dueño | Prometer lo que el código no permite o viceversa | Una sola afirmación del QR en todas las superficies, verificada por `grep` y en producción | 0 contradicciones entre código y copy |
| T03 | P0 | `og:image` y tarjetas de Twitter en `/pricing` y las 5 landings | Vista previa sin imagen al compartir | S · 0.5 día | — | Bajo | 11 etiquetas OG y 8 de Twitter en las 6 páginas; prueba con el depurador de Facebook | Vista previa con imagen en WhatsApp y Facebook |
| T04 | P0 | Monitoreo de errores (checkout, webhook, publicar, auth) | Nadie se entera de un fallo de pago | S · 1 día | Cuenta de la herramienta | Datos personales en los reportes | Un error provocado llega con contexto y sin datos personales | Tiempo de detección < 1 h |
| T05 | P0 | Analítica: tabla `funnel_events`, los 10 eventos, GA4 por GTM, Search Console verificado y sitemap enviado | No se puede saber dónde se pierde la gente ni de dónde viene | M · 3–5 días | T04 (opcional) | Datos personales en eventos; duplicados | Los 10 eventos disparan una vez, con parámetros permitidos; `purchase` solo desde el servidor | Embudo completo visible en `/admin` |
| T06 | P0 | Comprobar la indexación de las 17 URLs y pedir indexación de las no indexadas | 378 impresiones y 0 clics: puede que muchas páginas no estén indexadas | S · 2 horas | T05 (Search Console) | — | Informe de cobertura anotado; páginas indexadas ≥ 15 | Páginas indexadas |
| T07 | P0 | Consistencia de precios y textos: fecha de cierre de campaña, «borradores ilimitados», nota de servicios | Textos que se contradicen dañan la confianza | S · 1 día | T02 | Cambiar el precio efectivo sin querer | Sin contradicciones entre `plans.ts`, `/pricing`, landing y panel; fecha de campaña publicada | 0 contradicciones |
| T08 | P0 | Revisión humana del código de autenticación y de la migración 0062 (ya en producción) | Está en producción sin la revisión que exige un dominio crítico | S · 0.5–1 día de un revisor | — | Hallazgos que obliguen a cambios | Informe de revisión con pendientes cerrados | Hallazgos críticos = 0 |
| T09 | P1 | Medir Core Web Vitals de línea base (PageSpeed y campo si hay datos) | No hay medición de rendimiento | S · 2 horas | — | — | Informe guardado con fecha y valores móvil y escritorio | LCP, INP, CLS anotados |
| T10 | P1 | Sacar las fuentes decorativas del layout raíz; cachear la home y las landings | 409 KB de fuentes y una home que no se cachea | M · 2–4 días | T09 | Romper tipografías de las invitaciones | Fuentes decorativas solo en editor e invitaciones; home con `x-vercel-cache: HIT`; invitaciones intactas | Peso de fuentes < 100 KB; LCP mejora frente a T09 |

## Días 15–30 · Conversión

| ID | P | Tarea | Problema que resuelve | Complejidad · tiempo | Depende de | Riesgo | Criterio de aceptación | KPI |
|---|---|---|---|---|---|---|---|---|
| T11 | P1 | Precios A: plan recomendado, confianza, servicios asistidos visibles | El precio no se entiende en 5 segundos | S · 1–2 días | T02, T07 | Prometer garantías inexistentes | Revisión de copy contra el código; sin garantías no verificables | `begin_checkout` ÷ `view_pricing` |
| T12 | P1 | Ficha de plantilla A: qué incluye, precio, «edita sin cuenta» | Ficha sin resumen | S · 1–2 días | — | Bajo | Resumen de módulos e invitados correcto por plan | Usar ÷ vistas de ficha |
| T13 | P1 | Editor C: lista de progreso, áreas táctiles de 44 px, reanudar la publicación tras crear la cuenta y no repetir la lista previa | Pasos innecesarios y botones pequeños | M · 3–5 días | T05 | Afectar la publicación | Pruebas existentes en verde; recorrido manual de publicar, deshacer y guardar | `complete_draft` ÷ `start_customization` |
| T14 | P1 | Catálogo A: filtros de estilo y precio (etiquetar las 65 plantillas) | Galería de 14 900 px con un filtro | M · 4–6 días | — | Etiquetas inconsistentes | Filtros combinables con conteos correctos; cada plantilla etiquetada | Plantillas vistas por sesión |
| T15 | P1 | Servicio asistido piloto: formulario público, alcance definido (1 plantilla, 8 secciones, 2 revisiones, 48 h) y registro de horas | Cubrir a quien no quiere editar; validar el precio | S–M · 2–3 días | T01 | Horas ilimitadas | 5 clientes con horas y satisfacción registradas | Margen por cliente (ver `09`) |
| T16 | P1 | Sesiones con 5 a 8 personas, revisión en 3 dispositivos reales y pasada de accesibilidad | Hay hallazgos sin comprobar | S–M · 3 días | — | Sesgo de la muestra | Informe con problemas por gravedad | Problemas graves de uso corregidos |
| T17 | P2 | Landing B (tarjetas de evento); landing C cuando T02 esté resuelto | Camino más corto y diferenciador al frente | S · 1–2 días cada una | T02 para C | Contradecir el QR | Revisión de copy; sin desbordes a 375 px | De home a ver una plantilla |
| T18 | P1 | Prueba social real y fechada (casos con permiso, métricas honestas) | Nadie muestra testimonios reales | S · continuo | Primeros clientes | Inventar o exagerar | Cada afirmación con respaldo; con fecha | Visitas que llegan a precios |

## Días 31–60 · Adquisición

| ID | P | Tarea | Problema que resuelve | Complejidad · tiempo | Depende de | Riesgo | Criterio de aceptación | KPI |
|---|---|---|---|---|---|---|---|---|
| T19 | P1 | 4 páginas por intención (QR, confirmación de asistencia, sin registro, cuánto cuesta) | Cobertura de consultas con menos competencia | M · 6–8 días | T02, T05 | Contenido delgado o duplicado | Contenido propio, preguntas frecuentes, demostración y enlace al editor; `og:image` | Impresiones y posición por consulta |
| T20 | P1 | Colecciones por estilo con `ItemList` | Captar consultas de estilo sin duplicar fichas | M · 4–6 días | T14 | Texto repetido | Una intro única por colección; datos estructurados válidos | Impresiones de colecciones |
| T21 | P1 | 12 piezas de video corto (editor, antes y después, QR, precios) | Presencia y demostración del producto | S por pieza · continuo | Perfiles listos | Prometer de más | Cada pieza con gancho en 3 segundos y enlace con `utm` | Visitas desde redes; inicios de personalización |
| T22 | P1 | Alianzas: lista, oferta, enlaces con `utm`, 10 conversaciones y 3 acuerdos | El canal con mejor credibilidad y costo bajo | M · continuo | T05 | Comisión sin medición | Cada aliado con enlace propio; acuerdos por escrito | Visitas y compras por aliado |
| T23 | P1 | Primeros compradores: 5 a 10 ventas asistidas o por WhatsApp | Sin ventas no hay datos de conversión | M · continuo | T01, T15 | Dedicar demasiado tiempo | Cada venta con fuente registrada | Ventas confirmadas |
| T24 | P2 | Meta Ads de prueba: 2 audiencias, 3 creatividades, presupuesto acotado, 2 semanas | Probar un canal pagado con riesgo controlado | S–M · 3 días | T01, T05 | Gastar sin medir | Costo por inicio y por compra calculado | Costo por compra frente a la contribución (`09`) |
| T25 | P2 | Alta en directorios (BodasMexico, Bodas.com.mx, Wedding Whispers) | Enlaces y visibilidad | S · 1 día | Verificar condiciones y costo | Pago sin retorno | Perfiles creados con enlace | Visitas desde directorios |

## Días 61–90 · Optimización

| ID | P | Tarea | Problema que resuelve | Complejidad · tiempo | Depende de | Riesgo | Criterio de aceptación | KPI |
|---|---|---|---|---|---|---|---|---|
| T26 | P1 | Lectura mensual de datos y decisiones (qué canal duplicar, qué cortar) | Evitar decidir por intuición | S · 1 día | T05 | Concluir con poco volumen | Informe con cifras, periodo y límites | Decisiones documentadas |
| T27 | P2 | Demostración interactiva en la landing (alternativa A) | Aumentar la personalización iniciada | M · 4–6 días | T10, tráfico | Peso y LCP | LCP no empeora frente a T09 | Clic en «Probar con mi evento» |
| T28 | P2 | Experimentos A/B reales si el tráfico alcanza el umbral | Medir efectos con base estadística | M · 3–5 días | Miles de visitas (ver `11`) | Falsos positivos | Tamaño de muestra alcanzado antes de decidir | Mejora medida con intervalo |
| T29 | P2 | Aumento controlado de inversión en el canal con mejor costo por compra | Escalar con datos | S · continuo | T24, T26 | Pérdida si la conversión cae | Tope y regla de parada definidos | Costo por compra estable |
| T30 | P2 | Programa de comisión formal para aliados y panel para planners | Escalar el canal de alianzas | M–L · 7–10 días | T22 | Complejidad de pagos | Reglas y liquidaciones claras | Ventas por aliados |
| T31 | P2 | Remarketing | Recuperar visitas que no compraron | S–M · 2 días | ≥ 1,000 visitantes por audiencia y T05 | Privacidad | Consentimiento y exclusión de compradores | Costo por compra recuperada |
| T32 | P2 | Escalabilidad y endurecimiento: CSP, CAPTCHA si hay abuso, límites, revisión de costos de Supabase | Que el crecimiento no rompa el sitio | M · 4–6 días | T04 | Romper recursos legítimos con la CSP | Política en modo informe primero; pruebas de carga básicas | 0 incidentes por abuso o caída |

## Hitos de decisión

- **Día 14:** ¿hay pago real verificado, analítica y promesa del QR resuelta? Si no, no seguir con adquisición.
- **Día 30:** ¿hay al menos 1 venta y los 10 eventos funcionando? Si sí, abrir adquisición.
- **Día 60:** ¿qué canal trajo compradores y a qué costo? Duplicar uno, cortar los demás.
- **Día 90:** ¿la conversión se mide de punta a punta y hay un proceso repetible? Decidir inversión mayor.
