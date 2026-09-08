# Procedencia del arte de plantillas

## Por qué existe este archivo

La licencia de Pexels **no exige atribución**. Este manifiesto no está aquí para
cumplir una obligación, sino para poder **demostrar cumplimiento**: si algún día
alguien pregunta de dónde salió una imagen del catálogo, la respuesta tiene que
ser un archivo y no la memoria de nadie.

## Reglas duras que gobiernan estas imágenes

1. **Se descargan y se auto-hospedan.** Nunca se enlaza a `images.pexels.com`.
   Enlazar sería un CDN en runtime y rompe la regla de cero phone-home del
   entorno. La descarga es de una vez, como una dependencia.
2. **Nada con caras identificables.** La licencia prohíbe *"imply endorsement of
   your product by people or brands on the imagery"* y **no garantiza model
   releases** en ningún punto. Una foto de una pareja identificable como cara de
   una plantilla en la galería comercial roza exactamente eso. Todas las
   seleccionadas son bodegones, texturas y flores.
3. **Nunca se sirve la foto desnuda.** La licencia prohíbe vender *"unaltered
   copies"*. Aquí siempre van compuestas: recortadas, veladas y con tipografía
   encima.
4. **Ninguna en marcas.** La licencia prohíbe usarlas como parte de un
   *trade-mark* o *trade-name*; no van en el logo ni en marcas de Sobrely.

Texto de la licencia leído en la fuente el 2026-09-07:
<https://www.pexels.com/license/>

## Regla de selección (salió de medir, no de gusto)

Una foto sirve de fondo si tiene **rango de luminancia estrecho** y **centro
vacío**. Un flat-lay sobre fondo claro funciona; un claroscuro dramático no.

Se descartó `boda-flores-cinta` (Pexels 18773495) porque exigía **0.55 de velo**
para que el texto llegara a AA: a esa opacidad la foto queda medio borrada y ya
no muestras una foto, muestras un color.

## Las imágenes

Todas descargadas el 2026-09-07 a 840×1800 (el doble del lienzo de 420×900),
con `?auto=compress&cs=tinysrgb&w=840&h=1800&fit=crop`.

| archivo | Pexels | autor | licencia | velo medido |
|---|---|---|---|---|
| `foto/boda-marco-floral.jpg` | [15740919](https://www.pexels.com/photo/wallpaper-with-flower-frame-15740919/) | Dagerotip | Free to use | **0.10** (texto oscuro) |
| `foto/xv-seda-rosa.jpg` | [6276018](https://www.pexels.com/photo/close-up-photograph-of-pink-silk-6276018/) | Kaboompics *(su nombre de perfil en Pexels es literalmente `https://kaboompics.com/`)* | Free to use | **0.20** (texto claro) |
| `foto/xv-brillo-rosa.jpg` | [36196282](https://www.pexels.com/photo/pink-glitter-fabric-close-up-with-textures-36196282/) | Nadiia Biloshytska | Free to use | **0.35** (texto oscuro) |

El **velo** es `theme.backgroundImage.overlay`, y no es una preferencia: es el
mínimo que `scripts/verificar-contraste-arte.mts` midió para que el peor píxel
de la banda central llegue a WCAG AA. Desnudas, las tres daban 4.15, 3.44 y
2.37 — ninguna admitía texto legible.

## 2.ª investigación (Fase 11) — las 7 fotos del piloto F1/F3

Descargadas el **2026-09-08** con autorización explícita del dev, a `w=1600`, y
auto-hospedadas. Licencias **leídas en la fuente ese mismo día**:

- **Pexels** (<https://www.pexels.com/license/>): uso gratuito y comercial,
  atribución no requerida. Prohíbe vender copias sin modificar, usarlas en una
  marca, **implicar respaldo de las personas o marcas retratadas** y
  redistribuirlas en otras plataformas de stock.
- **Unsplash** (<https://unsplash.com/license>): licencia irrevocable, mundial y
  comercial, sin atribución. Prohíbe vender copias sin modificación
  significativa y **compilar imágenes para replicar un servicio similar**.

> Las dos prohíben, con distintas palabras, lo mismo: convertir sus imágenes en
> un servicio de imágenes. Por eso el catálogo de assets de Sobrely es
> **interno y ligado al diseño**, y nunca un explorador para el usuario final.

| archivo | fuente | autor | licencia | velo medido |
|---|---|---|---|---|
| `foto/boda-papeleria-salvia.jpg` | Pexels [11650091](https://www.pexels.com/photo/white-printer-paper-on-brown-paper-11650091/) | Michelle Henderson | Free to use | **0.55** (texto oscuro) |
| `foto/xv-tiara-noche.jpg` | Pexels [7127246](https://www.pexels.com/photo/close-up-shot-of-a-diamond-crown-7127246/) | Rūdolfs Klintsons | Free to use | **0.60** (texto oscuro) |
| `foto/baby-punto-y-flor.jpg` | Pexels [5360746](https://www.pexels.com/photo/knitted-fabrics-on-brown-wooden-round-stool-5360746/) | Tilsa Tanaka | Free to use | **0.50** (texto oscuro) |
| `foto/bautizo-cera-blanca.jpg` | Pexels [18116030](https://www.pexels.com/photo/white-roses-in-glass-vase-and-candle-in-candlestick-18116030/) | Elif | Free to use | **0.55** (texto oscuro) |
| `foto/graduacion-diploma.jpg` | Pexels [8177931](https://www.pexels.com/photo/from-above-shot-of-a-diploma-8177931/) | Leeloo The First | Free to use | **0.55** (texto oscuro) |
| `foto/revelacion-globos-coral.jpg` | Unsplash [`_-txX-7CCCk`](https://unsplash.com/photos/_-txX-7CCCk) | Olesia Bahrii | Unsplash License | **0.55** (texto oscuro) |
| `foto/cumple-arco-globos.jpg` | Unsplash [`iQaFCjuMTfo`](https://unsplash.com/photos/iQaFCjuMTfo) | Daniel Huniewicz | Unsplash License | **0.50** (texto oscuro) |

### El velo de estas siete es ALTO, y hay que decir qué significa

Las siete piden entre **0.50 y 0.65**, todas por encima del umbral de **0.35**
que fija el research (criterio E5), el mismo con el que se descartó
`boda-flores-cinta`.

**No están descalificadas: lo está un USO.** El velo sólo interviene cuando la
foto es TELÓN y lleva texto encima —la familia F2—. En **F1** (composición
partida) y **F3** (objeto y aire) la foto es una **figura contenida**, sin texto
sobre ella, y el velo no se aplica. El número queda registrado para que, si
alguien las monta como `backgroundImage`, sepa el precio.

⚠️ **Consecuencia declarada:** **ninguna de estas siete sirve para F2.** Un telón
necesita rango de luminancia estrecho y centro vacío; hoy la única fotografía
del repo que lo cumple es `foto/boda-marco-floral.jpg`, con 0.10.

### Dos descartes de esta tanda, por si vuelven a proponerse

- **Pexels 26756768** (rebanada de pastel con vela). En la rejilla se veía sólo
  el postre; **a tamaño real hay una persona en el encuadre**. Ninguna licencia
  garantiza *model release*, y el research veta caras y cuerpos reconocibles.
  Es el caso que justifica el criterio «elegida MIRÁNDOLA, nunca por su alt».
- **Pexels 6168240** (vela de bautizo). Válida de licencia y sin personas, pero
  el fondo es **rojo intenso de tela de iglesia**: choca con la dirección blanca
  y serena de la categoría y falla el criterio de consistencia interna.

## 3.ª tanda (Fase 11) — conversión de las F4 a fotografía

Descargadas el **2026-09-08** con autorización explícita del dev, después de que
la puntuación del piloto diera **7 de 7 aprobadas con fotografía y 0 de 8 sin
ella** (§19 del research). Mismas licencias, leídas ese día.

| archivo | fuente | autor | licencia | velo medido |
|---|---|---|---|---|
| `foto/boda-anillos-papel.jpg` | Pexels [36254873](https://www.pexels.com/photo/elegant-wedding-rings-on-pastel-paper-background-36254873/) | Svitlana Bazhiv | Free to use | **0.55** |
| `foto/baby-juguetes-madera.jpg` | Pexels [7269619](https://www.pexels.com/photo/a-wooden-toys-on-white-surface-7269619/) | Kaboompics | Free to use | **0.55** (texto claro) |
| `foto/revelacion-tinta.jpg` | Pexels [9807346](https://www.pexels.com/photo/pink-and-blue-smoke-on-air-9807346/) | Engin Akyurt | Free to use | **0.25** |
| `foto/cumple-velas-espiral.jpg` | Pexels [4397823](https://www.pexels.com/photo/multicolored-spircal-candles-with-holders-on-white-surface-4397823/) | Kaboompics | Free to use | **0.40** |
| `foto/corp-reticula-hormigon.jpg` | Pexels [38374701](https://www.pexels.com/photo/abstract-concrete-grid-ceiling-architecture-38374701/) | wal_172619 | Free to use | **0.55** |

### `revelacion-tinta` es la primera que sirve de TELÓN

De las **trece** fotografías del repo, es la **única** cuyo velo mínimo baja del
umbral de 0.35 que fija el research: **0.25**. Un telón exige rango de luminancia
estrecho y centro vacío, y la tinta rosa y azul sobre blanco lo cumple. Por eso
`revelacion-dos-sobres` se convierte a **F2 (telón total)** y no a figura
contenida — y por eso la familia F2, que el piloto tenía vacía, por fin tiene
representante.

### 4.ª tanda — el objeto de XV años

| archivo | fuente | autor | licencia | velo medido |
|---|---|---|---|---|
| `foto/xv-pastel-quince.jpg` | Pexels [20016137](https://www.pexels.com/photo/15-birthday-cake-20016137/) | Vidal Balielo Jr. | Free to use | **0.60** |

Descargada el 2026-09-08. Entra porque la repuntuación (§19.6) dejó claro que
`xv-seda` no había mejorado: su fotografía era una **textura** —seda rosa— y una
textura no dice «XV años». Ésta sí: pastel de tres pisos con el **15** y flores,
el objeto más reconocible de la categoría después de la tiara, que ya usa
`xv-corona`.

> **Sobre el «15» y el criterio E2.** El research veta imágenes con datos
> horneados —una vela con un «5», un calendario de 2021— porque una plantilla es
> genérica y el dato la contradice. El «15» **no varía** entre invitaciones de XV
> años: es la categoría. Excluirlo sería aplicar la regla por su letra en contra
> de su motivo.

### Un descarte de esta tanda

- **Vestidos de gala colgados** para XV años: todos los resultados son vestidos
  de NOVIA blancos, que leerían como Boda. Es el problema nº 7 del research
  («podría pertenecer a cualquier categoría»), agravado porque además apunta a la
  categoría equivocada. `xv-seda` usa `foto/xv-seda-rosa.jpg`, que ya estaba en
  el repo desde la 1.ª investigación y **ninguna plantilla usaba** — cero
  licencias nuevas para esa conversión.

## Los SVG

Las otras diez direcciones (`arte/*.svg`) están **dibujadas a mano en este
repo**: cero assets externos, cero licencias de terceros. Ver
`src/lib/theme/arte.ts`.
