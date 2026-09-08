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

## Los SVG

Las otras diez direcciones (`arte/*.svg`) están **dibujadas a mano en este
repo**: cero assets externos, cero licencias de terceros. Ver
`src/lib/theme/arte.ts`.
