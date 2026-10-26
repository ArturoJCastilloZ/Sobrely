# 17 · Prompts listos para ChatGPT y Gemini (arte de fondo de las plantillas)

Cinco piezas de piloto. Cada una lleva su prompt completo para pegar tal cual, en dos versiones: ChatGPT (imagen en 1024 × 1536) y Gemini (formato 9:16). Los dos generadores se usan con tu cuenta; yo no los puedo llamar. Antes de usarlos, lee lo que sigue.

## Reglas de uso

- **Lo que me pasas:** el PNG original tal como sale, sin recortar ni comprimir. Yo lo recorto al lienzo de 420 × 900, lo paso a WebP de 840 × 1800, lo dejo en 90 KB o menos, lo conecto a la plantilla y lo mido con los scripts de contraste y de adorno bajo el texto.
- **Por qué dos versiones:** el lienzo de la invitación es 7:15. ChatGPT entrega 2:3 (se pierde el 15 % de cada lado al recortar) y Gemini 9:16 (se pierde el 8 %). Por eso la franja lateral del prompt de Gemini es más ancha.
- **Una imagen no se recolorea**, así que estas piezas se usan en plantillas «sin paleta»: la paleta de la demo y del asistente quita el arte de fondo.
- **No pedir personas ni caras**, ni texto, ni marcas. Si el resultado trae letras, texto garabateado o una cara, se descarta y se vuelve a generar.
- **Anota en `public/arte/PROCEDENCIA.md`** la herramienta, el prompt y la fecha de cada pieza. No pedir «al estilo de» artistas vivos ni de marcas.
- **Si una pieza no sale limpia en 2 o 3 intentos**, dímelo: esa pieza se hace en SVG a código, que además pesa menos.

## Cómo se pega

1. En ChatGPT: abre un chat nuevo, elige el generador de imágenes, pega la «Versión ChatGPT» completa.
2. En Gemini: chat nuevo, pega la «Versión Gemini» completa; si no respeta el formato vertical, añade al final: «Make it a tall vertical 9:16 image».
3. Pide 3 variantes y escoge la que tenga **el centro más vacío y menos contraste**; esa es la buena, no la más vistosa.

---

## Pieza 1 · Boda de jardín (hoy plana, con rama fina)

**Versión ChatGPT**

```
Create a decorative background image for a vertical mobile digital wedding invitation, portrait 2:3 (1024x1536).

STYLE: delicate watercolor eucalyptus and olive branches with a few tiny white flowers, soft hand-painted look, airy and elegant. Palette: #EEF3EA background, #4F6B52 leaves, #8FA68E soft green, #FFFFFF highlights.

COMPOSITION (strict):
- Decoration only along the edges: a band across the top (first 18% of the height), a band across the bottom (last 18%), and slim side strips hugging the left and right edges (the outer 12% of the width, but keep nothing in the outermost 4%).
- The center must be EMPTY: a large calm area covering the middle 60% of the width and the middle 45% of the height, with only the plain background color or a very subtle paper texture. No leaf, flower, line, shadow or gradient banding inside that area. Text will be placed there.
- Low contrast overall: no very dark or very bright spots, so dark text stays readable on top.
- Clean edges. No frame drawn as a rectangle around the center, no border line crossing the middle.

STRICTLY NO: text, letters, numbers, logos, watermarks, people, faces, hands, animals, brand names, QR codes.
Output: a single flat image, no mockup, no phone frame, no shadow around it.
```

**Versión Gemini**

```
Generate a decorative background image for a vertical mobile digital wedding invitation. Aspect ratio 9:16, tall vertical.

Style: delicate watercolor eucalyptus and olive branches with a few tiny white flowers, soft hand-painted look, airy and elegant. Palette: #EEF3EA background, #4F6B52 leaves, #8FA68E soft green, #FFFFFF highlights.

Composition, strictly: decoration only along the edges. A band across the top (first 18% of the height), a band across the bottom (last 18%), and side strips on the left and right (between 5% and 18% of the width from each edge, nothing in the outermost 5%). The center must be empty: the middle 55% of the width and the middle 45% of the height show only the plain background color or a very subtle paper texture, with no leaf, flower, line, shadow or banding. Text will go there. Keep overall contrast low, no very dark or very bright spots. No rectangular frame around the center, no line crossing the middle.

Do not include any text, letters, numbers, logos, watermarks, people, faces, hands, animals or brand names. Output one flat image, no mockup and no phone frame.
```

---

## Pieza 2 · XV años elegante (hoy lazos y líneas)

**Versión ChatGPT**

```
Create a decorative background image for a vertical mobile digital quinceañera (XV años) invitation, portrait 2:3 (1024x1536).

STYLE: soft watercolor blush-pink and lavender peony petals with fine gold foil dust, romantic and premium stationery look. Palette: #FBEFF4 background, #D9A5B8 petals, #B08D57 gold, #FFFFFF highlights.

COMPOSITION (strict):
- Decoration only along the edges: a band across the top (first 18% of the height), a band across the bottom (last 18%), and slim side strips hugging the left and right edges (the outer 12% of the width, but keep nothing in the outermost 4%).
- The center must be EMPTY: a large calm area covering the middle 60% of the width and the middle 45% of the height, with only the plain background color or a very subtle paper texture. No petal, line, glitter, shadow or gradient banding inside that area. Text will be placed there.
- Low contrast overall: no very dark or very bright spots; the gold must be subtle, not shiny, so dark text stays readable on top.
- Clean edges. No frame drawn as a rectangle around the center, no border line crossing the middle.

STRICTLY NO: text, letters, numbers, logos, watermarks, people, faces, hands, animals, brand names, QR codes.
Output: a single flat image, no mockup, no phone frame, no shadow around it.
```

**Versión Gemini**

```
Generate a decorative background image for a vertical mobile digital quinceañera (XV años) invitation. Aspect ratio 9:16, tall vertical.

Style: soft watercolor blush-pink and lavender peony petals with fine gold foil dust, romantic and premium stationery look. Palette: #FBEFF4 background, #D9A5B8 petals, #B08D57 gold, #FFFFFF highlights.

Composition, strictly: decoration only along the edges. A band across the top (first 18% of the height), a band across the bottom (last 18%), and side strips on the left and right (between 5% and 18% of the width from each edge, nothing in the outermost 5%). The center must be empty: the middle 55% of the width and the middle 45% of the height show only the plain background color or a very subtle paper texture, with no petal, line, glitter, shadow or banding. Text will go there. Keep overall contrast low; the gold must be subtle and matte, not shiny. No rectangular frame around the center, no line crossing the middle.

Do not include any text, letters, numbers, logos, watermarks, people, faces, hands, animals or brand names. Output one flat image, no mockup and no phone frame.
```

---

## Pieza 3 · Baby shower neutro (hoy muy plana)

**Versión ChatGPT**

```
Create a decorative background image for a vertical mobile digital baby shower invitation, portrait 2:3 (1024x1536).

STYLE: hand-painted soft clouds and tiny stars in muted cream, sand and sage, gentle and calm, gender-neutral. Palette: #F6F1E8 background, #D9C7A8 sand, #A9B8A0 sage, #FFFFFF highlights.

COMPOSITION (strict):
- Decoration only along the edges: a band across the top (first 18% of the height), a band across the bottom (last 18%), and slim side strips hugging the left and right edges (the outer 12% of the width, but keep nothing in the outermost 4%).
- The center must be EMPTY: a large calm area covering the middle 60% of the width and the middle 45% of the height, with only the plain background color or a very subtle paper texture. No cloud, star, line, shadow or gradient banding inside that area. Text will be placed there.
- Low contrast overall: no very dark or very bright spots, so dark text stays readable on top.
- Clean edges. No frame drawn as a rectangle around the center, no border line crossing the middle.

STRICTLY NO: text, letters, numbers, logos, watermarks, people, faces, hands, animals, brand names, QR codes.
Output: a single flat image, no mockup, no phone frame, no shadow around it.
```

**Versión Gemini**

```
Generate a decorative background image for a vertical mobile digital baby shower invitation. Aspect ratio 9:16, tall vertical.

Style: hand-painted soft clouds and tiny stars in muted cream, sand and sage, gentle and calm, gender-neutral. Palette: #F6F1E8 background, #D9C7A8 sand, #A9B8A0 sage, #FFFFFF highlights.

Composition, strictly: decoration only along the edges. A band across the top (first 18% of the height), a band across the bottom (last 18%), and side strips on the left and right (between 5% and 18% of the width from each edge, nothing in the outermost 5%). The center must be empty: the middle 55% of the width and the middle 45% of the height show only the plain background color or a very subtle paper texture, with no cloud, star, line, shadow or banding. Text will go there. Keep overall contrast low, no very dark or very bright spots. No rectangular frame around the center, no line crossing the middle.

Do not include any text, letters, numbers, logos, watermarks, people, faces, hands, animals or brand names. Output one flat image, no mockup and no phone frame.
```

---

## Pieza 4 · XV años «noche estrellada» (oscura; es la tendencia que más aparece en México)

**Versión ChatGPT**

```
Create a decorative background image for a vertical mobile digital quinceañera (XV años) invitation, portrait 2:3 (1024x1536), dark theme.

STYLE: deep midnight-blue night sky with a few fine silver and soft gold stars, a faint hand-painted nebula glow only near the edges, elegant and magical, premium. Palette: #14203A deep navy background, #243556 lighter navy, #C9CED8 silver, #C9A96A soft gold.

COMPOSITION (strict):
- Decoration only along the edges: a band across the top (first 18% of the height), a band across the bottom (last 18%), and slim side strips hugging the left and right edges (the outer 12% of the width, but keep nothing in the outermost 4%).
- The center must be EMPTY: a large calm area covering the middle 60% of the width and the middle 45% of the height, with only the plain deep navy background (a very subtle gradient is fine). No star, glow, line or shadow inside that area. Light text will be placed there.
- Controlled contrast: stars small and few, no bright spots larger than a few pixels near the center band, so light text stays readable on top.
- Clean edges. No frame drawn as a rectangle around the center, no border line crossing the middle.

STRICTLY NO: text, letters, numbers, logos, watermarks, people, faces, hands, animals, moon with a face, brand names, QR codes.
Output: a single flat image, no mockup, no phone frame, no shadow around it.
```

**Versión Gemini**

```
Generate a decorative background image for a vertical mobile digital quinceañera (XV años) invitation, dark theme. Aspect ratio 9:16, tall vertical.

Style: deep midnight-blue night sky with a few fine silver and soft gold stars, a faint hand-painted nebula glow only near the edges, elegant and magical, premium. Palette: #14203A deep navy background, #243556 lighter navy, #C9CED8 silver, #C9A96A soft gold.

Composition, strictly: decoration only along the edges. A band across the top (first 18% of the height), a band across the bottom (last 18%), and side strips on the left and right (between 5% and 18% of the width from each edge, nothing in the outermost 5%). The center must be empty: the middle 55% of the width and the middle 45% of the height show only the plain deep navy background, a very subtle gradient is fine, with no star, glow, line or shadow. Light text will go there. Keep the stars small and few and avoid bright spots near the center band.

Do not include any text, letters, numbers, logos, watermarks, people, faces, hands, animals, a moon with a face or brand names. No rectangular frame around the center. Output one flat image, no mockup and no phone frame.
```

---

## Pieza 5 · Fiesta con acento mexicano (cumpleaños y celebraciones; «Local Flavor»)

**Versión ChatGPT**

```
Create a decorative background image for a vertical mobile digital party invitation, portrait 2:3 (1024x1536).

STYLE: a modern, tasteful take on Mexican papel picado banners and marigold (cempasúchil) flowers, flat paper-cut look with soft texture, festive but refined, not kitsch. Palette: #FFF8EC cream background, #E4572E vermilion, #F2A900 marigold, #2A9D8F teal, #D81E5B magenta.

COMPOSITION (strict):
- Decoration only along the edges: papel picado banners strung across the top (first 16% of the height), a few marigolds and small paper-cut shapes along the bottom (last 16%), and a few scattered paper-cut details hugging the left and right edges (outer 12% of the width, nothing in the outermost 4%).
- The center must be EMPTY: a large calm area covering the middle 60% of the width and the middle 45% of the height, with only the plain cream background or a very subtle paper texture. No shape, line, shadow or gradient banding inside that area. Text will be placed there.
- Keep the colors somewhat softened (not neon) and the overall contrast low in the middle band so dark text stays readable on top.
- The papel picado must use abstract cut-out patterns only (flowers, diamonds, scallops). No letters, no words, no skulls, no faces.

STRICTLY NO: text, letters, numbers, logos, watermarks, people, faces, hands, animals, brand names, QR codes.
Output: a single flat image, no mockup, no phone frame, no shadow around it.
```

**Versión Gemini**

```
Generate a decorative background image for a vertical mobile digital party invitation. Aspect ratio 9:16, tall vertical.

Style: a modern, tasteful take on Mexican papel picado banners and marigold (cempasúchil) flowers, flat paper-cut look with soft texture, festive but refined, not kitsch. Palette: #FFF8EC cream background, #E4572E vermilion, #F2A900 marigold, #2A9D8F teal, #D81E5B magenta.

Composition, strictly: decoration only along the edges. Papel picado banners strung across the top (first 16% of the height), a few marigolds and small paper-cut shapes along the bottom (last 16%), and a few paper-cut details on the left and right sides (between 5% and 18% of the width from each edge, nothing in the outermost 5%). The center must be empty: the middle 55% of the width and the middle 45% of the height show only the plain cream background or a very subtle paper texture, with no shape, line, shadow or banding. Text will go there. Soften the colors (not neon) and keep contrast low in the middle band.

The papel picado must use abstract cut-out patterns only (flowers, diamonds, scallops). Do not include any text, letters, numbers, words, skulls, logos, watermarks, people, faces, hands, animals or brand names. Output one flat image, no mockup and no phone frame.
```

---

## Qué se espera ver en cada pieza (para escoger entre variantes)

| Pieza | Para qué plantillas | Lo que descarta una variante |
|---|---|---|
| 1 Jardín | `boda-jardin`, `boda-botanica`, `baby-shower-salvia` | Hojas que invaden el centro; verdes muy saturados |
| 2 XV elegante | `xv-clasicos-elegantes`, `xv-seda` | Dorado brillante; pétalos en el centro |
| 3 Baby neutro | `baby-shower-neutro`, `baby-nube-de-algodon` | Nubes pesadas o grises; estrellas grandes |
| 4 Noche estrellada | `xv-noche-estelar` (y una familia nueva) | Estrellas brillantes en el centro; nebulosa que sube al centro |
| 5 Acento mexicano | `cumpleanos-papel-picado` y celebraciones | Colores neón; figuras con letras o calaveras |

Cuando tengas las piezas, pásamelas y las evalúo con `verificar-contraste-en-vivo.mts`, `auditar-adorno-bajo-texto.mts` y el peso del archivo antes de conectarlas a una plantilla.
