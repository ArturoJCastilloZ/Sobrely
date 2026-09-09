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

### 5.ª tanda — las DOS que el piloto dejó fuera del umbral

| archivo | fuente | autor | licencia | velo medido |
|---|---|---|---|---|
| `foto/boda-pastel-rosas.jpg` | Pexels [28259731](https://www.pexels.com/photo/elegant-three-tier-white-wedding-cake-with-flowers-28259731/) | Ruxanda Photography | Free to use | **0.60** (empate oscuro/claro) |
| `foto/comunion-caliz-lino.jpg` | Pexels [8086724](https://www.pexels.com/photo/8086724/) | Anuja Tilj | Free to use | **0.55** (texto claro) |

Descargadas el 2026-09-08, las dos 1600x2400 (2/3 exacto, o sea **recorte
cero**). Entran por la `0037`, que cierra el único cabo abierto de la Fase 11:
las dos plantillas que la §19.7 dejó por debajo de 8/10. La decisión del dev fue
la misma para las dos, y es la lección central de la fase — **un OBJETO del
evento, no una textura ni un marcador**:

- **`boda-pastel-rosas.jpg`** reemplaza a `boda-marco-floral.jpg` en
  `boda-marco-nuestro` (7.3). La anterior era un **marcador de posición** —un
  crisantemo sobre beige— puesto para que el anfitrión lo sustituyera, así que el
  catálogo vendía una miniatura que no era lo que la plantilla entrega. Un pastel
  de boda de tres pisos sí dice «boda», y su blanco sobre pared cálida y base de
  madera cae dentro de la paleta oro/beige que ya tenía la plantilla.
- **`comunion-caliz-lino.jpg`** le da a `comunion-cinta` (5.8) la fotografía que
  NO tenía. Y no faltaba por olvido: la `0032` dejó escrito que «de las 14 fotos
  de arte ninguna es de comunión, y colarle una de boda o una corporativa sería
  exactamente el problema nº 7 del research». El motivo era correcto; lo que
  faltaba era el asset. Un cáliz de latón con relieve de uvas y trigo, envuelto
  en lino blanco sobre mantel de altar: es «blanco y trigo», que es literalmente
  como la plantilla se describe.

> **Sin menores en el encuadre.** El stock de primera comunión son casi todo
> niños, y por eso la §19.7 había dejado la categoría sin fotografía. Un
> **objeto litúrgico** resuelve Event Relevance sin fotografiar a un menor, así
> que no hace falta gastar en la ilustración que el §19.1 dejaba como única vía.

### Dos descartes de esta tanda, los dos por MIRARLOS

- **Pexels 36230878** (ramo de rosas blancas, Kadir Altıntaş): las rosas son
  **artificiales** con pedrería —mata Premium Feel—, lleva las iniciales «S» y
  «M» pegadas (el monograma de otra pareja, en una plantilla que dice «Ana &
  Carlos») y el encuadre trae un foco encendido y un poste de lámpara.
- **Rosas blancas en jarrón** (Pexels 30157724 y 36756295): bonitas y de tono
  frío o verdoso, y sobre todo **no dicen «boda»** — un jarrón de rosas es la
  misma trampa que la seda de `xv-seda`. Se descartaron por Event Relevance,
  que es la columna que la fase midió como decisiva.

> **Aviso de método.** La página de Pexels reportó «landscape» para dos de estas
> candidatas y «portrait» para una tercera, y en los TRES casos el archivo
> descargado decía lo contrario: la orientación que muestra la página es la del
> recorte de presentación, no la del archivo. La proporción se mide sobre el JPEG
> (`sips`), nunca sobre lo que dice la ficha.

### Recorte a 1:1 de seis fotografías (2026-09-08, `0038`)

Seis archivos se **recortaron en su sitio** a **1600x1600**. La licencia y la
autoría no cambian —siguen siendo las de arriba—; lo que cambia es el encuadre,
y por eso queda anotado aquí.

| archivo | antes | ahora | encuadre |
|---|---|---|---|
| `foto/boda-pastel-rosas.jpg` | 1600x2400 | 1600x1600 | offset **y=700** |
| `foto/comunion-caliz-lino.jpg` | 1600x2406 | 1600x1600 | centrado |
| `foto/boda-anillos-papel.jpg` | 1600x2843 | 1600x1600 | centrado |
| `foto/bautizo-cera-blanca.jpg` | 1600x2400 | 1600x1600 | centrado |
| `foto/revelacion-globos-coral.jpg` | 1600x2400 | 1600x1600 | centrado |
| `foto/xv-tiara-noche.jpg` | 1600x2133 | 1600x1600 | centrado |

**Por qué.** La tarjeta del catálogo se captura a 420x560 y la figura del hero
mide 372 px de ancho arrancando en `y=184`, así que sólo quedan **376 px** de
alto. Una figura 2/3 mide 558: la tarjeta le cortaba el **33 %**, y a
`boda-papel-y-lino` (9/16, 661 px) el **43 %** — estando aprobada con 8.5. En
esta tarjeta **sólo caben proporciones ≥ 0.989**, o sea 1/1 y más anchas.

Se recortó el ARCHIVO en vez de subir sólo `imageRatio` porque una caja 1/1
sobre una fuente 2/3 recorta el 33 % de la fuente y el pre-vuelo lo rechaza con
razón. Con el archivo a 1600x1600 y `imageRatio` a `1/1` el recorte es **0 % por
`cover` y 0 % por el viewport**, las dos cosas a la vez, sin tocar ningún
umbral.

Se eligió **1:1 y no 4:3** porque es la proporción más alta que cabe, o sea la
que conserva más del sujeto.

**El encuadre de cada una se decidió MIRÁNDOLA.** El del pastel es el único con
offset: centrado dejaba fuera la base dorada y el resultado se leía como un
primer plano de pisos; con `y=700` entran los tres pisos **y** la base.

**Comprobado antes de cortar** (medido, no supuesto): las 6 son exclusivas de su
plantilla —ninguna la comparte otra— y **ninguna se usa como `backgroundImage`**
ni en `templates` ni en las invitaciones publicadas. Recortarlas no arrastra a
nadie más.

**El velo se volvió a medir y NO cambió en ninguna de las 6**: sale del peor
píxel de la banda central, que el recorte cuadrado conserva. Y se comprobó que
ese gate detecta un velo mal declarado (control positivo con mutante muerto),
así que el verde significa algo.

> **Los originales sin recortar** se recuperan de dos sitios: del historial de
> git (`git show <commit-anterior>:public/arte/foto/<archivo>`) y de su enlace de
> Pexels de las tablas de arriba, que sigue siendo la procedencia buena.

## Los SVG

Las otras diez direcciones (`arte/*.svg`) están **dibujadas a mano en este
repo**: cero assets externos, cero licencias de terceros. Ver
`src/lib/theme/arte.ts`.

## 3.ª incorporación (piloto de arte, 2026-09-09) — ornamento tipográfico PD

Descargado el **2026-09-09** con autorización explícita del dev, verificado en
la fuente ANTES de usarlo, y auto-hospedado. **No es fotografía**: es ornamento
vectorial, así que entra compuesto dentro de los SVG de arte, no como archivo
suelto.

| dato | valor |
|---|---|
| Obra | *Specimens of the types used in Ostell's printing office, Hart Street, Bloomsbury Square* |
| Publicada | Londres, **1848** |
| Autor | grabador no acreditado |
| Archivo | [`Typographic frames - Ostell 1848.svg`](https://commons.wikimedia.org/wiki/File:Typographic_frames_-_Ostell_1848.svg) en Wikimedia Commons |
| Licencia | **PD-old-70-expired** + Public Domain Mark 1.0 — «*This work is in the public domain in the United States because it was published before January 1, 1931*» |
| Atribución | no exigida (se documenta igual, por la misma razón que las fotos) |
| Verificada en la fuente | 2026-09-09, en la página del archivo |

### Por qué sólo se usan los ornamentos sueltos

La plancha trae cinco marcos completos y son **inservibles como fondo**: son
escaneos vectorizados de decenas de miles de nodos. Medido:

| pieza | crudo | gzip |
|---|---|---|
| marcos completos | 260–952 KB | **98–352 KB** |
| ornamentos sueltos | 9–34 KB | 4–15 KB |

Los SVG de arte del catálogo pesan 2–3.5 KB, así que un marco de 98 KB
gzipeados detrás de una invitación es inaceptable en la superficie del cliente.
De los 75 paths de la plancha salen **~12 ornamentos utilizables**; el resto es
texto del catálogo y viñetas figurativas que no vienen a cuento.

### Cómo se montan

Cada `d` aparece **una sola vez**, en `<defs>`, y se reusa con `<use>` — sin
eso, el primer prototipo pesaba 41 KB gzip y con eso baja a 16.8. El marco de
los cuatro lados no es ornamento escaneado sino **dos rectángulos de línea**,
que cuestan ~150 bytes. La textura de papel es `feTurbulence`: cero bytes de
imagen.

### Las piezas y su destino

| plantilla | archivo | orla (path) | cartela (path) | gzip |
|---|---|---|---|---|
| `boda-carta-romantica` | `boda-carta-romantica-arte.svg` | 48 · cenefa floral | 59 · cartela de volutas | 16.8 KB |
| `xv-manuscrita` | `xv-manuscrita-arte.svg` | 24 · volutas con hoja | 61 · marco caligráfico | 15.1 KB |
| `corporativo-sencillo` | `corporativo-sencillo-arte.svg` | 27 · greca griega | 52 · filete con rombo | 12.7 KB |

Las otras dos del piloto —`baby-shower-neutro-arte.svg` y
`cumpleanos-adulto-arte.svg`— **no llevan nada de Ostell**: son dibujo propio,
cero licencias, 0.9 y 1.0 KB gzip. Se rehicieron porque su arte anterior estaba
en una paleta ajena a la de su propia plantilla (un cielo AZUL sobre una
plantilla salvia+crema, y confeti MULTICOLOR sobre una plantilla gris entera).

### Velo medido

Los cinco van con **`overlay: 0`**. La banda central se deja limpia por diseño,
y el peor píxel da entre **10.93 y 16.62** de contraste WCAG contra el color de
texto de cada plantilla — AA pide 4.5.

> ⚠️ Medido replicando el método de `scripts/verificar-contraste-arte.mts`
> (misma banda central, mismo peor-píxel) en el navegador, porque el script no
> se pudo ejecutar: falta el Chromium de Playwright en la máquina
> (`npx playwright install`). **Queda pendiente correr el script de verdad.**
