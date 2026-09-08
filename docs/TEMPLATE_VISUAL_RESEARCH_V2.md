# Template Visual Research V2 — assets visuales por evento

> **Fase 11 del rediseño. FASE DE INVESTIGACIÓN, NO DE IMPLEMENTACIÓN.**
> Brief canónico: `~/.claude/plans/sobrely-research-v2.md`. Estado: §15 del
> roadmap.
>
> ⛔ **Aquí no se ha modificado, reemplazado ni borrado ninguna plantilla.** Al
> final de este documento el trabajo se DETIENE y espera la frase exacta
> **«APROBADO TEMPLATE RESEARCH V2»**. Y aun aprobada, sólo se implementa el
> conjunto piloto.
>
> Fecha de la investigación: **2026-09-08**. Todo lo que aquí se afirma sobre el
> estado actual está **medido contra la base de datos de producción en solo
> lectura** o **leído en la línea ejecutable**; lo que es juicio o estimación va
> marcado como tal.

---

## 0. Decisiones de arranque tomadas con el dev

Antes de gastar trabajo se resolvieron las tres cuestiones que el §15 del
roadmap dejaba abiertas:

1. **Esta fase va ANTES que la Fase 7 (Theme System) y redefine su alcance.**
   La Fase 11 no escribe código, así que no hay trabajo que perder; su
   conclusión decide qué parte de la Fase 7 sobrevive.
2. **Se investigan las 9 categorías**, y este documento **dimensiona el coste**
   de abrir las 4 nuevas sin implementarlas (§14-bis).
3. **El estado actual se analiza desde las 50 miniaturas del repo**
   (`public/previews/plantillas/*.jpg`), que son renders deterministas de las 50
   plantillas reales. Límite declarado: el recorte es de **560 px**, así que lo
   que cae más abajo en la invitación no aparece en la miniatura.

Y una decisión de método, tomada al ver los primeros datos:

4. **Se investiga primero qué composiciones puede renderizar el producto**
   (§11-bis) y después se eligen las imágenes. Motivo en §1: el cuello de
   botella medido no son las imágenes.

---

## 1. Problemas encontrados en las plantillas actuales

El dev listó 10 problemas percibidos. Los 10 se confirman, pero **la causa no es
la que parecía**. Medición sobre las 50 plantillas activas de producción.

### 1.1 Las 50 plantillas son el MISMO layout

| medida | valor |
|---|---|
| secuencias de módulos distintas | **5** sobre 50 plantillas |
| plantillas que abren con `hero` | **50 / 50** |
| plantillas que abren `hero > welcome` | **45 / 50** |

Las cinco secuencias:

```
20x  hero > welcome > countdown > map > gallery > itinerary > dresscode > music > gifts > rsvp
10x  (la misma, con video)
10x  hero > welcome > countdown > rsvp
 5x  hero > countdown > map > rsvp
 5x  hero > welcome > countdown > map > gifts > rsvp
```

O sea que la "variedad" del catálogo es **la longitud de la lista**, no la
composición.

### 1.2 El renderer sólo sabe producir una columna centrada

Leído en `src/components/modules/previews.tsx` (652 líneas):

- `Section` es una banda a todo el ancho con el contenido en `mx-auto max-w-xl`
  centrado. Tiene exactamente **dos perillas**: `tint` (fondo teñido) y `wide`
  (más ancho en escritorio). No hay alineación, ni columnas, ni sangrado.
- **14 `text-center`** frente a **2 `text-left/right`**.
- **Un solo eje horizontal en todo el archivo**: el itinerario, que en
  escritorio pasa su lista a `grid-cols-2`. Es una lista que envuelve, no una
  composición.

`HeroPreview` tiene **una única composición**: `flex-col items-center
justify-center text-center`, y si hay foto la pinta a sangre con un velo
**fijo** de `rgba(0,0,0,.45)` y el texto forzado a blanco.

> Ese velo fijo contradice la disciplina que el propio repo ya tiene: el
> `scripts/verificar-contraste-arte.mts` calcula el **velo mínimo** por imagen
> (0.10, 0.20 y 0.35 en las tres fotos actuales) precisamente porque un valor
> fijo o se queda corto y deja texto ilegible, o se pasa y borra la foto.

### 1.3 La fotografía del producto no existe

| medida | valor |
|---|---|
| heroes con `imageUrl` | **0 / 50** |
| plantillas con módulo `gallery` | 30 / 50 |
| de esas, con **cero** imágenes | **30 / 30** |
| `stickers` usados | **0 / 50** |

El detalle que más duele: las 30 galerías **sí varían su layout** (`grid` 11,
`masonry` 7, `carousel` 8, `collage` 4). Hay variedad compositiva declarada en
la base de datos que **no se ve**, porque no hay ninguna imagen que colocar.

### 1.4 El arte de fondo existe, y aun así lee como tinte plano

- **50 / 50** plantillas tienen `backgroundImage`.
- Pero son **13 artes distintas**, repartidas así: Boda 3 · XV 4 · Baby 2 ·
  Cumpleaños 2 · Corporativo 2. **Diez plantillas de cumpleaños comparten dos
  piezas de arte.**
- El `overlay` **no es la opacidad del arte**: es un velo del color de fondo
  ENCIMA (`theme-scope.tsx:122`). Con **41 de 50 a 0.05**, el arte se ve casi
  entero.

Conclusión que sí se sostiene: si el arte se ve al 95 % y aun así el catálogo
parece de color plano, **el problema es el arte**, no el velo. Las piezas son
decorativas y de bajo contraste; no son composición.

### 1.5 La tipografía no tiene con qué diferenciarse

- `font` es un **enum de cuatro valores** (`sans` 26 · `script` 9 · `elegant` 8
  · `serif` 7) y es **una sola familia por invitación**.
- **No existe el par heading / body** en el esquema. La Fase 7 se proponía
  "pairing tipográfico" sobre un campo que no está.
- `spacing`: 3 valores. `mode`: **48 claro / 2 oscuro**.

### 1.6 Lo único que de verdad varía es el color

**32 colores primarios distintos** y **27 fondos distintos** sobre 50
plantillas. Es, exactamente, el problema nº 1 de la lista del dev — y ahora está
cuantificado: el color es el único eje con variedad real.

### Los 10 problemas del dev, contra la medición

| # | Problema declarado | Veredicto |
|---|---|---|
| 1 | Sólo color/gradiente | **Confirmado.** 32 primarios y 27 fondos son el único eje con variedad |
| 2 | Falta fotografía del evento | **Confirmado y peor:** 0/50 heroes con foto, 30/30 galerías vacías |
| 3 | Falta dirección artística | **Confirmado.** 13 artes para 50, 2 por categoría en Cumpleaños y Baby |
| 4 | Se sienten iguales | **Confirmado.** 5 secuencias para 50; 45/50 abren idéntico |
| 5 | Composición muy simple | **Confirmado en el código.** Un solo eje horizontal en 652 líneas |
| 6 | Poco uso de imagen principal | **Confirmado.** El hero soporta foto y ninguna la usa |
| 7 | Podrían ser de cualquier categoría | **Confirmado.** Cumpleaños usa `sans` en 8/10 y 2 artes en 10 |
| 8 | Falta sensación editorial | **Confirmado, y no es de gusto:** no hay primitiva que lo permita |
| 9 | Falta variedad de layouts | **Confirmado.** No hay campo de layout en ningún módulo salvo galería |
| 10 | Identidad visual débil | **Confirmado.** Una fuente, un layout, arte compartido |

### 1.7 La conclusión que reordena la fase

**Meter fotografía editorial en este esqueleto no da diseño editorial: da el
mismo apilado centrado con una foto detrás.** Los 15 layouts que pide el brief
(§8 del brief, §11 aquí) hoy **no se pueden expresar**. Por eso este documento
antepone las primitivas (§11-bis) a la selección de imágenes.

---

## 2. Análisis de las capturas proporcionadas

Fuente usada, por decisión del dev: las **50 miniaturas del repo**, no capturas
sueltas. Son renders deterministas (md5 estable entre corridas) de las 50
plantillas reales con su arte aplicado.

Se montaron cinco hojas de contacto, una por tipo de evento, y se miraron a
tamaño de rejilla. Lo que se ve, categoría por categoría:

- **Boda (10).** Todas comparten el mismo bloque: título serif centrado, línea
  de antetítulo en versalitas entre filetes, párrafo breve, contador. Cambian el
  tinte (crema, salvia, terracota, azul empolvado) y poco más. Dos se salen algo
  por color (`boda-de-lujo` en azul profundo, `boda-terracota`), ninguna por
  composición.
- **XV años (10).** El bloque es idéntico al de boda con paleta rosa/vino. Las
  dos oscuras (`xv-noche-estelar`, `xv-produccion-completa`) son las únicas que
  rompen la nota, y lo hacen con **color**, no con estructura.
- **Baby shower (10).** El conjunto más uniforme de los cinco: degradados
  pastel rosa-azul casi indistinguibles entre sí a tamaño de miniatura. Es la
  categoría donde el problema nº 4 ("se sienten iguales") es más visible.
- **Cumpleaños (10).** La más variada de las cinco **en copy** ("¡Fiesta
  jurásica!", "¡Vamos al partido!", "¡Despeguemos!"), y aun así idéntica en
  composición: el tema se comunica con una palabra y un emoji de partícula, no
  con imagen.
- **Corporativo (10).** Fondos casi blancos con acento azul o gris. Se lee
  serio y se lee **vacío**: es la categoría con menos señal visual de todas.

> **Limitación declarada:** la miniatura recorta a 560 px, así que este análisis
> cubre la apertura de la invitación (hero + primer módulo), que es justo donde
> se decide la primera impresión, pero **no** el resto del documento.

---

## 3. Benchmark visual

Tres referencias, **observadas en vivo el 2026-09-08**, no recordadas. Cada una
resuelve el problema premium por un camino distinto y coherente.

### 3.1 Invitio — canvas libre (ya analizado en §10 del roadmap)

Editor de canvas absoluto con secciones de 900 px y **renuncia al responsive**.
Riel de 7 pestañas (Plantillas, Elementos, Figuras, Imágenes, Animación,
Secciones, Capas), capas planas con z-order, banco de imágenes propio por tipo
de evento. Tope de 3 secciones en gratis, con **muro de registro, no de pago**.

**Qué tomar:** el banco de imágenes por tipo de evento.
**Qué NO tomar:** el canvas absoluto. El responsive real es la ventaja
competitiva de Sobrely y no se negocia.

### 3.2 Joy (withjoy.com) — el layout como eje del sistema

Se vende, literalmente, como *«combinaciones de diseño infinitas»*: el usuario
mezcla **layout × tema × fuente × color × foto**. Sus plantillas muestran
composiciones que Sobrely no tiene:

- *Charlotte* — foto a sangre con banda de color arriba para los nombres.
- *Eucalyptus* — **split 50/50**: foto a la izquierda, tarjeta de texto a la
  derecha, e ilustración botánica cabalgando la costura.
- *Deco Sunburst Silver* — foto a sangre con gráfico de rayos flanqueando.
- *Rustic Chic 2* — **asimétrica**: foto desplazada a la izquierda solapando un
  bloque de color a la derecha.

**El hallazgo estructural: la foto es la del USUARIO.** Lo premium lo pone el
**marco** —la composición, la retícula, el elemento gráfico que cruza la
costura—, no la fotografía. Eso reduce muchísimo la dependencia de stock.

### 3.3 Greenvelope — el modelo opuesto, y también premium

**Cero fotografía.** Ilustración firmada por artista, jerarquía tipográfica muy
marcada (nombre en script grande, datos en versalitas pequeñas), marco floral, y
la **forma de la tarjeta** como elemento de diseño (hay una en arco). Cada
diseño se ofrece en varias paletas: su respuesta a la variedad sin multiplicar
diseños.

**Qué tomar:** que se puede llegar a premium sin una sola foto, con
ilustración + tipografía + forma. Y las **variantes de paleta por diseño**, que
dan variedad sin inflar el catálogo.

### 3.4 Dónde queda Sobrely

Ni una cosa ni la otra: columna centrada + tinte plano + arte tenue de fondo.
No tiene el marco de Joy ni el oficio gráfico de Greenvelope.

---

## 4. Investigación Pexels

**Licencia leída en la fuente hoy** (https://www.pexels.com/license/):

- ✅ Uso gratuito, **comercial incluido**. Atribución **no requerida**.
- ✅ Modificación permitida.
- ⛔ No vender copias **sin modificar**.
- ⛔ No usar en marca, nombre comercial o marca de servicio.
- ⛔ **No implicar respaldo** de las personas o marcas retratadas.
- ⛔ Las personas identificables no pueden aparecer **bajo una luz negativa**.
- ⛔ **No redistribuir ni vender las fotos en otras plataformas de stock.**

**Perfil observado:** Pexels es fuerte en **escenas de evento montadas** (mesas
puestas, decoración, tartas, papelería) y débil justo donde el evento es
inseparable de las personas.

## 5. Investigación Unsplash

**Licencia leída en la fuente hoy** (https://unsplash.com/license):

- ✅ Licencia irrevocable, no exclusiva y mundial para descargar, copiar,
  **modificar**, distribuir y usar, **incluido uso comercial**, sin permiso ni
  atribución.
- ⛔ No vender copias **sin modificación significativa**.
- ⛔ **«This license does not include the right to compile images from Unsplash
  to replicate a similar or competing service.»**

**Perfil observado:** Unsplash rinde claramente mejor en **objeto aislado,
abstracción y textura** (globos pastel contra cielo, tela, papel), y su
fotografía es de acabado más editorial. Pexels rinde mejor en **escena de evento
concreta**.

### 5-bis. La restricción compartida que decide la arquitectura de assets

Las dos licencias prohíben, con distintas palabras, **lo mismo**: convertir sus
imágenes en un servicio de imágenes. Por lo tanto:

> El sistema de assets de Sobrely tiene que ser un **catálogo interno ligado al
> diseño** — imágenes que viven dentro de plantillas concretas — y **nunca un
> explorador de imágenes para el usuario final**. Un banco de imágenes navegable
> dentro del editor (como el de Invitio) es exactamente lo que ambas licencias
> vetan si se surte de ellas.

Y la restricción del entorno sigue en pie y no se renegocia: **cero
phone-home**. Toda imagen se **descarga y auto-hospeda**; jamás se enlaza a
`images.pexels.com` ni a `images.unsplash.com`, que serían un CDN en runtime.

---

## 6. Búsquedas utilizadas

Todas ejecutadas el 2026-09-08. La columna «resultado» es lo observado.

| Categoría | Búsqueda | Fuente | Resultado observado |
|---|---|---|---|
| Boda | `wedding table decor` | Pexels | ❌ Planos generales de salón: ruido, sin espacio negativo |
| Boda | `wedding stationery flat lay` | Pexels | ✅ Papelería pálida y monocroma, zonas planas |
| Boda | `wedding flat lay` | Unsplash | ✅ Acabado editorial, tela y papel |
| XV años | `quinceanera dress detail` | Pexels | ❌ **9 de 10 retratos de menores identificables** |
| XV años | `tiara crown on fabric` | Pexels | ✅ 6 de 10 bodegones puros, sin personas |
| Baby | `baby shower flat lay` | Pexels | ❌ Anuncios de embarazo (test, ecografía): otro momento |
| Baby | `knitted baby booties neutral` | Pexels | ✅ Bodegón de punto y flor seca, paleta apagada |
| Gender reveal | `gender reveal balloons confetti` | Pexels | ❌ **8 de 8 grupos de personas identificables** |
| Gender reveal | `pastel balloons` | Unsplash | ✅ Globos aislados, cielo como espacio negativo |
| Cumpleaños | `birthday cake candles close up` | Pexels | ⚠️ Objetos válidos, pero **muchas velas con número** |
| Bautizo | `baptism candle white church` | Pexels | ⚠️ Mayoría ceremonias con bebés identificables; 2 bodegones |
| Comunión | `first communion decoration` | Pexels | ❌ **6 de 8 niñas identificables**; 2 bodegones |
| Graduación | `graduation cap diploma flat lay` | Pexels | ✅ Flat lays limpios; ⚠️ alguno con **año impreso** |
| Corporativo | `conference stage lights empty` | Pexels | ⚠️ Auditorios vacíos, genéricos; uno con **banderas** |

### 6.1 Lo que estas búsquedas enseñaron (y el brief no podía anticipar)

**a) La formulación de la búsqueda decide si la foto sirve de fondo.** No es el
tema: es el encuadre. `flat lay`, `close up`, `detail`, `still life` devuelven
imágenes con **rango de luminancia estrecho y zonas planas**; `venue`,
`reception`, `party`, `celebration` devuelven planos generales inservibles como
telón. Esto continúa —y ahora explica— la regla que la 1.ª investigación había
derivado midiendo: *«una foto sirve de fondo si tiene rango de luminancia
estrecho y centro vacío»*.

**b) Hay categorías donde el evento ES la persona.** En **XV años, Gender
Reveal, Bautizo y Primera Comunión**, buscar el nombre del evento devuelve
abrumadoramente personas identificables — y en tres de las cuatro, **menores de
edad**. Esto choca a la vez con la regla visual del dev
(`EVENTO > OBJETOS > … > PERSONAS`), con la prohibición de implicar respaldo, y
con el hecho de que **ninguna de las dos licencias garantiza model releases**.

> **Regla dura que propongo, más estricta que la del brief:** en esas cuatro
> categorías **nunca** se busca por el nombre del evento. Se busca el **objeto**
> (tiara, vela, globo, cruz, tela) y se descarta toda imagen con cara o cuerpo
> reconocible. La 1.ª investigación ya vetaba caras identificables por licencia;
> aquí se refuerza y además se convierte en **estrategia de búsqueda**, no sólo
> en filtro posterior.

**c) Una imagen no puede traer datos horneados.** Aparecieron velas de número
(`5`, `2`, `23`, `80`), un calendario de `2021` y banderas de un país. Una
plantilla es genérica por definición: **toda imagen que codifique una edad, un
año, un nombre o una nacionalidad queda descartada**, por bonita que sea.

**d) El texto alternativo de Pexels no es fiable.** En la búsqueda de
graduación, tres imágenes venían rotuladas «scrabble tiles», «toothbrush» y
«happy birthday greeting card» sobre fotos de diplomas. **La selección tiene que
ser visual**; el alt sirve para registrar, no para elegir.

---

## 7. Assets seleccionados (CANDIDATOS — ninguno aprobado todavía)

⚠️ **Nada de esta lista está aprobado ni descargado.** Son candidatos vistos en
la rejilla de resultados. Su aprobación exige, obligatoriamente, pasar por
`scripts/verificar-contraste-arte.mts`, que mide el **peor píxel de la banda
central** y calcula el **velo mínimo**. Ese paso es de implementación, no de
investigación: aquí no se descarga nada.

### Boda — Pexels
| id | descripción observada | orientación |
|---|---|---|
| `11650091` | Papelería y sobres con verde sobre superficie pastel | horiz |
| `20235414` | Invitaciones con cintas sobre papel texturado, cenital | vert |
| `28931796` | Invitación rústica con cinta y flor seca sobre madera | vert |
| `11650473` | Papelería en blanco, cintas y flores, muy pálida | horiz |
| `29821860` | Invitaciones sobre fondo rosa suave | vert |

### Boda — Unsplash
| id | descripción observada |
|---|---|
| `photo-1721176487015-5408ae0e9bc2` | Mesa vestida, cenital, tonos crema |
| `photo-1734578998441-8fab204d5b68` | Zapatos junto a ramo — **revisar**: puede leerse como objeto personal |
| `photo-1648654604111-a32f8ba51a1e` | Papel blanco sobre mesa, muy vacío — buen telón |

### XV años — Pexels (SÓLO objeto)
| id | descripción observada |
|---|---|
| `7127246` | Tiara de diamantes sobre fondo oscuro, primer plano |
| `7127245` | Variante de la anterior |
| `15553579` | Corona sobre superficie, bodegón |
| `6567673` | Tiara, anillos y velo sobre mesa |

> Las cuatro son de **fondo oscuro o medio**. Recordatorio del §10 del roadmap:
> el catálogo es **96 % de tema claro** y sólo dos plantillas pueden hospedar
> arte de fondo oscuro. Estas piezas encajan como **foto de hero** (superficie
> propia, con su velo medido), no como `backgroundImage`.

### Baby shower — Pexels
| id | descripción observada |
|---|---|
| `5360746` | Punto, patucos y flor seca sobre taburete de madera — **la más limpia** |
| `36858946` | Patucos con ramo delicado, paleta suave |
| `12850749` | Tarjetas florales sobre mármol |

### Gender reveal — Unsplash (SÓLO objeto)
| id | descripción observada |
|---|---|
| `photo-1611142288262-3bb8f5fc45d7` | Globos azules y amarillos contra nubes — cielo = espacio negativo |
| `photo-1554778414-74925d96d495` | Globos en el aire, fondo limpio |
| `photo-1550850395-c17a8e90ad0a` | Globos blancos, azules y morados |

### Cumpleaños — Pexels
| id | descripción observada |
|---|---|
| `35472148` | Manos encendiendo velas doradas sobre pastel blanco — ⚠️ manos |
| `26756768` | Porción con vela y frutos rojos, primer plano |

> Descartadas por norma: `12616001` (vela «5»), `7221147` («2»), `14017537`
> («23»), `36254950` («80»).

### Bautizo — Pexels
| id | descripción observada |
|---|---|
| `6168240` | Vela con cruz en cesta de mimbre, primer plano |
| `6168239` | Ajuar blanco con corona de flores y vela sobre seda roja |

### Primera comunión — Pexels
| id | descripción observada |
|---|---|
| `11474320` | Crucifijo de madera entre cintas azules |
| `36027414` | Montaje blanco de celebración con tarta |

### Graduación — Pexels
| id | descripción observada |
|---|---|
| `8177931` | Diploma con cinta roja sobre carpeta, cenital |
| `7723824` | Diploma con cinta rosa, flat lay |
| `7723728` | Tarjeta, borla y agenda, minimalista |

> Descartada: `8177940` (calendario **2021** visible).

### Corporativo
Ninguna candidata fotográfica convence. Los auditorios vacíos son genéricos,
ruidosos y a veces con marcadores de país. **Recomendación: corporativo va por
textura y material** (papel, hormigón, degradado, retícula), no por fotografía
de evento — que además es la categoría donde el cliente menos espera una foto.

---

## 8. Criterios de selección

Los 13 del brief siguen vigentes. Se añaden **cinco**, todos salidos de lo
observado hoy, y los cinco son **eliminatorios**:

| # | Criterio nuevo | Por qué |
|---|---|---|
| E1 | **Cero caras o cuerpos reconocibles** | Ninguna licencia garantiza model release; y en 4 categorías serían menores |
| E2 | **Cero datos horneados** (edad, año, nombre, bandera) | Una plantilla es genérica; la imagen no puede contradecirlo |
| E3 | **Encuadre de detalle, no plano general** | Medido: los planos generales no dan telón legible |
| E4 | **Elegida MIRÁNDOLA, nunca por su alt** | El alt de Pexels resultó erróneo en 3 de 8 en una búsqueda |
| E5 | **Velo mínimo ≤ 0.35 medido por el script** | Por encima ya no se ve una foto, se ve un color (precedente: `boda-flores-cinta`, 0.55, descartada) |

---

## 9. Dirección artística recomendada

**Una dirección por categoría, no una por plantilla.** Hoy hay 13 artes para 50
plantillas repartidas sin criterio de familia; la propuesta es al revés: cada
categoría tiene una **paleta madre, un par tipográfico y un repertorio de
materiales**, y las plantillas de esa categoría se diferencian por
**composición**, no por color.

| Categoría | Material dominante | Paleta madre | Registro |
|---|---|---|---|
| Boda | Papel, lino, cera, flor seca | Marfil · oliva · arena | Editorial sobrio |
| XV años | Metal, seda, cristal | Vino · oro viejo · nude | Glamour contenido |
| Baby shower | Punto, algodón, acuarela | Crema · salvia · durazno | Cálido y táctil |
| Gender reveal | Globo, confeti, cielo | Rosa · azul · blanco roto | Aire y expectativa |
| Cumpleaños | Papel picado, cera, azúcar | Según sub-tema | Festivo gráfico |
| Bautizo | Cera, lino blanco, mimbre | Blanco · oro pálido | Sereno |
| Primera comunión | Madera, cinta, vela | Blanco · trigo | Sereno, más cálido |
| Graduación | Papel, cinta, tinta | Tinta · crema · un acento | Sobrio con acento |
| Corporativo | Papel, hormigón, retícula | Neutro + 1 acento de marca | Tipográfico puro |

**El principio de fondo, tomado del benchmark:** lo premium lo pone **el marco y
la composición**, no la foto. Joy lo demuestra con la foto del propio usuario;
Greenvelope, sin ninguna foto.

---

## 10. Nuevos estilos de templates

Cinco **familias compositivas** que atraviesan las categorías. Cada plantilla
nueva pertenece a una, y **dos plantillas de la misma categoría no pueden
compartir familia** — así la regla de diferenciación del brief se vuelve
mecánica y comprobable, en vez de un juicio.

| Familia | Idea | Foto |
|---|---|---|
| **F1 · Editorial partido** | Retícula 50/50: media imagen, medio texto alineado a un lado | sí |
| **F2 · Telón total** | Imagen a sangre con velo medido y tipografía grande encima | sí |
| **F3 · Objeto y aire** | Imagen pequeña, mucho espacio negativo, tipografía protagonista | sí, pequeña |
| **F4 · Papelería** | Sin foto: textura, marco, filetes y jerarquía tipográfica (modelo Greenvelope) | no |
| **F5 · Marco para tu foto** | La composición es el marco; la imagen la pone el usuario (modelo Joy) | del usuario |

> **F5 es la más valiosa comercialmente y la más barata**: no consume licencias,
> no pesa en el repo, y convierte el `hero.imageUrl` —que hoy soportan las 50 y
> no usa ninguna— en la superficie principal del producto.

---

## 11. Layouts recomendados

Los 15 del brief, clasificados por lo que hoy es posible:

| Layout | ¿Hoy? | Necesita |
|---|---|---|
| Fotografía full-screen + overlay | ⚠️ parcial | Velo medido en vez del `.45` fijo |
| Imagen recortada + bloque de color | ❌ | P1, P2 |
| Collage fotográfico | ⚠️ | Ya existe en galería; necesita imágenes |
| Fotografía circular | ❌ | P2 (recorte) |
| Fotografía dividida 50/50 | ❌ | P1, P2 |
| Fotografía vertical + texto superpuesto | ❌ | P2, P3 |
| Grid editorial | ❌ | P1 |
| Foto pequeña + mucho espacio negativo | ❌ | P2 |
| Imagen de detalle + tipografía grande | ❌ | P2, P4 |
| Fotografía + decoración gráfica | ⚠️ | `stickers` ya existe y nadie lo usa |
| Composición asimétrica | ❌ | P1 |
| Composición tipo magazine | ❌ | P1, P4 |
| Composición basada en objetos | ❌ | P2 |
| Composición basada en textura | ✅ | Ya posible con `backgroundImage` |
| Minimalista sin fotografía | ⚠️ | P4 (tipografía) |

**Dos de quince son posibles hoy.**

---

## 11-bis. Primitivas de composición — lo que falta para poder renderizar §11

Esta sección existe porque el dev eligió la opción (b): entender qué puede
renderizar el modelo modular **antes** de elegir imágenes. Todo lo de aquí se
expresa **dentro del modelo por módulos con responsive real** — nunca volviendo
al canvas absoluto de Invitio, que es la ventaja que Sobrely no debe ceder.

### P1 · `Section` gana alineación y sangrado

Hoy: `tint` y `wide`. Propuesta: añadir `align` (`start | center | end`) y
`bleed` (`contained | full`), más una retícula opcional de 12 columnas con
`span`/`offset` que en móvil colapsa a una columna.

Desbloquea: editorial partido, grid, asimétrica, magazine.
Riesgo: ninguno para lo existente si los valores por defecto son los de hoy
(`center`, `contained`) — sería un cambio de **cero píxeles** en las 50, como ya
se hizo en la Fase 1 con los tokens.

### P2 · Un slot de media por módulo

Hoy sólo `hero` y `gallery` aceptan imagen. Propuesta: un bloque `media` común
—`{ url, position: none|top|bottom|left|right|background, ratio, focal, overlay,
shape: rect|circle|arch }`— disponible en los módulos de contenido.

Desbloquea: imagen + bloque de color, circular, 50/50, vertical con texto
encima, objeto y aire, detalle + tipografía.
**`overlay` debe salir del `verificar-contraste-arte.mts`, no de un valor a
ojo** — y esto arregla de paso el `rgba(0,0,0,.45)` fijo del hero.

### P3 · Variantes de `hero`

Hoy: una. Propuesta: `variant: centered | split | offset | editorial | plain`,
con `centered` como defecto para no mover las 50.

### P4 · Par tipográfico y escala

El `font` enum de 4 se queda por retro-compatibilidad y se le añade
`typography: { heading, body, scale, tracking }`. **Esta es la pieza de la Fase 7
que sobrevive entera** — y ahora se sabe que no era "pairing" sino **crear** el
par, porque el campo no existía.

### P5 · Marco y forma

Filetes, marco, esquinas y forma de tarjeta (el arco de Greenvelope). Es lo que
sostiene la familia F4 sin gastar una sola licencia.

### P6 · Reusar `stickers`

Ya existe: posición y tamaño **fraccionarios** (responsive por construcción) y
z-order por orden del arreglo. **0 de 50 lo usan.** Es la primitiva de
decoración gráfica ya construida y pagada.

> ⚠️ **Dos avisos para quien implemente.** (1) Cualquier layout nuevo tiene que
> respetar el telón `sticky`: ningún ancestro puede usar `overflow: hidden`, y
> hay un guard mecánico que lo defiende. (2) `stickers` y `decoration.imageUrl`
> **cuentan como arte propio** y disparan el gate de `custom_art`; si una
> plantilla los usa, hay que servirlos desde la app (ruta relativa a la raíz)
> para que `esArteDeLaApp` los exima — la lección de `b48d823`.

### Orden propuesto

**P4 → P1 → P2 → P3 → P5 → P6.** La tipografía primero porque es la que más
cambia la percepción por unidad de trabajo y no toca layout; P2 al centro porque
es la más grande; P6 al final porque ya existe.

---

## 12. Sistema de assets

Estructura propuesta, coherente con lo que ya funciona (`src/lib/theme/arte.ts`
+ `public/arte/PROCEDENCIA.md`):

```
public/assets/<categoria>/<slug>.jpg        · auto-hospedado, cero phone-home
src/lib/assets/registro.ts                  · metadata tipada
public/assets/PROCEDENCIA.md                · manifiesto de cumplimiento
```

Metadata por asset, la del brief más lo que la medición exige:

```ts
{
  source, provider, author, originalUrl, license, licenseCheckedAt,
  category, tags, orientation, dominantColors, usage,
  polaridad: "claro" | "oscuro",   // qué color de texto admite (medido)
  veloMinimo: number,              // salida de verificar-contraste-arte.mts
  usadoEn: string[],               // plantillas que lo usan
}
```

**`polaridad` y `veloMinimo` no son opcionales.** Son la diferencia entre el arte
de la 1.ª tanda —que pasó por el medidor y cazó dos defectos reales— y meter
fotos a ojo.

⛔ **Lo que este sistema NO puede ser**, por licencia (§5-bis): un explorador de
imágenes navegable por el usuario final. Es un catálogo interno, ligado a
plantillas.

---

## 13. Licencias

| | Pexels | Unsplash |
|---|---|---|
| Uso comercial | ✅ | ✅ |
| Atribución | no requerida | no requerida |
| Modificar | ✅ | ✅ |
| Vender copias sin modificar | ⛔ | ⛔ (exige modificación *significativa*) |
| Usar en marca/logo | ⛔ | no lo menciona → **tratar como prohibido** |
| Implicar respaldo de personas/marcas | ⛔ | no lo menciona → **tratar como prohibido** |
| Rehacer un servicio de stock | ⛔ redistribuir en otras plataformas | ⛔ **compilar para replicar un servicio similar** |
| Model releases | **no garantizados** | **no garantizados** |

**Procedimiento obligatorio por asset:** fuente · autor si consta · URL original
· licencia · **fecha de consulta** · uso previsto. Duda razonable →
`LICENSE_REVIEW_REQUIRED` y **no se usa**.

El manifiesto existe para **poder demostrar cumplimiento**, no porque la
licencia lo exija.

---

## 14. Cantidad recomendada por categoría

**Ninguna cifra es una meta.** Estas salen de cuántas familias compositivas
(§10) tienen sentido en cada categoría, no de rellenar una tabla.

| Categoría | Hoy | Propuesta | Familias que aplican |
|---|---|---|---|
| Boda | 10 | **7** | F1 F2 F3 F4 F5 (+2 variantes de paleta) |
| XV años | 10 | **6** | F2 F3 F4 F5 (+2) |
| Baby shower | 10 | **6** | F1 F3 F4 F5 (+2) |
| Gender reveal | 0 | **5** | F2 F3 F4 F5 |
| Cumpleaños | 10 | **6** | F1 F2 F4 F5 (+2) |
| Bautizo | 0 | **4** | F3 F4 F5 |
| Primera comunión | 0 | **4** | F3 F4 F5 |
| Graduación | 0 | **4** | F1 F3 F4 F5 |
| Corporativo | 10 | **5** | F1 F4 F5 (+2, sin fotografía) |
| **Total** | **50** | **47** | |

## 14-bis. Coste de abrir las 4 categorías nuevas

Dimensionado explícitamente, como pidió el dev, y **verificado en el código y en
las migraciones — no estimado**. La conclusión corrige a la baja lo que el §15
del roadmap daba por hecho.

### Lo que NO cuesta nada (medido)

| Supuesto del plan | Realidad verificada |
|---|---|
| «toca el esquema / `event_type`» | ❌ `event_type` es **`text` plano** en `templates` y en `invitations` (`0001_initial_schema.sql:48,72`). **Sin `CHECK`, sin enum, sin constraint.** No hace falta ninguna migración |
| «toca el filtro del marketplace» | ❌ El filtro **deriva las facetas del dato** (`marketplace.ts:99-100`, `cuenta.set(tpl.event_type, …)`). Una categoría nueva aparece sola al sembrarla |
| «toca el asistente de creación» | ❌ No hay selector: en Ajustes el tipo de evento es un **`<Input>` de texto libre** (`settings-panel.tsx:52-56`), y `createInvitation` ni siquiera lo escribe |

**No existe en todo el repo una constante que enumere los tipos de evento.** Las
«5 categorías» son, simplemente, los 5 valores distintos que hay sembrados.

### Lo que sí cuesta

| Qué | Detalle | Tamaño |
|---|---|---|
| Seed de plantillas | Filas nuevas por categoría | el del catálogo que se apruebe |
| Landings SEO | Hay una ruta por tipo (`/invitaciones-digitales-boda`, `-xv-anos`, `-cumpleanos`, `-baby-shower`, `-corporativas`). Cuatro nuevas | **medio: es contenido, no sólo ruta** |
| Miniaturas | Una por plantilla nueva, y **`REVISION_MINIATURAS` tiene que subir en la misma tanda** o `next/image` sirve las viejas hasta 4 h | bajo, ya resuelto |
| Copy de la landing raíz | `page.tsx` y `opengraph-image.tsx` enumeran los tipos **a mano** en el copy | bajo |

**Veredicto: abrir las 4 categorías es barato.** Lo caro no son las categorías,
son las plantillas que las llenen — que es justo lo que el piloto decide.

> Nota aparte, encontrada de paso: como `event_type` es texto libre y sin
> normalizar, dos invitaciones pueden acabar con `Boda` y `boda`. Hoy no afecta
> al marketplace, que cuenta sobre **plantillas** y no sobre invitaciones, pero
> conviene saberlo antes de construir nada que agrupe invitaciones por tipo.

---

## 15. Justificación de la cantidad

De 50 a 47 con **casi el doble de categorías**. Se sostiene porque:

- Hoy la variedad es **falsa**: 5 layouts y 13 artes para 50 plantillas. Siete
  plantillas de boda con siete composiciones distintas dan más variedad real que
  las diez actuales, que son una repetida diez veces.
- La **regla mecánica** de §10 (dos plantillas de la misma categoría no comparten
  familia) pone un techo natural: más allá de 5-7 por categoría habría que
  repetir familia, y repetir familia es exactamente lo que el dev pidió evitar.
- Las **variantes de paleta** (modelo Greenvelope) dan amplitud percibida sin
  añadir plantillas.
- Corporativo baja de 10 a 5 porque medido es la categoría más vacía y la que
  menos se elige por diseño.

---

## 16. Templates recomendados — el PILOTO

15 plantillas, el reparto que propuso el dev. Cada una con su familia, de modo
que **el piloto ejercita las cinco familias y las seis primitivas**.

| # | Nombre | Categoría | Familia | Imagen | Primitivas que valida |
|---|---|---|---|---|---|
| 1 | Papel y Lino | Boda | F4 | ninguna | P4 P5 |
| 2 | Jardín Partido | Boda | F1 | Pexels `11650091` | P1 P2 |
| 3 | Marco Nuestro | Boda | F5 | del usuario | P2 P3 P5 |
| 4 | Corona | XV años | F3 | Pexels `7127246` | P2 P4 |
| 5 | Seda | XV años | F4 | ninguna | P4 P5 |
| 6 | Punto y Flor | Baby shower | F1 | Pexels `5360746` | P1 P2 |
| 7 | Nube de Algodón | Baby shower | F4 | ninguna | P4 P6 |
| 8 | Cielo | Gender reveal | F2 | Unsplash `photo-1611142288262…` | P2 P3 |
| 9 | Dos Sobres | Gender reveal | F4 | ninguna | P4 P5 |
| 10 | Vela | Cumpleaños | F3 | Pexels `26756768` | P2 P4 |
| 11 | Papel Picado | Cumpleaños | F4 | ninguna | P5 P6 |
| 12 | Cera Blanca | Bautizo | F3 | Pexels `6168240` | P2 P4 |
| 13 | Cinta | Primera comunión | F4 | ninguna | P5 |
| 14 | Diploma | Graduación | F1 | Pexels `8177931` | P1 P2 |
| 15 | Retícula | Corporativo | F4 | ninguna (textura) | P1 P4 |

**Ocho de las quince no consumen ninguna licencia** (las siete F4, más la F5, que usa la foto del anfitrión). Es deliberado: si la
dirección visual sólo funciona con fotos compradas, no es dirección visual.

### Puntuación

⚠️ **Las 6 métricas del brief (Visual Quality, Uniqueness, Event Relevance,
Composition, Premium Feel, Mobile Potential) NO se puntúan aquí**, y es a
propósito: puntuar un diseño que todavía no existe sería inventarme el número.
La puntuación se hace **sobre el piloto renderizado**, con su miniatura
capturada, y **el umbral de 8/10 se aplica ahí**: lo que no llegue, se rediseña
o se descarta antes de tocar el resto del catálogo.

---

## 17. Templates descartados y por qué

| Descartado | Motivo |
|---|---|
| Cualquier plantilla de XV con fotografía del evento | Devuelve menores identificables; sin model release |
| Ídem Gender Reveal, Bautizo, Primera Comunión | Mismo motivo |
| Corporativo con foto de auditorio | Genérico, ruidoso y con marcadores de país |
| Fotos con vela de número, año o bandera | Contradicen la genericidad de una plantilla (E2) |
| «Banco de imágenes» navegable en el editor | Prohibido por ambas licencias (§5-bis) |
| Segunda plantilla de la misma familia en una categoría | Regla de diferenciación de §10 |
| Duplicar una plantilla cambiando sólo el color | Es lo que el dev pidió eliminar; se resuelve con variantes de paleta |

---

## 18. Priorización

1. **P4 · tipografía** — máximo cambio percibido por unidad de trabajo, no toca layout.
2. **P1 · alineación y retícula** — con defectos idénticos a hoy: cero píxeles movidos.
3. **P2 · slot de media con velo MEDIDO** — la pieza grande; arregla además el `.45` fijo del hero.
4. **Piloto F4 + F5** (8 de las 15): **no consumen licencias** y validan lo caro.
5. **P3, P5, P6.**
6. **Piloto F1/F2/F3** con las candidatas de §7, cada una pasando por el medidor de contraste.
7. **Puntuar el piloto** con las 6 métricas y el umbral de 8.
8. **Decidir sobre las 4 categorías nuevas** con §14-bis en la mano.
9. Sólo entonces, el resto del catálogo.

### Comparación antes / después

| ANTES (medido) | DESPUÉS (propuesto) |
|---|---|
| 5 layouts · 1 fuente de 4 · 13 artes · 0 fotos · 0 stickers · el color como único eje | 5 familias compositivas · par tipográfico · media con velo medido · marco y forma · foto del usuario como superficie principal |

---

---

# 19. PUNTUACIÓN DEL PILOTO (2026-09-08)

El §16 dejó las 6 métricas **sin puntuar a propósito**: puntuar un diseño que no
existe es inventarse el número. Ya existen las 15 renderizadas, con su miniatura
capturada y verificadas en producción, así que aquí va la puntuación real.

Escala 1–10 en **Visual Quality · Uniqueness · Event Relevance · Composition ·
Premium Feel · Mobile Potential**. Umbral del research: **promedio ≥ 8** para
recomendar implementación; por debajo, se rediseña o se descarta.

Base de la puntuación: las 15 miniaturas miradas en hoja de contacto, las
páginas completas a 1200 px y a 375 px, y dos mediciones de las que sale la
columna **MP** (ver §19.2).

| plantilla | cat. | fam. | VQ | Uniq | ER | Comp | PF | MP | **prom** | |
|---|---|---|---|---|---|---|---|---|---|---|
| `boda-papel-y-lino` | Boda | F4 | 8 | 7 | 6 | 8 | 8 | 6 | **7.2** | ❌ |
| `boda-marco-nuestro` | Boda | F5 | 5 | 6 | 5 | 7 | 6 | 7 | **6.0** | ❌ |
| `boda-jardin-partido` | Boda | F1 | 9 | 8 | 8 | 9 | 9 | 8 | **8.5** | ✅ |
| `xv-seda` | XV años | F4 | 8 | 7 | 7 | 8 | 8 | 6 | **7.3** | ❌ |
| `xv-corona` | XV años | F3 | 9 | 9 | 8 | 9 | 9 | 8 | **8.7** | ✅ |
| `baby-nube-de-algodon` | Baby shower | F4 | 7 | 4 | 6 | 7 | 6 | 6 | **6.0** | ❌ |
| `baby-punto-y-flor` | Baby shower | F1 | 9 | 8 | 8 | 8 | 8 | 8 | **8.2** | ✅ |
| `revelacion-dos-sobres` | Gender reveal | F4 | 7 | 4 | 6 | 7 | 6 | 6 | **6.0** | ❌ |
| `revelacion-coral` | Gender reveal | F3 | 8 | 9 | 7 | 8 | 8 | 8 | **8.0** | ✅ |
| `cumpleanos-papel-picado` | Cumpleaños | F4 | 7 | 6 | 6 | 7 | 6 | 6 | **6.3** | ❌ |
| `cumpleanos-arco` | Cumpleaños | F1 | 8 | 8 | 9 | 8 | 7 | 8 | **8.0** | ✅ |
| `bautizo-cera-blanca` | Bautizo | F3 | 9 | 8 | 5 | 9 | 9 | 8 | **8.0** | ✅ |
| `comunion-cinta` | Primera comunión | F4 | 6 | 5 | 4 | 6 | 6 | 6 | **5.5** | ❌ |
| `graduacion-diploma` | Graduación | F1 | 8 | 8 | 9 | 8 | 7 | 8 | **8.0** | ✅ |
| `corporativo-reticula` | Corporativo | F4 | 8 | 8 | 7 | 8 | 8 | 7 | **7.7** | ❌ |

## 19.1 El resultado, y contradice lo que yo recomendé

| | aprueban |
|---|---|
| **con fotografía** (F1 · F3) | **7 de 7** |
| **sin fotografía** (F4 · F5) | **0 de 8** |

**7 de 15 pasan el umbral. La línea divisoria es exactamente la fotografía.**

Eso desmiente la apuesta que hice en el §16 de este mismo documento: *«ocho de
las quince no consumen ninguna licencia… si la dirección visual sólo funciona
con fotos compradas, no es dirección visual»*. El piloto dice que, **con las
piezas que Sobrely tiene hoy**, sí funciona sólo con fotografía.

Y conviene decir por qué, sin consolarse: la familia F4 se apoyaba en el modelo
Greenvelope, que es **ilustración firmada por artista** más tipografía y forma de
tarjeta. Lo que se implementó fue *textura SVG tenue + filete + par tipográfico*,
que no es lo mismo. **No falló la hipótesis «premium sin fotografía»: falló mi
sustituto barato de la ilustración.** Las dos peores del piloto —`comunion-cinta`
(5.5) y las dos pastel de 6.0— son justo las que se quedaron sin nada que mirar.

## 19.2 Dos defectos sistémicos, medidos

**1. El marco pierde su lectura de tarjeta en móvil.** Medido sobre `xv-seda`:

| ancho | ancho del marco | margen a cada lado |
|---|---|---|
| 1200 px | 896 | **152** — lee como tarjeta |
| 375 px | 375 | **0** — toca los dos bordes, lee como banda |

`FRAME_CLASSES` pone el borde en el contenedor de la sección, que en móvil es a
sangre. Afecta a las **7** plantillas con marco y es lo que hunde su columna MP a
6. **Es un arreglo pequeño** —margen horizontal en las variantes con marco, sólo
por debajo del breakpoint— y probablemente sube 3 o 4 de ellas al umbral.

**2. Dos plantillas del piloto son casi la misma.** `baby-nube-de-algodon` y
`revelacion-dos-sobres` son degradado pastel + marco, de categorías distintas
pero indistinguibles en la rejilla. Es el **problema nº 4 del research
reproducido dentro del piloto**, y confirma que la regla de diferenciación no
puede ser sólo *«no repetir familia dentro de una categoría»*: hay que mirar el
catálogo entero.

## 19.3 Recomendación

1. **Arreglar el marco en móvil** antes de decidir nada más: es barato y mueve la
   columna MP de siete plantillas. Después, **repuntuar**.
2. **No promover ninguna F4 al catálogo grande** con su forma actual. O se les da
   ilustración de verdad —lo que significa dibujar, no texturizar— o se convierten
   a F1/F3 con fotografía.
3. **F1 y F3 son la dirección que funciona.** Las siete pasan, y tres pasan con
   holgura (`xv-corona` 8.7, `boda-jardin-partido` 8.5, `baby-punto-y-flor` 8.2).
4. **`bautizo-cera-blanca` pasa con truco**: 8.0 exacto, sostenido por un 9 en
   composición y hundido por un **5 en relevancia de evento**. Es un bodegón
   blanco que podría ser boda o memorial. Sirve mientras no haya nada mejor, y
   hay que sustituirla en cuanto lo haya.
5. **F2 sigue sin representante**: ninguna de las siete fotos pasó el umbral de
   velo (§7), así que la familia «telón total» no se ha validado.

## 19.4 Nota por plantilla

- **Papel y Lino** (7.2) — Papelería correcta, pero nada en la pieza dice «boda» salvo el copy. El marco pierde su lectura de tarjeta en móvil.
- **Marco Nuestro** (6.0) — La foto marcador de posición lee como una losa beige a tamaño de miniatura. El catálogo se vende con la miniatura, y ésta no vende.
- **Jardín Partido** (8.5) — La papelería salvia y el serif se sostienen mutuamente. La mejor de las tres de boda.
- **Seda** (7.3) — Bonita y coherente, pero el filete doble a sangre en móvil la abarata.
- **Corona** (8.7) — La más memorable del piloto: el objeto sobre negro corta contra un catálogo 96 % claro.
- **Nube de Algodón** (6.0) — Degradado pastel más marco. Es casi indistinguible de «Dos Sobres»: el problema nº 4 del research reaparecido DENTRO del piloto.
- **Punto y Flor** (8.2) — El bodegón de punto hace el trabajo que la tipografía sola no hacía.
- **Dos Sobres** (6.0) — Mismo diagnóstico que «Nube de Algodón», y el concepto de los dos sobres no llega a verse.
- **Coral** (8.0) — Evita el rosa-azul de manual y por eso destaca. Relevancia algo baja: globos sin señal explícita del evento.
- **Papel Picado** (6.3) — El nombre promete papel picado y la pieza entrega una guirnalda tenue de fondo.
- **Arco** (8.0) — Festiva y legible de inmediato. Lo premium es lo más flojo: globos de colores tiran a genérico.
- **Cera Blanca** (8.0) — Visualmente la más fina del piloto, y a la vez la de relevancia más baja: es un bodegón blanco que podría ser boda, memorial o comunión. Ya venía anotado al elegirla.
- **Cinta** (5.5) — La más floja. Sin foto y sin textura, todo el peso cae en el título; y ningún elemento la ancla a una comunión.
- **Diploma** (8.0) — Lectura inmediata del evento. Premium flojo: el confeti dorado tira a genérico.
- **Retícula** (7.7) — La única alineada a la izquierda, y eso la distingue. Se queda a un pelo por el marco en móvil.

---

## ⛔ FIN DE LA INVESTIGACIÓN

No se ha modificado ninguna plantilla, ni descargado ninguna imagen, ni tocado
`event_type`, ni escrito ninguna migración.

**Esperando la frase exacta: «APROBADO TEMPLATE RESEARCH V2».**

Y aun con ella, lo primero que se implementa es **el piloto**, no el catálogo.
