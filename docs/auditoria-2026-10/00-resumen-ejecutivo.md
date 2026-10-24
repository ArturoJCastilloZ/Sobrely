# 00 · Resumen ejecutivo

**Sobrely · auditoría estratégica, comercial, SEO y UX · 23–24 oct 2026**
Rama: `docs/auditoria-estrategica` (solo documentación; no se tocó código de producción).

## En diez líneas

1. **El problema principal es el tráfico, no el producto ni el precio.** Menos de 100 visitas en dos meses y 378 impresiones en Search Console (posición media 36.5, cuarta página) no permiten concluir que el producto, los precios o el checkout fallen: casi no ha pasado gente por el sitio.
2. **El producto está más avanzado de lo que su visibilidad sugiere:** editor con 65 plantillas, edición sin cuenta, lista de invitados con QR, 1,656 pruebas en verde, planes y pagos implementados.
3. **Lo que impide vender hoy** es verificable y pequeño: el pago real nunca se comprobó de punta a punta, no hay analítica del embudo, no hay monitoreo de errores, y la promesa del QR se contradice entre el código, `/pricing` y la landing.
4. **El precio de entrada de $199 es competitivo, no diferenciador.** Convite cuesta $199, Festea $179, Evently $149; Invitto regala el QR. Se gana por valor (catálogo de 65, QR, edición sin cuenta, pago único), no por precio.
5. **SEO:** la base técnica es sólida (robots, sitemap, canonical, datos estructurados, redirecciones). Los huecos son de autoridad y cobertura de intenciones, más una vista previa social rota en `/pricing` y las 5 landings.
6. **Rendimiento:** la home no se cachea en el borde y cada página descarga **409 KB de fuentes** (14 archivos) que solo necesita el editor. No medí Core Web Vitals (cuota de PageSpeed agotada).
7. **Embudo:** de la landing al pago hay de 11 a 16 pasos; la verificación de correo y una lista previa que aparece dos veces son las fricciones más claras.
8. **Marketing:** con presupuesto y tiempo limitados, el camino con mejor relación es **ventas por conversación y alianzas** durante 30 días, no anuncios. Una venta no pierde dinero solo si la conversión visita→compra supera cerca de 1.7 % (con $5 por clic, supuesto).
9. **Servicio asistido:** ya existe como solicitud manual dentro del panel (desde $1,499 el express). Un paquete de $999 puede funcionar si cada cliente consume 2 horas o menos; se valida con 5 clientes piloto.
10. **No hacer:** migrar de framework, volver el editor un Canva, rediseñar por estética, invertir en anuncios sin checkout verificado, ni afirmar resultados con muestras diminutas.

## Qué cambiar primero, por qué, cuánto cuesta y cómo medirlo

| # | Cambio | Por qué | Esfuerzo | Cómo medir si funcionó |
|---|---|---|---|---|
| 1 | **Pago real chico con tarjeta propia + reembolso**, y confirmar variables y crons de producción | Es el riesgo más caro: si el cobro falla, se pierde la primera venta y la confianza | S · 1 día | 1 orden `paid` con invitación pública y 1 `refunded` reflejado |
| 2 | **Resolver la promesa del QR** (qué plan lo incluye) y alinear código, `/pricing`, landing y blog | Es el diferenciador y hoy se contradice | S · 1–2 días | `grep` sin contradicciones |
| 3 | **Analítica del embudo + monitoreo de errores + Search Console al día** | Sin esto no se aprende de nada | M · 4–6 días | Los 10 eventos disparan una vez; embudo visible en `/admin` |
| 4 | **`og:image` en `/pricing` y las landings**, y verificar indexación de las 17 URLs | Compartir y ser indexado son requisitos de visibilidad | S · 1 día | 11 etiquetas OG; páginas indexadas ≥ 15 |
| 5 | **Quitar el peso de las fuentes y cachear home y landings** | Páginas más rápidas, mejor para móvil y SEO | M · 2–4 días | Fuentes < 100 KB; `HIT` en caché; LCP medido antes y después |
| 6 | **Primeros 5 a 10 clientes por conversación y alianzas**, con servicio asistido piloto | Sin ventas no hay datos de conversión; es el canal más barato | M · continuo | Ventas confirmadas, fuente registrada |

Después, en este orden: precios A, ficha A, editor C, catálogo A, páginas por intención, demostración en la landing (ver `10`).

## Las tres revisiones y sus contradicciones

| | Técnica: ¿qué se puede demostrar? | Comercial: ¿qué contribuye a la primera venta? | Experiencia: ¿es más fácil y confiable? |
|---|---|---|---|
| Hero y secciones nuevas | Ya hechas; añaden una consulta a una página dinámica | Sin tráfico no hay cómo probar su efecto | Mejor primera impresión visible |
| Demo interactiva | Pesa sobre 409 KB de fuentes | Alta atracción | Excelente | 
| Anuncios | Sin medición no se puede evaluar | Pueden perder dinero (necesitan ~1.7 % de conversión) | Neutro |
| QR al frente | Trivial | Es el diferenciador | Claro | 
| Editor guiado | Duplica flujos | Más borradores completos | Mejor para principiantes |

**Contradicciones encontradas y cómo se resolvieron**
- *Comercial pedía subir el diferenciador (QR) a la portada; técnica mostró que el código y `plans.ts` no coinciden.* → Se resolvió bloqueando la promesa hasta decidir el plan (T02).
- *Experiencia pedía una demo interactiva en la landing; técnica midió 409 KB de fuentes y una home sin caché.* → La demo pasa a la segunda etapa; primero se alivia el peso (T10).
- *Comercial quería lanzar anuncios pronto; el análisis de costos dice que sin conversión medida pueden costar más que cada venta.* → Los anuncios quedan condicionados al pago verificado y a la analítica.
- *Mi propio cambio del hero agregó una consulta a una home que ya es dinámica.* → Se registra como deuda y se recomienda cachear en T10; no se retira porque el beneficio visual es real.

## Decisiones que necesito de ti

1. ¿Qué plan incluye el QR y el check-in (todos, o desde Celebración o Premium)?
2. ¿Estrategia local (Monterrey y área metropolitana) o nacional? Hoy el sitio declara local en el JSON-LD y el pie, y vende a todo México.
3. ¿Fecha de cierre de la campaña de lanzamiento (precios tachados)?
4. ¿Autorizas el pago real de prueba y el reembolso (T01)?
5. ¿Qué dirección visual aprobar de las 15 alternativas (ver `05`)?
6. ¿Autorizas sesiones con usuarios y un piloto asistido con 5 clientes?
7. ¿Datos de costos para cerrar el modelo (tarifa de Mercado Pago, planes de Vercel y Supabase, tu costo por hora)?

## Límites de este análisis

- **No tuve acceso a Search Console, GA4, Mercado Pago ni al panel de Vercel y Supabase.** Los datos de Search Console son los que diste.
- **No se probaron dispositivos reales ni tablet**; el móvil fue un viewport emulado de 375 px.
- **No medí Core Web Vitals:** la API de PageSpeed devolvió cuota excedida.
- **Los competidores se leyeron en sus páginas públicas** con herramientas que devuelven resúmenes; no se probaron sus editores ni se creó ninguna cuenta. No hay volúmenes de búsqueda verificados.
- La medición del embudo de producción incluye pruebas internas y no distingue clientes reales.
- Las estimaciones de esfuerzo, impacto y costos están marcadas como tales.

## Skills utilizadas y huecos

Usadas: `redesign-existing-projects`, `ux-heuristics`, `mkt-seo-audit`, `paid-media`, `behavioral-nudge`, `brand-guardian`, `artifact-design`, `verification-before-completion`, `better-writing` y `frontend-ui-engineering` (esta sesión), más tres investigadores en paralelo (competidores internacionales, mexicanos y SEO).
Disponibles y no ejecutadas por falta de datos o de decisión: `mkt-write-copy`, `mkt-content-calendar`, `estimate-budget`, `estimate-duration`, `web-quality-audit`, `core-web-vitals`, `cognitive-walkthrough`, `persona-walkthrough`, `threat-modeling`, `owasp-audit`.
**Huecos:** no hay una skill de creación de imágenes (las maquetas son HTML y CSS, no arte); tampoco una de modelado financiero (el modelo se calculó con un script y supuestos explícitos); y no instalé nada nuevo de internet porque cualquier skill externa exige antes una auditoría de seguridad y las tres condiciones de código abierto, y las existentes cubrieron el trabajo. Si quieres, busco e instalo una de imágenes tras ese proceso.

## Índice

`01-auditoria-tecnica` · `02-auditoria-seo` · `03-benchmark-competitivo` · `04-auditoria-uiux` · `05-propuestas-visuales` (con el prototipo interactivo en `prototipos/`) · `06-analisis-editor` · `07-embudo-y-analytics` · `08-estrategia-marketing` · `09-estrategia-financiera` · `10-roadmap-90-dias` · `11-plan-experimentacion`
