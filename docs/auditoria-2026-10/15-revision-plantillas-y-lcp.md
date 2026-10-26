# 15 · Por qué `/plantillas` sigue en 2.76 s, choques de texto en las 65 plantillas y arte con ChatGPT

Revisado el 26 oct 2026. Todo lo que dice «medido» salió de una corrida; lo que dice «hipótesis» no se verificó.

## A. `/plantillas`: por qué 2.76 s

**Medido en producción (Lighthouse 13.5.0, móvil, misma máquina):**

| Condición | LCP |
|---|---|
| Móvil simulado, como en `12` (mediana de 3) | 2.76 s |
| Sin limitar la red ni la CPU (traza completa) | **0.85 s** (FCP = LCP; el documento termina a 0.43 s) |
| Móvil simulado, bloqueando todas las imágenes `_next/image` (3 corridas) | 3.06 s (sin mejora; es ruido) |
| Móvil simulado, bloqueando todas las fuentes `.woff2` (3 corridas) | 2.76 s (igual) |
| Móvil simulado, bloqueando todo el JavaScript (3 corridas) | **1.77 s** (−1.0 s) |

- **El elemento LCP es texto**, no una imagen: el párrafo de introducción (`p.mt-4`) o el `<h1>`. El «retraso de render» que se veía en `12` no es una espera de imagen.
- **Lo que pesa en la simulación es el JavaScript.** Lighthouse simula 4G lenta (1.6 Mbps, 150 ms) y cuenta los bytes pedidos antes del primer pintado: HTML 22 KB, CSS 27 KB, fuentes 67 KB, imágenes 36 KB y 203 KB de JavaScript. Quitar imágenes o fuentes no cambia nada; quitar el JavaScript baja 1 s.
- **Ese JavaScript es casi todo el suelo del framework** (medido en una compilación local con los mismos módulos): `react-dom` 72 KB, cliente de Next 40 KB y 34 KB, más ~96 KB de la aplicación (`sonner` 9.7 KB, el cliente de Supabase 3.7 KB, `lucide` y analítica 4.2 KB, componentes de base). `/pricing` y la home cargan el mismo suelo y miden 2.31 s y 2.55 s.
- **Lo que separa a `/plantillas` de `/pricing` (0.45 s)** es el HTML (22 KB contra 13.5 KB, por las 65 plantillas pasadas al componente de cliente) y unos 15 KB más de JavaScript que la home (203 KB contra 188 KB). No hay un defecto que corregir: es peso repartido.
- **Lo que se podría ganar:** menos de 0.3 s, quitando unos 10 KB por pieza (por ejemplo, montar el `Toaster` de `sonner` tras el primer pintado). El umbral «bueno» (2.5 s) queda a 0.26 s.
- **Recomendación:** no perseguirlo ahora. El valor real sin limitar la red es 0.85 s, y el 2.76 s es una simulación de una red muy lenta. Lo que lo resuelve es medir datos de campo (CrUX o RUM) cuando haya tráfico.
- **Límite:** una sola máquina y 3 corridas por condición; la variación entre corridas llega a ±0.3 s.

## B. Choques de texto con el diseño, plantilla por plantilla

**Método.** Dos scripts nuevos que miden el render, en 65 plantillas × 4 anchos (320, 375, 768 y 1200 px) × 2 estados: la muestra del catálogo y un **peor caso con nombres de 60 caracteres** («María Fernanda Villaseñor-Domínguez y José Luis Ibarra Quiroz», el máximo que deja escribir el servidor):

- `scripts/auditar-choque-de-texto.mts`: desbordes horizontales, texto recortado, texto que sobresale de su caja y líneas de texto que se pisan.
- `scripts/auditar-adorno-bajo-texto.mts`: esconde todo el texto, captura la página y mide, bajo cada línea, la fracción de píxeles-borde del fondo (un adorno bajo el texto da varios por ciento). Es un indicador de sospecha; cada una se confirmó mirando la captura.
- Se reutilizó `verificar-contraste-en-vivo.mts` para la legibilidad.

**Resultado, 520 combinaciones de plantilla, ancho y estado:**

| Comprobación | Resultado |
|---|---|
| Desborde horizontal | 0 |
| Texto recortado | 0 |
| Texto que sobresale de su caja | 0 |
| Texto sobre texto | 0 reales (212 avisos eran los números de la cuenta atrás contra su etiqueta, que se tocan por el interlineado y no se pisan) |
| Adorno bajo el texto, sospechas | 10 plantillas; **5 confirmadas** al mirarlas, solo a 320 y 375 px; a 1200 px, ninguna |
| Legibilidad bajo AA (4.5:1) | 6 casos en 2 plantillas |

**Hallazgos confirmados (formato de `break-ui`):**

| # | Gravedad | Plantilla | Dónde | Qué pasa | Arreglo propuesto |
|---|---|---|---|---|---|
| 1 | Rota | `corporativo-sencillo` | 320 px, **ya en la muestra** | El adorno de grecas azules atraviesa el subtítulo «Te invitamos a participar» y el botón «Regístrate» | Mover el adorno por debajo del botón o acortar su alto en pantallas angostas; con 60 caracteres de nombre (3 líneas) el adorno queda bajo el subtítulo a 375 px también |
| 2 | Fea | `boda-de-lujo` | 320 y 375 px con nombres largos | Con 3 o 4 líneas de nombre, el subtítulo «Nos casamos» cae sobre la rama dorada y el título «Faltan» de la tarjeta sobre las alas del adorno | Reservar el alto de la rama según el alto real del título, o subir la rama a una posición fija bajo el botón |
| 3 | Fea | `boda-de-lujo` | 320 y 375 px, **ya en la muestra** | Las alas doradas del adorno quedan detrás de los números de la cuenta atrás (`30`, `00`) | Quitar las alas de esa franja o bajarlas bajo la tarjeta |
| 4 | Fea | `cumpleanos-adulto` | 320 y 375 px, nombres largos | La línea del marco interior cruza la primera línea del nombre | Empezar el marco debajo del bloque de la portada, no a una altura fija |
| 5 | Fea | `corporativo-taller` | 320 px, nombres largos | El nombre llega hasta las líneas laterales de la cuadrícula | Margen interior en la portada igual al ancho de la franja |

**Cinco casos con aviso que, al mirarlos, no son un defecto:** `boda-destino`, `cumpleanos-galaxia`, `corporativo-completo` y `cumpleanos-sencillo` (el texto cruza una franja o arco translúcido y se lee), y `xv-produccion-completa` (los números dorados de la cuenta atrás sobre los pliegues de seda; legible). `boda-elegante` pone el nombre sobre la flor blanca de la foto: se lee, pero con nombres largos conviene mirarlo en una pantalla real.

**Legibilidad bajo AA (de `verificar-contraste-en-vivo.mts`):**

| Plantilla | Ratio | Texto |
|---|---|---|
| `revelacion-dos-sobres` | 3.77 a 4.02 (umbral 4.5) en 5 mediciones | «Ven a descubrirlo con nosotros» y «La gran revelación»; ni un velo del 95 % lo arregla |
| `baby-shower-animalitos` | 4.45 (umbral 4.5) a 375 px | «12:00» del programa; ni un velo del 95 % lo arregla |

**Lo que sostuvo el diseño:** las 65 plantillas aguantan sin desborde ni recorte nombres de 60 caracteres a 320 px; los 5 hallazgos confirmados son de 4 plantillas (dos corporativas, una boda y un cumpleaños), así que el arreglo se hace en pocas piezas de arte.

**Dos plantillas con subtítulo vacío** (`xv-con-sesion` y `corporativo-junta-resultados`): el peor caso no se pudo aplicar a mano porque no tienen texto donde ponerlos. Se comprobó la ruta real en la vista rápida de `xv-con-sesion`: el nombre largo aparece en el subtítulo, dentro del marco y sin desborde.

**Decisiones para ti**
- ¿Arreglar los 5 adornos (hallazgos 1 a 5)? Mi recomendación: sí, el 1 y el 3 primero, porque ya fallan en la muestra, sin que nadie escriba nada.
- Los dos fallos de contraste: ¿subir el velo (no basta), cambiar el color del texto en esas dos plantillas, o sustituir la foto de fondo? Mi recomendación: cambiar el texto o la foto; subir el velo no corrige.
- Dejar los scripts nuevos en el repositorio como prueba de regresión del arte.

## C. ¿Puede ChatGPT hacer mejores diseños con imágenes?

**Lo que se ve hoy** (hojas de contacto de las 65 miniaturas): el arte es de dos clases. Hay SVG hechos a código, con adornos de línea fina sobre fondos lisos pastel, y fotos de bancos de imágenes con un velo encima. Unas 25 plantillas (baby shower, corporativas, varios cumpleaños) se parecen entre sí: fondo plano, línea fina, la misma estructura. Las de foto real (tartas, anillos, globos) son las que más se distinguen.

**Mi evaluación**

- **Sí puede mejorar** el aspecto de las plantillas planas: fondos de acuarela, papel con textura, botánicas pintadas y bordes ilustrados que un SVG hecho a código no logra con esa riqueza.
- **No es mejor en todo.** Un SVG pesa de 8 a 40 KB y es nítido a cualquier tamaño; una imagen generada pesa de 80 a 250 KB. Pasa por el mismo presupuesto de rendimiento que acabamos de recuperar, y en la invitación pública llega al teléfono del invitado. Y **una imagen no se puede recolorear**: la paleta del asistente y de la demo (fases 4 y 5) quita el arte de fondo precisamente porque está dibujado con otros colores. Una plantilla con arte generado tendría que ser «sin paleta» o llevar su propia variante por paleta.
- **Riesgos de la imagen generada:** texto o letras inventadas dentro de la imagen, caras, simetría rota en los bordes y bordes que no repiten bien al recortarse. El prompt de abajo los prohíbe, pero hay que revisar cada resultado.
- **Lo que no puedo verificar desde aquí:** la calidad real que dará tu cuenta; no puedo llamar a ChatGPT. Por eso propongo un **piloto de 3 piezas**, medido con los mismos scripts (contraste, adorno bajo el texto, peso) antes de producir más.
- **Licencia:** según los términos de OpenAI, el resultado es tuyo y se puede usar comercialmente; no hay atribución. No se puede asegurar derecho de autor sobre una imagen generada. Conviene anotar en `PROCEDENCIA.md` el prompt, la fecha y la cuenta. No pedir «al estilo de» artistas vivos ni marcas.

**Especificación técnica que sale del código** (hecha para que el resultado encaje sin retoques)
- El arte se pinta como fondo de la invitación (`theme.backgroundImage`), con `cover` sobre un lienzo de 420 × 900 px. En teléfono se ve todo el ancho del lienzo; en escritorio se ve una franja central y el ancho completo.
- La regla del catálogo para el texto: **deja libre `x 63–357 × y 250–650`** del lienzo de 420 × 900 (el centro, 70 % del ancho y 44 % del alto).
- ChatGPT entrega 1024 × 1536 (2:3). Yo lo recorto al formato del lienzo, lo paso a WebP de 840 × 1800 y lo comprimo a **90 KB o menos**. Por eso el adorno debe quedar pegado a los bordes y el centro vacío.

### Prompt base (cámbiale solo lo que está entre `[corchetes]`)

```
Create a decorative background image for a vertical mobile digital invitation
(portrait 2:3, 1024x1536).

STYLE: [watercolor botanical / soft paper texture with gold foil details /
minimalist geometric / hand-painted pastel clouds]. Palette: [4 hex colors,
e.g. #E9F0E6 background, #4F6B52 leaves, #B08D57 accents, #FFFFFF highlights].
Soft, elegant, premium stationery look.

COMPOSITION (strict):
- Decoration only along the edges: a band across the top (first 18% of the
  height), a band across the bottom (last 18%), and slim side strips hugging
  the left and right edges (the outer 12% of the width).
- The center must be EMPTY: a large calm area covering the middle 60% of the
  width and the middle 45% of the height, with only the plain background color
  or a very subtle paper texture. No ornament, flower, line, shadow or gradient
  banding inside that area. Text will be placed there.
- Low contrast overall: no very dark or very bright spots, so dark text stays
  readable on top.
- Clean edges, no frame drawn as a rectangle around the center, no border line
  crossing the middle.

STRICTLY NO: text, letters, numbers, logos, watermarks, people, faces, hands,
animals (unless specified), brand names, QR codes.
Output: a single flat image, no mockup, no phone frame, no shadows around it.
```

### Tres piezas del piloto (rellena el prompt base con esto)

1. **Boda de jardín** (ahora plana, con rama fina): `STYLE: delicate watercolor eucalyptus and olive branches with a few tiny white flowers. Palette: #EEF3EA background, #4F6B52 leaves, #8FA68E soft green, #FFFFFF.`
2. **XV años elegante** (hoy lazos y líneas): `STYLE: soft watercolor blush-pink and lavender peony petals with fine gold foil dust. Palette: #FBEFF4 background, #D9A5B8 petals, #B08D57 gold, #FFFFFF.`
3. **Baby shower neutro** (hoy muy plana): `STYLE: hand-painted soft clouds and tiny stars in muted cream, sand and sage. Palette: #F6F1E8 background, #D9C7A8 sand, #A9B8A0 sage, #FFFFFF.`

**Cómo seguimos si te gusta el resultado:** me pasas los 3 PNG, los recorto y comprimo, los conecto a esas tres plantillas y los mido con `verificar-contraste-en-vivo.mts` y `auditar-adorno-bajo-texto.mts`, con el peso y el LCP de la invitación pública. Si cumplen, se hace el resto por familias.
