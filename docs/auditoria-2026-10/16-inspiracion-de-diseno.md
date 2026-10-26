# 16 · Inspiración de diseño para las plantillas (3 pasadas en internet)

Búsqueda del 26 oct 2026 con tres agentes en paralelo (galerías y competidores, tendencias, oficio web y licencias). El objetivo es inspirarse, no copiar: aquí solo hay **principios y fuentes**, nunca una composición ajena.

## Límites de la búsqueda (léelos antes de usar el resto)

- Los agentes leyeron **texto**, no imágenes: de ninguna galería se vio la paleta, la tipografía ni el ornamento reales. Lo visual hay que abrirlo en el navegador con las listas de abajo.
- La pasada de tendencias leyó resúmenes de búsqueda, no abrió las páginas, y casi todo viene de blogs de proveedores de papelería (sesgo comercial). No se consiguió fuente primaria de Pinterest Predicts, Brides, Vogue, The Knot, Zola ni Minted. Las fechas exactas de publicación no se vieron.
- Dieron 404 las galerías directas de Paperless Post y Greenvelope; Zola no abrió; Canva dio 403; no se consultaron CSS Design Awards, Godly, Dribbble ni Behance.
- No se pudo leer la licencia de Fontshare ni la de SVG Repo.

## 1. Lo que hacen los mejores (visto en las páginas de cada producto)

| Producto | Qué se aprende | Fuente |
|---|---|---|
| Greenvelope | Es el más premium de los abiertos: diseños de ilustradores y caligrafía independientes, bordes de acuarela, sobre animado con forro y sello, música. Muestra cada diseño en carrusel con su pieza a juego | greenvelope.com |
| Fiestly (México) | El mejor patrón de galería: filtro por ánimo (Romántico, Moderno, Mágico, Natural, Elegante, Festivo…), «Verlo en vivo» y «Usar» en cada tarjeta, y 79 diseños de XV años de acuarela a oscuro con dorado o plata | fiestly.com/plantillas-de-15 |
| iBoda (México) | Solo 4 estilos (Clásica, Oscura, Jardín, Romántica), con precios en MXN en la misma página. Pocas opciones coherentes se leen como más caras | iboda.mx |
| Mi Webdding (México) | 12 estilos por ánimo, vista de escritorio y de móvil por estilo, favoritos | miwebdding.com/ejemplos |
| PartyPass (México) | Variantes de color por plantilla y cambio de plantilla sin perder el contenido | partypass.mx/plantillas |
| Partiful y Joy | Menos adorno y más utilidad: RSVP por enlace, preguntas al invitado, fotos. Son la referencia de «la invitación como página viva» | partiful.com, withjoy.com |
| Evite | Lo más masivo y menos premium (confeti, globos, miniaturas y GIF) | evite.com |

**Patrones comprobables:** sobre o sello que se abre, música, cuenta regresiva y galería aparecen en casi todas las mexicanas, así que **ya no diferencian**. Casi nadie pone el precio en cada tarjeta (Sobrely sí, y es una ventaja). Lo que parece subir la percepción premium es una curaduría corta y cohesiva, un ritual de apertura y la personalización por invitado.

## 2. Tendencias 2025-2026 (de blogs de proveedores; marcadas como «leído»)

| Tendencia | Cómo se traduce en pantalla de teléfono | Eventos | Fuente |
|---|---|---|---|
| **Arco** como forma dominante, y formas no rectangulares | Máscaras arqueadas para la foto y la portada | boda, bautizo, baby shower | stationeryhq.com |
| **Capas translúcidas** (vellum), sellos de cera, bordes festoneados | Transparencias y sombras suaves entre capas | boda, XV de lujo | paperlust.co/blog/2026-wedding-invitation-trends |
| **Textura como lujo** (algodón, lino, papel sin recubrir, foil) | Grano de papel y dorado sutil | boda, XV | stationeryhq.com |
| **«Quiet luxury» editorial**: sans grande, espaciado ajustado, composición asimétrica, menos script | Títulos grandes con aire; el script solo para los nombres | boda moderna, corporativo | paperlust.co/blog/wedding-trends-2026 |
| **Personalización «uniquely us»**: botánicos dibujados a mano, ilustración del lugar, formatos tipo pasaporte o póster | Una ilustración propia del evento en la portada | boda, baby shower, cumpleaños | paperwillow.com |
| **Paleta cálida con un acento atrevido** (caramelo, avena, salvia) | Fondos cálidos y un color de acento por plantilla | todos | burntilldeadstudio.com |
| **Imperfect by Design** (Canva 2026): texturas táctiles, narrativa cinematográfica | Portada con textura y encuadre de foto tipo cine | cumpleaños, XV | canva.com/newsroom/news/design-trends-2026 |
| **Local Flavor** (Adobe 2026): cultura local como identidad | Motivos mexicanos propios (papel picado, talavera) | todos, con tino | adobe.com/express/learn/blog/design-trends-2026 |
| **Tipografía cinética** (letras que se animan) | Un solo título que aparece con movimiento | todos | invitedrop.com/es/blog/invitation-design-trends-2026 |

**México, XV años** (blogs de CDMX, solo una fuente por dato): temas celestial o noche estrellada (azul noche, plata, dorado), jardín encantado, vintage glamour, neón y K-Pop; paletas suaves (rosa palo, lila, dorado) o de joya (azul rey, borgoña, esmeralda, champagne); los fondos oscuros están de moda. **No se encontró material específico de baby shower ni de bautizo en México.**

## 3. Oficio web (leído o inferido, según se marca)

- **Leído (web.dev):** respetar `prefers-reduced-motion`; el movimiento que arranca solo y dura más de 5 s necesita pausa; no destellar más de 3 veces por segundo. «Reducir, no eliminar»: cambiar un deslizamiento por un fundido.
- **Inferido, por validar midiendo:** el sobre que se abre se puede hacer con SVG y CSS (unos pocos KB, sin video); la portada con movimiento sutil usando solo `transform` y `opacity`; el scroll narrativo con `IntersectionObserver` o `animation-timeline`. El video de fondo es lo que más pesa y peor funciona en 4G.
- No se vieron las técnicas de los sitios de boda de Awwwards; solo sus títulos.

## 4. Recursos y licencias (resumen; para decisiones legales, el texto oficial)

| Recurso | ¿Sirve para plantillas de pago? | Nota |
|---|---|---|
| Google Fonts (OFL) | **Sí** | Se pueden incluir y vender con software, no solas; revisar la licencia de cada familia |
| Pexels | **Sí**, con fotos integradas al diseño | Permite «a template you sell»; prohíbe vender copias sin alterar. Es lo que ya usa el catálogo |
| Pixabay | Con cautela | No vender «standalone»; solo el texto completo de sus términos es vinculante |
| Unsplash | Zona gris | Prohíbe servicios que compitan; consultar |
| unDraw | No recomendado sin permiso | Prohíbe redistribuir en paquetes |
| Hero Patterns | Sí, con atribución | Declara CC BY 4.0 (inferido que exige atribución); verificar |
| Haikei | Preguntar a hi@haikei.app | Sus términos no aclaran el uso comercial |
| Freepik | **No** | El uso gratuito exige atribución y restringe la reventa |
| Fontshare, SVG Repo | **Sin verificar** | No se pudo leer la licencia |

**Pares de fuentes** (todas de Google Fonts, de dos blogs): Great Vibes + Cormorant Garamond; Pinyon Script + EB Garamond; Great Vibes + Playfair Display; Playfair Display + Cormorant Garamond; Playfair Display + Montserrat. Regla repetida: el script solo para los nombres, nunca para horas ni direcciones. **Antes de adoptar cualquiera, probar `¡Te esperamos! Año, ñandú, ¿Quién?` en el navegador**: ninguna fuente consultada garantiza acentos, `ñ`, `¿` y `¡` en los scripts decorativos. Sobrely ya carga Playfair Display, Cormorant Garamond y Great Vibes (`src/app/layout.tsx`), así que tres de esos pares ya se pueden armar sin sumar peso.

## 5. Qué haría con esto en Sobrely (mi propuesta, no está en las fuentes)

1. **Diferenciar por ritual y por curaduría, no por funciones.** Las funciones (música, cuenta regresiva, galería) ya son estándar. Una apertura propia, hecha con SVG y CSS, y menos plantillas más cohesivas por estilo, es lo que separa a los productos premium. Las colecciones por estilo (fase 3) ya van en esa dirección.
2. **Un «arco» como forma firma:** máscara arqueada para la foto y la portada en bodas, bautizos y baby showers; es la tendencia con más respaldo entre las fuentes y no cuesta peso.
3. **Una familia nueva de XV años en modo oscuro «noche estrellada»** (azul noche, plata y dorado, con la tipografía editorial que ya cargamos): coincide con el tema que más aparece en los blogs mexicanos y con los fondos oscuros en alza. `xv-noche-estelar` ya es el germen.
4. **Textura de papel y dorado sutil en bodas y XV:** se puede hacer con una textura ligera, sin imagen pesada. Combina con el piloto de arte de ChatGPT de `15`.
5. **Un acento mexicano propio** (papel picado, talavera, motivos de fiesta), con tino, como «Local Flavor»: ninguno de los productos revisados lo trata como seña de identidad.
6. **Antes de construir cualquier animación:** que respete `prefers-reduced-motion`, que pese poco (SVG y CSS) y que se mida con el mismo Lighthouse de `12`.

## 6. Qué falta (otra pasada)

- Abrir en el navegador las galerías de la sección 1 y las listas de abajo, y anotar paleta, tipografía y ornamento reales.
- Fuente primaria de tendencias: Pinterest Predicts, Behance y Dribbble con las etiquetas `wedding invitation`, `quinceañera`, `event invitation UI`, `save the date`.
- Baby shower y bautizo en México.
- Licencias de Fontshare y SVG Repo, y una consulta legal si se quiere usar Unsplash o unDraw.

## URLs para abrir

**Galerías y productos:** greenvelope.com · paperlesspost.com · evite.com · punchbowl.com · partiful.com · withjoy.com/wedding-website · fiestly.com/plantillas-de-15 · fiestly.com/mx/mis-xv · iboda.mx · miwebdding.com/ejemplos · partypass.mx/plantillas · invitio.events/en-US/boda · canva.com/es_mx/plantillas/s/boda-mexicana · digitalrsvp.mx · xv.teinvitamos.mx

**Tendencias:** paperlust.co/blog/2026-wedding-invitation-trends · paperlust.co/blog/wedding-trends-2026 · stationeryhq.com/pages/wedding-stationery-trends-2026-the-ultimate-guide-for-designers · paperwillow.com/blogs/news/designer-wedding-invitations-2026-trends-and-ideas · burntilldeadstudio.com/invitation-font-trends-2026 · e-invitationwedding.com/blog/wedding-invitation-trends-2026 · invitedrop.com/es/blog/invitation-design-trends-2026 · canva.com/newsroom/news/design-trends-2026 · adobe.com/express/learn/blog/design-trends-2026 · kittl.com/blogs/graphic-design-trends-2026

**México (XV años):** mixvdigital.com.mx/blog/tendencias-en-invitaciones-de-xv-anos · invitalink.com/blog/tendencias-xv-anos-2026 · salonify.mx/planea-tu-evento/tematicas-xv-anos-modernas-2026 · eventplannermexico.mx/tendencias-xv-anos-cdmx-2026 · floralunar.com/invitaciones-digitales-xv-anos-guia

**Oficio web y fuentes:** web.dev/learn/accessibility/motion · awwwards.com/websites/wedding · paperlust.co/blog/wedding-invitation-fonts · pixelfonty.com (pares de Google Fonts)
