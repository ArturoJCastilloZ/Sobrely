# 02 · Auditoría SEO

Fecha: 23–24 oct 2026. Etiquetas: **[MEDIDO]** verificado en `https://sobrely.com`; **[CÓDIGO]**; **[ESTIMACIÓN]** inferencia mía; **[NO VERIFICABLE]**. Los datos de Search Console los dio el dueño y no pude abrirlos.

## 1. Lectura de los datos de Search Console

3 meses al 23 oct 2026: 378 impresiones, 0 clics, CTR 0 %, posición media 36.5.

- Una posición media de 36.5 significa que, cuando Google muestra el sitio, suele ser en la cuarta página. Con ese posicionamiento es normal no recibir clics. **No demuestra** que el contenido, los precios o el checkout sean malos.
- 378 impresiones en 3 meses son muy pocas: Google casi no asocia el dominio con consultas. Un dominio de 2 meses, sin enlaces externos conocidos y con 17 URLs en el mapa del sitio, se explica por sí solo [ESTIMACIÓN].
- La brecha no es de optimización fina de títulos: es de **autoridad, cobertura de intenciones y tiempo**.

## 2. SEO técnico

| Punto | Resultado [MEDIDO] |
|---|---|
| `robots.txt` | Correcto: permite `/`, bloquea paneles, editor, billing, API, auth y `/vista-previa`; declara el sitemap |
| `sitemap.xml` | 17 URLs: home, `/pricing`, `/plantillas`, 5 landings de evento, `/blog`, 6 artículos, 2 legales |
| Canonical | Presente en home, galería, precios, landings y blog; los privados y las fichas son noindex |
| Títulos | 28 a 59 caracteres, únicos por página. La home usa 57 |
| Meta descripción | 88 a 172 caracteres. `/pricing` tiene 110 y las landings 165–172 (algunas rozan el truncado de ~155–160) |
| H1 | Uno por página en las indexables. Las fichas de plantilla no tienen H1 (son noindex) |
| Datos estructurados | Home: `LocalBusiness`, `WebSite`, `FAQPage`. Landings: `FAQPage` y `BreadcrumbList`. Precios: `SoftwareApplication` con `AggregateOffer`. Blog: `Blog` y `BlogPosting`. **Galería: ninguno** |
| Open Graph y Twitter | Home, galería, blog y legales: 11 etiquetas OG y 8 de Twitter. **`/pricing` y las 5 landings: solo 2 OG y 3 de Twitter; sin `og:image` ni `twitter:image`** |
| Redirecciones | `http` → `https` 308; `www` → raíz 307; barra final → sin barra 308; ruta inexistente → 404 real |
| Renderizado | HTML inicial con contenido (home 126 KB sin comprimir); no es una SPA vacía |
| Imágenes | Todas con atributo `alt`; las miniaturas de la galería llevan `alt=""` por diseño (el nombre ya está en el título) |
| Idioma | `<html lang="es">`; el JSON-LD declara `es-MX` |
| Core Web Vitals | **No medidos** (cuota de PageSpeed agotada). Ver rendimiento en `01-auditoria-tecnica.md` |

Hallazgos técnicos, en orden de valor:

1. **Vista previa social rota en `/pricing` y las landings** (sin `og:image`): lo que se comparta por WhatsApp o Facebook sale sin imagen. Es un arreglo de 1 hora: la metadata propia de esas páginas pisa la imagen que sí tiene el layout. **Prioridad P0.**
2. **La home no se cachea en el borde** (dinámica por leer la sesión). Para SEO importa poco; para velocidad, bastante. Alternativa: servir la home estática y resolver «¿hay sesión?» en un fragmento pequeño del cliente.
3. **409 KB de fuentes en cada página** (14 archivos): afecta la carga móvil y el LCP [ESTIMACIÓN del efecto]. Limitar las fuentes decorativas al editor y a las invitaciones.
4. **Galería sin datos estructurados** y con 376 KB de HTML: agregar `ItemList` solo si se parte la galería en colecciones.
5. **Alcance «Monterrey y área metropolitana»** en el JSON-LD y el pie: correcto si el perfil de Google Business es de área de servicio, pero el mercado es nacional. No cambiarlo sin decidir la estrategia local frente a la nacional (ver §4).

### ¿Prerenderizar, SSR o migrar?
**Continuar con la arquitectura actual.** Next.js ya renderiza en servidor. Migrar de framework no resuelve nada de lo anterior y tiene costo alto. La única mejora de arquitectura con retorno es cachear la home y las landings (ISR o estáticas) y sacar las fuentes del layout raíz. Alternativas descartadas: prerenderizado con herramienta externa (innecesario), SPA a estática (retrocede).

## 3. SEO comercial: intención y competencia

La investigación de SERP usó solo búsqueda web: **no pude ver posiciones reales de Google México ni volúmenes**. Todo nivel de demanda es [ESTIMACIÓN] y debe validarse con Search Console y Google Trends.

| Consulta | Intención | Quién aparece (en los resultados de la herramienta) | Dificultad para un dominio de 2 meses |
|---|---|---|---|
| invitaciones digitales | Genérica, mezcla producto y plantillas | Tiendas de apps, creadores en línea, plantillas de Canva | Muy alta; no atacar sola |
| invitaciones digitales para boda | Transaccional con comparación | mibodamexico, teinvitamos, invitameok, casaconvite, weddingfy, miboda.love | Alta |
| invitaciones digitales para XV años | Transaccional y de plantillas | miinvitacion.com.mx, eventobonito, invitacionesdigitales.io, xv.teinvitamos, elgrandia | Alta, con estacionalidad |
| invitaciones con confirmación de asistencia | Mixta, informacional y de producto | eventobonito y los mismos proveedores | Media; pocas guías a fondo |
| invitaciones digitales con QR | Comparativa y transaccional | invitaplus.mx, eventqr.mx, convite.events, ariapsa | Media; nicho claro |
| invitaciones digitales para baby shower | Plantillas | Adobe Express, Greetings Island, invitalo.cl, mi-invitacion.com.mx | Media; mucha competencia gratuita internacional |
| invitaciones digitales elegantes | Estilo e inspiración visual | Pinterest, withjoy, tiendas de plantillas | Media |
| invitaciones personalizadas | Transaccional | mi-invitacion.com.mx, miinvitacion.com.mx | Alta |

Lectura: la competencia mexicana directa compite con **landings de producto con precios visibles, catálogos por estilo y comparativas de plataformas** (la de miboda.love cubre 12 plataformas, de $299 a $3,490). Hay pocas guías profundas sobre cómo pedir confirmación de asistencia; casi todo el contenido informativo lo publica un solo competidor (InvitaLink).

**Dónde sí puede ganar Sobrely:** consultas de nicho (QR y control de acceso, confirmación de asistencia, precio, «sin registro») y comparativas honestas. No conviene perseguir «invitaciones digitales» a secas durante los primeros meses.

## 4. Arquitectura SEO propuesta

Principio: **una página por intención, con contenido propio**; nada de páginas masivas duplicadas. Las 65 fichas de plantilla seguirán en `noindex` (son casi idénticas); la captación sale de páginas de colección y de intención.

| Nivel | Páginas | Estado |
|---|---|---|
| Pilares por evento | `/invitaciones-digitales-boda`, `-xv-anos`, `-baby-shower`, `-cumpleanos`, `-corporativas` | Existen. Mejorar con ejemplos de plantillas reales, tabla de precios real y `og:image` |
| Pilares nuevos por evento | bautizo, gender reveal, primera comunión, graduación | Crear solo cuando haya al menos 5 plantillas reales del tipo (hoy: bautizo 1, gender reveal 2, comunión 1, graduación 1). Aniversarios: no existe plantilla |
| Pilares por intención | `/invitaciones-digitales-con-qr`, `/invitaciones-con-confirmacion-de-asistencia`, `/invitacion-digital-sin-registro`, `/cuanto-cuesta-una-invitacion-digital` | Nuevos. Cada uno con demostración, preguntas frecuentes y enlace al editor |
| Colecciones por estilo | `/plantillas/estilo/negro-y-dorado`, `/minimalistas`, `/florales`… | Nuevas; texto propio e `ItemList`; requieren etiquetar las plantillas por estilo |
| Blog | 6 artículos hoy | 2 o 3 guías al mes (ver lista) y una comparativa honesta |
| Confianza | Páginas legales, contacto, perfil de Google Business | Existen; añadir casos reales cuando los haya |

Enlazado interno: la home ya enlaza a los 5 pilares con chips; añadir, en cada pilar, enlaces a las colecciones y a 2 artículos, y de cada artículo hacia su pilar.

### Ideas de contenido (propuestas, no validadas con volumen)

1. Invitaciones digitales con QR y control de acceso: cómo funcionan.
2. Cuánto cuesta una invitación digital en México (precios verificados con fecha).
3. Cómo pedir confirmación de asistencia en tu boda o XV años.
4. Invitación digital de pago único desde $199.
5. Invitaciones digitales para boda con QR: ejemplos y plantillas reales.
6. Cómo hacer una invitación digital de XV años, paso a paso.
7. Invitaciones elegantes: estilos para tu evento.
8. Invitación digital sin registro: crea la tuya en minutos.
9. Plantillas de baby shower.
10. Comparativa honesta de plataformas en México, con los límites de Sobrely incluidos.

Notas: el 5 y el 7 deben usar plantillas distintas; la comparativa debe citar fuentes y fechas; cualquier precio de competidor sin verificar va marcado como «ejemplo». **Dependen de resolver antes la consistencia del QR** (ver `01`).

### Autoridad y enlaces
Directorios que existen y reciben proveedores (BodasMexico.com.mx con registro gratuito, Bodas.com.mx, The Wedding Whispers) son candidatos: verificar condiciones y costo antes. Alianzas con salones, planners y fotógrafos que enlacen a las plantillas son la vía más realista; ver marketing. Sin enlaces externos, mejorar el posicionamiento tomará meses [ESTIMACIÓN].

## 5. Cómo analizar Search Console cada semana

1. **Rendimiento → Consultas:** ordenar por impresiones. Las consultas en posición 8–30 con más impresiones son las oportunidades rápidas (título, enlaces internos, contenido).
2. **Rendimiento → Páginas:** qué URLs reciben impresiones. Comparar con las 17 del sitemap: las que no aparecen quizá no están indexadas.
3. **Indexación → Páginas:** contar indexadas frente a enviadas; revisar «Rastreada, actualmente sin indexar» y «Descubierta, sin indexar».
4. **Inspección de URL** de la home y de cada pilar: confirmar que se indexó la versión canónica y que Google ve el contenido renderizado.
5. **Sitemaps:** comprobar que `https://sobrely.com/sitemap.xml` está enviado y sin errores.
6. **Experiencia → Core Web Vitals y Usabilidad móvil:** hay que esperar a que haya datos de campo; hoy es probable que no existan por el poco tráfico.
7. Segmentar por país (México), dispositivo y consulta de marca frente a no de marca. **No inventar métricas:** CTR esperado por posición es una referencia pública, no una promesa.
8. Registrar cada semana: impresiones, clics, posición media, páginas indexadas, y qué se cambió.

## 6. Prioridades SEO

| P | Acción | Esfuerzo | Medida de éxito |
|---|---|---|---|
| P0 | `og:image` en `/pricing` y las 5 landings | S | Vista previa correcta al compartir; 11 OG en las 6 páginas |
| P0 | Enviar sitemap y verificar indexación de las 17 URLs en Search Console | S | Páginas indexadas ≥ 15 |
| P1 | Sacar las fuentes decorativas del layout raíz; cachear home y landings | M | Menos de 100 KB de fuentes en la landing; `x-vercel-cache: HIT` |
| P1 | 4 pilares por intención (QR, confirmación, sin registro, precio) | M | Impresiones y posición por consulta objetivo |
| P1 | Colecciones por estilo con `ItemList` | M | Impresiones de las colecciones |
| P2 | Comparativa honesta y guías mensuales | M continuo | Clics orgánicos > 0 y crecimiento semanal |
