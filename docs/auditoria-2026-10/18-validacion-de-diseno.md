# 18 · Validación del diseño de las invitaciones (4 revisiones y cuarta pasada en el navegador)

Hecha el 26 oct 2026. Cuatro revisores en paralelo, cada uno con su lente y sus skills, sobre las 65 plantillas; más la cuarta pasada de inspiración en el navegador. Los prompts de arte están en [17](17-prompts-de-arte.md).

## Qué es medido y qué es juicio

- **Medido por mí** (Playwright a 375 px, 3 plantillas: `boda-jardin`, `xv-noche-estelar`, `cumpleanos-moderno`): la etiqueta de la portada («ACOMPÁÑANOS», «REGÍSTRATE») no tiene ningún elemento interactivo y mide 89 × 20 px; los campos de nombre, correo y número del formulario de confirmación miden **32 px**; los botones Sí, No, Tal vez y Confirmar miden 44 px; los campos no traen `autocomplete` ni `inputMode`. Ya medido antes: contraste (2 plantillas bajo AA) y desbordes (ninguno), en [15](15-revision-plantillas-y-lcp.md).
- **Juicio de diseño de los revisores** (puntajes 1 a 5, «conservar / mejorar / replantear»): salen de mirar las hojas de contacto, no de métricas. Ninguno abrió las 65 a tamaño completo, ninguno vio la parte baja de cada invitación con fotos reales del cliente, y no miden conversión. Hay desacuerdos entre ellos (por ejemplo, `corporativo-conferencia-agenda`: tipografía 4, composición 2).
- Skills usadas: `better-typography`, `better-writing`, `ui-canon`, `better-colors`, `high-end-visual-design`, `design-taste-frontend`, `better-layout`, `refactoring-ui`, `redesign-existing-projects`, `ux-heuristics`, `better-accessibility`, `cognitive-walkthrough`, y `busca-y-traeme` y `frontend-design` en la búsqueda. No hizo falta instalar ninguna skill nueva.

## 1. Cuarta pasada en el navegador (lo que se vio en pantalla)

| Producto | Qué se ve |
|---|---|
| Fiestly XV años (79 diseños) | Galería oscura; tarjetas con fondo fotográfico (bola de espejos, candiles, bokeh), marcos arqueados con foto de una quinceañera, acuarela con lavanda y mariposas; **cada diseño tiene nombre de tema y una frase de ambiente** («Blush XV», «Disco XV», «Palacio XV», «Mariposas XV»); filtros por ánimo; «Ver» y «Usar» en cada tarjeta |
| PartyPass | Portadas con fotografía a sangre y la pareja de ejemplo, serif elegante con script y dorado; variantes de color por plantilla |
| Mi Webdding | Estilos por ánimo (Elegante, Romántico, Natural, Creativo, Bodas destino) con vista de escritorio y de móvil; fotos reales de pareja |
| iBoda | Sitio sobrio crema y arcilla; vende por la gestión de invitados, no por el adorno |
| Joy | Plantillas con nombre propio («Nelson», «Chloe», «Rose Bed») y foto de pareja en cada tarjeta |
| Invitio | Fondos ilustrados con ambiente (château en acuarela, balcón de palacio) |
| Greenvelope y Paperless Post | Home de producto con sobre animado e ilustraciones de autor; la galería directa no abrió |

**Lo que se ve y Sobrely no tiene:** nombre de tema con frase de ambiente, portada con persona de ejemplo (casi todas las nuestras tienen el hueco vacío o una foto de objeto), marco arqueado con foto, fondos oscuros y fotográficos, y más de una estructura de portada.

## 2. Hallazgos que coinciden en 3 o 4 revisores

1. **«Una plantilla con 65 pieles.»** Hay unas 4 estructuras de portada reales (texto centrado con adorno de borde en ~38; título con foto-tarjeta en ~17; centrado sobre foto o textura a sangre en 4; centrado con banda diagonal en ~11). Después del primer pliegue todas son iguales (portada, tarjeta de bienvenida, cuenta atrás, formulario). Cambian el color y el adorno, no la composición.
2. **Pocas plantillas con «wow».** Solo `xv-produccion-completa`, `xv-noche-estelar`, `xv-corona`, `boda-elegante`, `cumpleanos-arco`, `revelacion-coral` y `revelacion-dos-sobres` tienen presencia. Casi todo lo demás es pastel plano con línea fina.
3. **El adorno de borde es clip-art repetido** (patitas, triángulos, rombos, grecas) que parece papel tapiz y choca con el texto en las plantillas ya medidas en [15](15-revision-plantillas-y-lcp.md).
4. **El nombre de los festejados no domina la portada** (en la competencia es de 3 a 4 veces el resto) y el script se usa en párrafos enteros (`boda-carta-romantica`, `xv-manuscrita`, varias de baby shower), ilegible a media luz.
5. **Casi nada de fondos oscuros ni fotográficos**, que es lo que más aparece en la competencia mexicana de XV años.
6. **Copy genérico**: «Nombre del evento» literal en 5 a 10 plantillas corporativas, «Faltan» sin sujeto, «Gracias por venir» repetido; las que mejor funcionan tienen un texto específico (`cumpleanos-dinosaurios`, `cumpleanos-futbol`, `boda-jardin`).

## 3. Lo que solo vio la revisión de UX del invitado (y yo verifiqué)

| Hallazgo | Evidencia | Gravedad |
|---|---|---|
| **El botón de la portada no es un botón.** Es un `<span>` dentro de un `div` (`src/components/modules/previews.tsx`, ~línea 670-715): parece un botón (placa y filetes), nadie lo marca como enlace y no lleva a ningún sitio. Mide 89 × 20 px a 375 px | Código y medición | Rota, en las 65 |
| **Los campos del formulario de confirmación miden 32 px** en teléfono; el alto de 44 px solo entra en pantallas grandes (`@4xl`) | Medición | Fea |
| Los campos no declaran `autocomplete` (nombre, correo) ni `inputMode` numérico en el número de invitados | Medición | Fea |
| El error de nombre queda fuera de pantalla bajo el botón; el mensaje de éxito no tiene `role="status"` | Revisor, leído en el código; **no verificado por mí** | Frágil |
| Solo 3 plantillas muestran la fecha en la portada; el invitado mayor no puede contestar «cuándo y dónde» sin bajar | Revisor, miniaturas | Frágil |
| Texto pequeño y translúcido (`text-xs` con opacidad 60 a 70 %) en horarios y direcciones | Revisor, leído en el código; **no verificado por mí** | Frágil |

Lo que funciona y no hay que tocar: botones Sí, No, Tal vez y Confirmar de 44 px; etiquetas visibles en cada campo; mensaje de éxito claro; cierre por fecha límite; sin desbordes de 320 a 1200 px.

## 4. Plantillas con consenso

**Las mejores** (varios revisores): `xv-produccion-completa`, `xv-noche-estelar`, `xv-corona`, `boda-elegante`, `cumpleanos-arco`, `revelacion-coral`, `boda-jardin-partido`, `xv-seda`, `boda-de-lujo` (con el choque del adorno ya medido).

**A replantear** (al menos dos revisores, o uno más un fallo medido): `corporativo-taller` y `corporativo-junta-resultados` (barras grises, título pegado a las franjas), `corporativo-sencillo` (el adorno cruza el texto), `baby-shower-completo`, `baby-shower-nubes`, `baby-shower` y `baby-shower-sencillo` (casi gemelas), `boda-cinematografica`, `boda-minimalista`, `cumpleanos-con-video`, `cumpleanos-sencillo`, `xv-sencillos`, `xv-manuscrita`, `boda-carta-romantica`.

**Familias demasiado parecidas entre sí** (el color reviewer las agrupó): pastel con banda diagonal (8), hoja salvia lateral (4), foto-tarjeta sobre crema (10), corporativo gris azulado (8), rosa infantil (7) y lila XV (5). **No son 65 diseños: son unas 6 familias con muchas pieles.**

## 5. Plan de arreglos, de mayor a menor retorno por esfuerzo

| # | Qué | Alcance | Esfuerzo | Riesgo | Cómo se verifica |
|---|---|---|---|---|---|
| 1 | **Arreglos del invitado:** etiqueta de portada que lleva al formulario de confirmación (`<a>` real de al menos 44 px) o que deje de parecer botón; campos de 44 px también en teléfono; `autocomplete` e `inputMode`; error con `aria-invalid` y foco; `role="status"` en el éxito | Las 65, un solo componente | Bajo (1 día) | Medio: es la invitación que ven los invitados; hay pruebas existentes | Medición a 375 px (como la de arriba), pruebas del repositorio y recorrido manual de confirmar |
| 2 | **Fecha y lugar en la portada** (una línea bajo el título) | Las 65 | Bajo-medio | Medio: cambia el aspecto de todas | Prueba de 5 segundos con 5 personas de más de 55 años |
| 3 | **Nombre de tema con frase de ambiente** en el catálogo y la portada | Las 65, es dato | Bajo, peso cero | Bajo | Revisión del texto; no cambia el arte |
| 4 | **Arreglar los 5 choques de adorno** y los 2 fallos de contraste de [15](15-revision-plantillas-y-lcp.md) | 6 plantillas | Bajo-medio | Bajo | `auditar-adorno-bajo-texto.mts` y `verificar-contraste-en-vivo.mts` |
| 5 | **Script solo para el nombre**; cuerpo y píldora en serif o sans, 16 px o más | ~16 plantillas | Bajo-medio | Medio: cambia el aspecto | Prueba de ñ, acentos y signos de apertura; contraste |
| 6 | **Marco arqueado con foto de ejemplo** y portada fotográfica a sangre (la propuesta de composición) | ~30 | Medio (2 a 3 días) | Medio: peso de 60 a 110 KB por foto | Lighthouse de la invitación pública; contraste |
| 7 | **Familias nuevas de noche** (XV azul noche, boda verde bosque y champán, corporativo negro con un acento) con los prompts de [17](17-prompts-de-arte.md) | 3 a 6 plantillas nuevas | Medio | Bajo | Los mismos scripts de contraste y adorno |
| 8 | **Reducir las 6 familias** a menos plantillas más cohesivas (la curaduría que se ve en iBoda y Greenvelope) | Catálogo | Decisión tuya | Bajo | — |

Mi recomendación: 1, 3 y 4 ya (pequeños, de bajo riesgo y de alto efecto), después 5 y 7; 2, 6 y 8 son decisiones de producto.

## 6. Qué no se verificó

- Las puntuaciones por plantilla (hay dos tablas por revisor en el historial de los agentes; aquí solo se conservan los consensos).
- Cómo se ve la parte baja de cada invitación (cuenta atrás, formulario) con fotos reales del cliente.
- Lector de pantalla, red lenta y dispositivos reales.
- Comparación contra la conversión: nada de esto mide si una plantilla vende más.

## 7. Imágenes en ChatGPT o Gemini

Sí hacen falta para las familias nuevas de noche y para el acento mexicano, y como piloto de las plantillas planas. Los prompts completos, en dos versiones (ChatGPT y Gemini), están en [17](17-prompts-de-arte.md). **No** hacen falta para los puntos 1 a 6 del plan, que son de código.

## 8. Avance (26 oct 2026): puntos 1 a 3 del plan

Hechos en la rama `plan/90-dias`, sin fusionar.

**Punto 1, arreglos del invitado (hecho).**
- La etiqueta de la portada es ahora un enlace a una ancla de la misma página. Las que invitan a decir que sí («Acompáñanos», «Te espero», «Confirmar», «Regístrate»…) bajan al formulario de confirmación; las que empiezan con «Ver» («Ver detalles», «Ver todo», «Ver el video»…) bajan a la sección que sigue. Probado con las 27 etiquetas distintas que traen hoy las plantillas (`destino-cta.ts`). Las anclas son divs de altura cero, así que no mueven el diseño. En el editor y en la vista previa privada sigue siendo un rótulo.
- El área de toque de la etiqueta mide 44 px de alto sin cambiar el aspecto de la placa (se amplía con un pseudoelemento). Medido a 375 px: dentro de ±12 px de la placa sigue siendo el enlace; a 24 px ya no.
- Los campos del formulario de confirmación pasan de 32 a **44 px** en teléfono (también los selectores y botones de las preguntas del anfitrión); el nombre lleva `autocomplete="name"`, el correo `autocomplete="email"` y teclado de correo, el número `inputMode="numeric"`. Un error de nombre o de asistencia marca el campo (`aria-invalid`), lo enlaza al mensaje y le lleva el foco; el mensaje de éxito lleva `role="status"`.
- Verificado en el navegador a 375 px en 4 plantillas (`boda-jardin`, `xv-noche-estelar`, `cumpleanos-moderno`, `corporativo-sencillo`): enlace presente, ancla existente, el clic baja a la sección, campos de 44 px, sin desborde horizontal.

**Punto 2, fecha y lugar en la portada (hecho).** Una línea bajo el subtítulo, «12 de junio de 2027 · Jardín Las Flores», que sale de la fecha del evento y del nombre del lugar del módulo de ubicación (`info-evento.ts`); no hay campo nuevo que llenar. La fecha se formatea en la zona de México central, así que el día no se corre. También aparece en la vista del editor, para que se vea lo mismo que verá el invitado. Se regeneraron las 65 miniaturas del catálogo (`REVISION_MINIATURAS` pasó a `202610270007`) para que lo que se ve ahí siga siendo lo que se recibe. Regresión: el script de choques de texto, en las 65 plantillas, a 4 anchos y con nombres de 60 caracteres, da los mismos resultados que antes (cero desbordes, recortes y textos pisados), y la hoja de portadas se revisó a ojo.

**Punto 3, nombre de tema con frase de ambiente (no se hizo, y esta es la razón).** El plan lo daba por faltante, pero lo había inferido de miniaturas. Al mirar el código, cada tarjeta del catálogo **ya muestra un nombre y una descripción** (`tpl.name` y `tpl.description` en `template-marketplace.tsx`), y la base ya trae nombres de tema en muchas («Noche estelar», «Seda carmesí», «Laurel clásico», «Nube de algodón»). Lo que sí es cierto es que los nombres son una mezcla de temáticos y genéricos («Boda elegante», «Cumpleaños moderno»), pero renombrar los genéricos les quitaría las palabras que la gente busca («Boda en la playa»). Reescribir 65 frases sin una necesidad medida no vale el riesgo; lo dejo como decisión tuya: si quieres que las descripciones suenen a ambiente en vez de a ficha técnica, se escriben en una pasada aparte y las apruebas antes.

**Qué no se verificó:** red lenta y lector de pantalla; el comportamiento del enlace en un teléfono real (en Chrome de escritorio con el viewport a 375 px sí); y cómo se ve la línea de fecha y lugar con textos largos del anfitrión en las 65 (se probó con nombres largos de festejados, no con un lugar de 160 caracteres).

## 9. Las cinco ilustraciones de ChatGPT/Gemini, montadas y medidas (26 oct 2026)

Se montaron como **cinco plantillas nuevas** (no reemplazos), clonadas de otras con su mismo texto de ejemplo: `boda-acuarela-eucalipto`, `xv-acuarela-peonias`, `baby-nubes-acuarela`, `xv-noche-estrellada` y `cumpleanos-fiesta-mexicana`. La migración `0067` las inserta (idempotente, sin cambiar el esquema); **está aplicada en la base local y NO en producción**. Si no convencen, se desactivan con `is_active = false`. Registradas en `src/lib/theme/arte.ts` con un tipo nuevo (`ia`, `/arte/ia/*.webp`) y en `public/arte/PROCEDENCIA.md`.

**Como imagen:** las cinco cumplen. Centro vacío (desviación < 2 en el 60 % × 45 % central, 0 % de bordes), sin texto, caras ni marcas (revisadas a ojo) y de 18 a 86 KB (techo de 90 KB) después de recortar a 7:15 y pasar a WebP.

**Montadas, en un teléfono de 390 × 844 px** (el arte se ve completo): las cinco se ven **mucho más ricas** que las planas actuales; en escritorio (1200 px) ninguna tiene choques. En el teléfono:

| Pieza | Choque medido | Qué se ve |
|---|---|---|
| Peonías (XV) | Título 26 %, subtítulo 21 %, «Mi sesión de fotos» 17 % de píxeles-borde bajo el texto | El ramo de arriba toca el título |
| Papel picado | Título 24 %, subtítulo 13 %; **contraste 2.31:1** en la etiqueta «Nombre *» del formulario (AA pide 4.5; con un velo de 0.35 pasaría, pero apaga el arte) | El banderín tapa el título; los cempasúchil quedan detrás del formulario |
| Eucalipto (boda) | Título 15 %, «Ceremonia y recepción» 4 a 6 % | Las hojas quedan detrás del título pero se lee |
| Noche de gala | «Mis fotos» 29 a 34 % | La nebulosa y las ramas doradas de abajo quedan detrás de esa sección |
| Nubes y luna (baby) | «Baby shower» 6 %, «Faltan» 4 % | La luna roza el título; es la que mejor sale |

(Referencia: un fondo liso da cerca de 0 %; las plantillas actuales con adorno bajo el texto, ya reportadas en la sección B de `15`, andan entre 5 % y 49 %.)

**Por qué chocan, y no es un defecto de las imágenes:** el fondo se pinta fijo a la pantalla mientras las secciones pasan por encima. La portada, arriba, cae siempre bajo la franja superior del arte, y toda sección que llega al borde inferior cae sobre la franja inferior. La especificación del piloto (centro vacío del 60 % × 45 %) era insuficiente. **La ronda 2 de prompts en [17](17-prompts-de-arte.md)** pide el adorno solo en bordes laterales y esquinas, con el centro vacío de arriba abajo.

**Miniaturas del catálogo:** se ven recortadas (la miniatura es 3:4 y solo muestra la franja central del arte), así que casi no se nota el arte en la galería; en el teléfono sí. Es el mismo recorte que ya documenta `PROCEDENCIA.md`. Para que el catálogo las venda hará falta una miniatura capturada a 390 × 844.

**Decisión tuya:** (a) regenerar las 5 con la ronda 2 y volver a medir; (b) quedarte con `baby-nubes-acuarela` y `boda-acuarela-eucalipto`, que son legibles hoy; (c) descartar. Recomiendo (a) para las cinco.
