# Sobrely — Rediseño y evolución del EDITOR

> **Estado:** FASES 1 ✅, 2 ✅ y 3a ✅ COMPLETADAS (2026-09-17, rama `skarlette/refactor-editor-fase1`).
> **FASE 4 en curso** (imágenes). **FASE 3b — opción A (roving tabindex) CERRADA.** La tipografía por bloque
> (opciones B/C) sigue sin aprobar: ver «FASE 3b» abajo.
> Fases 4–10 esperando «APROBADO FASE N».
> **Fecha del análisis:** 2026-09-17 · **Base medida:** `main @ b7f431b` (producción)
> **Fuente canónica del encargo:** `~/.claude/plans/sobrely-editor-rediseno.md`
>
> Este archivo es la fuente de verdad del rediseño. Se actualiza conforme avanza.

---

## RETOMAR — lee esto primero si abres una sesión nueva

> Escrito el 2026-09-17. **El «estado medido» lleva fecha y hay que REMEDIRLO
> antes de darlo por bueno**: `main` es producción, recibe tráfico real, y el
> repo se mueve. Si al medir no cuadra, gana lo medido y se corrige este bloque.

### Estado medido al 2026-09-17

```
rama de trabajo   skarlette/refactor-editor-fase1   (TODAS las fases van aquí)
remoto            84d5901  == local, verificado con `git ls-remote`
main (origin)     b7f431b  INTACTO — no se ha tocado, y no se toca sin pedirlo
suite             1 049 pruebas en 67 archivos ✅ · tsc ✅ · eslint ✅
migraciones       NINGUNA. Todo cabe en el `config` jsonb con `.default(...)`
```

Commits de la rama, del más viejo al más nuevo:

| Commit | Qué entró |
|---|---|
| `e8b170d` | `parseConfig` deja de crear un objeto por render (precondición de todo) |
| `39e0142` | `memo` en los 12 previews + `DresscodeFigures` |
| `54ae5f6` | Tres contextos + monolito de 1 128 líneas partido en `shell/` |
| `622de6f` | docs: Fase 1 cerrada |
| ⚠️ `e7b88b5` | **«change contact email» — el mensaje MIENTE.** Su contenido es `src/lib/editor/seleccion.ts`. No lo hice yo; ya estaba en el remoto. Rewordearlo exige force-push |
| `1b631c3` | Anclas de bloque en los 12 módulos, sin tocar la página pública |
| `cec1976` | Selección en el lienzo: clic, recuadro, `Esc`, sincronía con el riel |
| `84d5901` | docs: Fase 2 cerrada |

### Orden de lectura

1. **Este archivo entero.** Es la fuente de verdad del rediseño.
2. `~/.claude/plans/sobrely-editor-rediseno.md` — el brief original del dev, tal cual.
3. `~/.claude/plans/sobrely-retomar.md` §«Reglas duras» y `sobrely-roadmap.md` §7
   (lecciones) y §26 (estado de producción).
4. Los mensajes de commit de la rama: **340 líneas** que explican el *porqué* de
   cada decisión. Están escritos para esto, no por ceremonia.

### Reglas duras de este trabajo

- **`main` es producción.** Vercel despliega de ahí y hay clientes reales. Todo
  va en la rama; a `main` solo cuando el dev lo pida.
- **NO usar el brain.** Nada de Sobrely vive ahí. Es regla del dev.
- **Verificar por EFECTO OBSERVADO**, no porque compile ni porque la suite esté
  verde. Las fases 1 y 2 se cerraron midiendo en el Chrome del dev.
- **Una prueba no vale hasta verla MORIR.** Mutar cada aserción por separado.
- **Supabase es SOLO PRODUCCIÓN.** Las migraciones las corre el dev a mano.

### Lo que está HECHO

- **Fase 1** — Tres contextos (`DocumentoContext`, `SeleccionContext`,
  `LienzoContext`), monolito partido en `components/editor/shell/`, `memo` en los
  12 previews. Medido: cambiar la selección repinta **0 módulos**.
- **Fase 2** — `data-bloque` en los 12 módulos (solo en el editor, por
  `ModoEditorProvider`, clonando el hijo y sin añadir nodos). Contrato
  `bloquesDe()` en `lib/editor/bloques.ts`. Capa de selección con recuadro,
  etiqueta, hover y `Esc`. Medido: desalineación **0 px** al 100/150/50 %.

### Lo que FALTA, y en qué orden

**Fase 3:** 3a (edición directa) y 3b-A (recorrido por teclado) CERRADAS. Queda
la **toolbar tipográfica** —opciones B/C de la 3b—, que sigue sin aprobar porque
exige campo nuevo y des-hardcodear el render de 18 invitaciones vivas.

Después: 4 (imágenes y elementos) → 7 (panel contextual) → 5 (capas) →
6 (drag & drop) → 8 (chrome y móvil) → 9 (plantillas, la única que puede
destruir datos de un cliente) → 10 (QA y migración).

### Trampas conocidas — descubiertas midiendo, no suponiendo

1. **`parseConfig` devuelve un objeto NUEVO cada llamada** (zod). Llamarlo suelto
   en un render hace que `memo` falle el 100 % de las veces. Ya está memoizado en
   `ModulePreview`; no lo deshagas.

   ⚠️ **Corregido el 2026-09-17:** este bloque decía además que `parseConfig`
   «descarta la config ENTERA del módulo si algo no valida». Medido en
   `types.ts:999`: **no lo hace.** Cuando el parse directo falla entra un camino
   lento que prueba campo a campo sobre los defaults y conserva todo lo válido.
   La recomendación práctica —`.default(...)` siempre, y `.catch()` + recorte en
   vez de `min/max`— sigue en pie; la razón que se daba, no.
2. **Los bytes del transcript NO estiman el contexto.** Una sesión de 5,28 MB
   tenía 505.944 tokens; otras de 28 MB no pueden tener 2,7M. Esas ya se
   compactaron. Para el porcentaje real: `get_usage`.
3. **El `data-bloque` de las 11 secciones solo existía con `freeMove` ON.** Por
   eso la Fase 2 lo emite también apagado, pero SOLO en el editor. La página
   pública tiene que renderizar byte a byte lo mismo — hay prueba que lo fija.
4. **La secuencia de bloques es un PREFIJO de la tabla, no una longitud fija.**
   Los huecos de contenido conservan su slot; los hijos condicionales de COLA
   desaparecen (`gifts` da 3 bloques con enlaces y 2 sin ellos).
5. **Un bloque NO es «un texto».** El `[0]` de `rsvp` es compuesto (título +
   descripción) y uno de `dresscode` son dos figuras SVG. Su `campo` es `null` a
   propósito: escribir en el campo equivocado corrompe la invitación de un cliente.
6. **`git checkout <archivo>` falla ENTERO si le pasas un archivo sin rastrear**,
   y no revierte nada. Una vez salvó el trabajo por accidente; no cuentes con ello.
7. **Tres pruebas anclan por texto del código fuente** (`barra-movil`,
   `slot-de-media`, `portada-marco-stickers`). Si renombras algo, reapúntalas —
   no las relajes. Y ojo: con el ancla rota, un `not.toContain` da **verde falso**.
8. **`container-type: inline-size` hace que `cqw` mida la caja de CONTENIDO**, y
   el límite del arrastre es el CENTRO del bloque, no el bloque entero.

9. **En este lienzo, una sonda ciega da un resultado FALSO y CREÍBLE.** Pasó
   tres veces al cerrar la 3b-A, con tres mecanismos distintos, y las tres veces
   el resultado falso parecía un hallazgo legítimo:

   - **Sin hidratar.** Tres lecturas seguidas dijeron «0 bloques con
     `tabindex`» —incluso tras recargar— con el código SÍ presente en el bundle
     servido. Bastó UNA interacción real (un `hover`) para que aparecieran los
     20: se estaba midiendo el DOM del SSR, no el de React vivo.
   - **Demasiado tarde.** Comprobar el resultado de una edición 900 ms después
     de confirmarla no distingue «se guardó» de «se perdió y el módulo se
     remontó»: el arreglo del deshacer de la 3a remonta por generación en la
     `key`, así que en ambos casos se lee un nodo NUEVO con el valor de
     `config`. Para juzgar el instante hay que sondear **sin esperar**.
   - **Rect colapsado por la animación.** El mismo bloque de la portada medía
     `257x36` en una lectura y `0x0` en la siguiente, porque `TextReveal` lo
     estaba animando. Dos clics fueron al vacío y se leyeron como «la edición se
     pierde» — un defecto inventado que llegó a tener un arreglo escrito.

   **Protocolo:** leer el rect del elemento **inmediatamente antes** de actuar
   sobre él, nunca de una medición anterior; sondear en cada paso y no sólo al
   final; y ante un «no funciona», exigir un control que demuestre que la sonda
   ve algo —si el clic no seleccionó nada, no se ha probado nada—. Para editar,
   preferir un bloque de sección estable antes que uno de la portada animada.

---

## 0. Tesis del rediseño (léela primero)

El brief asume que Sobrely es «un editor de formularios que hay que convertir en
un editor de lienzo». **Medido contra el código, eso no es exacto, y la
diferencia cambia el plan entero.**

Lo que hay realmente:

| Lo que el brief asume que falta | Lo que está medido en el código |
|---|---|
| Undo/Redo hay que construirlo (§20) | `editor-history.ts` — pasado/presente/futuro, fusión por tecla, `dirty` derivado, 20 pruebas. **Hecho.** |
| Autosave hay que diseñarlo (§21) | `use-autosave.ts` — debounce 1.2 s, tope 10 s, serialización, `beforeunload`, bloqueo optimista por `version`. **Hecho.** |
| Drag & Drop hay que construirlo (§16) | `movimiento-libre-layer.tsx` + `sticker-editor-layer.tsx` — arrastre real, fusionado en un paso de ⌘Z. **Hecho.** |
| Reordenar secciones (§12) | `@dnd-kit` con sensor de teclado. **Hecho.** |
| Zoom / Mobile-Desktop (§8, §17) | `preview-pane.tsx` — zoom por `transform` (elegido MIDIENDO contra `zoom`), ajustar al ancho, paginador por `IntersectionObserver`. **Hecho.** |
| Móvil del editor (§18) | Rehecho el 2026-09-11: un solo árbol movido por CSS, hojas inferiores, guard `barra-movil.test.ts`. **Hecho.** |
| Propiedades visuales (§14) | El esquema YA tiene `align`, `bleed`, `frame`, `media{position,ratio,focal,overlay,shape}`, `variant`, `imageRatio`, `overlay`, `typography`, `stickers`. |

**Lo que falta de verdad es UNA cosa, y de ella cuelga todo el brief:**

> El lienzo no tiene **selección**. `preview-pane.tsx` pinta los módulos en modo
> lectura. `selectedId` vive en `invitation-editor.tsx` y solo lo mueve la lista
> del riel izquierdo. Las dos únicas capas que reciben puntero sobre el lienzo
> son los stickers y el arrastre de textos.

Sin selección en el lienzo no puede haber toolbar contextual, ni edición directa
de texto, ni capas navegables, ni propiedades contextuales. **Con** selección,
las ocho cosas salen casi gratis, porque el resto de la maquinaria ya existe.

Y hay un segundo hallazgo que lo hace barato:

> **El DOM ya está anotado.** `data-modulo="<id>"` marca cada sección y
> `data-bloque` marca cada bloque de texto — por NOMBRE en la portada
> (`title`/`subtitle`/`cta`) y por ÍNDICE en las otras once. Se puso para el
> arrastre libre. Es exactamente el ancla que necesita un sistema de selección.

Por eso este plan **no reconstruye el editor**. Añade una capa de selección
sobre el lienzo que ya existe, y reorganiza el chrome alrededor de ella.

---

## 1. Auditoría del proyecto

### 1.1 Stack medido

`package.json`: Next.js 16.3 · React 19.2 · Tailwind v4 · zod 4 · `@base-ui/react`
+ shadcn · `@dnd-kit` (core/sortable/modifiers) · framer-motion 13 · Supabase
(`ssr` + `supabase-js`) · mercadopago · vitest 4 · pnpm 11.

**No hay ninguna librería de edición visual** (fabric, konva, tldraw, craft.js).
Todo el lienzo es DOM + CSS. Es la decisión correcta y hay que conservarla: un
canvas de mapa de bits no podría producir la página pública responsive que es el
producto.

### 1.2 Arquitectura del editor (ruta real del dato)

```
src/app/editor/[invitationId]/page.tsx      (server · carga invitación+módulos+tema)
  └── components/editor/invitation-editor.tsx        1 128 líneas · "use client"
        ├── useReducer(editorHistoryReducer)         ← historial
        │     └── editorDocumentReducer              ← { invitation, modules, theme }
        ├── useAutosave({ revision: presente })      ← debounce → saveEditor()
        ├── riel izq: SortableModuleItem[]           ← dnd-kit, toggle, borrar
        ├── centro:  PreviewPane                     ← LIENZO (solo lectura)
        │     ├── ThemeScope                          ← variables CSS del tema
        │     ├── ModulePreview (registry)            ← 12 previews
        │     ├── StickerEditorLayer                  ← arrastre de stickers
        │     └── useMovimientoLibre                  ← arrastre de textos
        └── panel der: ModuleConfigEditor | ThemePanel | GuestManager | SettingsPanel
```

Persistencia: `saveEditor()` en `lib/invitations/actions.ts` — bloqueo optimista
por `version`, diff de módulos (insert nuevos `tmp-*`, delete quitados, update el
resto), remapeo de ids sin pisar ediciones en vuelo.

### 1.3 Modelo de datos

```
invitations         id, user_id, template_id, title, slug, event_type,
                    is_published, status, version, theme_config (jsonb), rsvp_mode
invitation_modules  id, invitation_id, module_type, sort_order, is_visible,
                    config (jsonb)
templates           id, name, event_type, theme_config, modules_config, is_active
```

**Todo lo visual vive en `config` jsonb y en `theme_config` jsonb.** Esto es la
llave del rediseño: *cualquier* propiedad nueva se añade con un campo de zod con
`default`, y **cero migraciones**.

### 1.4 Primitivas visuales que YA existen y el editor NO expone

Medido en `src/lib/modules/types.ts`:

| Primitiva | Esquema | Renderer | Editor |
|---|---|---|---|
| `align` (start/center/end) | ✅ | ✅ `Section` | ⚠️ solo en un `<Select>` enterrado |
| `bleed` (contained/full) | ✅ | ✅ | ⚠️ ídem |
| `frame` (none/line/double/inset) | ✅ | ✅ | ⚠️ ídem |
| `media.position` (none/top/bottom/left/right) | ✅ | ✅ `ConMedia` | ❌ **no expuesto** |
| `media.ratio` / `focal` / `shape` / `overlay` | ✅ | ✅ | ❌ **no expuesto** |
| `hero.variant` (5 composiciones) | ✅ | ✅ | ⚠️ `<Select>` con valores en inglés crudo |
| `hero.imageRatio` | ✅ | ✅ | ❌ **no expuesto** (lo fija `parcheDeComposicionDePortada`) |
| `freeMove` + `textOffsets` | ✅ | ✅ | ⚠️ interruptor suelto, sin affordance en el lienzo |
| `theme.stickers[]` (x,y,scale,rotation,rounded) | ✅ | ✅ | ⚠️ solo arrastre, sin panel |
| `theme.typography{heading,body}` | ✅ | ✅ | ⚠️ en `theme-panel` |

**Lectura:** el producto tiene un motor de diseño razonable y una interfaz que
solo deja tocar el 30 % de él. Antes de inventar «elementos» nuevos, hay que
**exponer lo que ya se paga**. Es el mayor retorno por unidad de riesgo del plan
entero.

### 1.5 Deuda técnica encontrada

| Deuda | Medida | Impacto en el nuevo editor |
|---|---|---|
| `invitation-editor.tsx` = 1 128 líneas | Un `"use client"` con el documento, el chrome, los 4 paneles, el diálogo de salida, el de plan, la barra móvil y los atajos | **Alto.** Cualquier cambio de selección re-renderiza el lienzo entero. Hay que partirlo. |
| `config-editors.tsx` = 1 067 líneas | 12 editores + `Field` + `RsvpQuestionsEditor` + `OptionsInput` en un archivo | Medio. Se parte por módulo al hacer el panel contextual. |
| Estado del lienzo dentro de `PreviewPane` | `view`, `zoom`, `actual` son `useState` locales | **Alto.** La topbar y la barra inferior nuevas los necesitan. Hay que subirlos. |
| `replayKey` remonta TODO el lienzo | `JSON.stringify(theme.animation)` + un stringify por módulo visible, concatenado | Medio. Correcto hoy, pero con selección viva remontar tira la selección. |
| `hayCambiosSinGuardar` = `JSON.stringify` completo | En cada render | Bajo hoy (pocos KB), pero crece con `textOffsets` por bloque. Vigilar. |
| `textOffsets` por ÍNDICE en las 11 secciones | Anclado a la posición del hijo, no a su identidad | **Alto para capas.** Un árbol de capas por índice es frágil. Ya hay prueba que fija el conteo; hay que extenderla. |
| Sin `React.memo` en ningún módulo | Medido: 0 ocurrencias en `components/modules/` | **Alto.** Es la causa raíz del §25 del brief. |
| No existe «cambiar plantilla» | `createFromTemplate` solo CREA | §13 es funcionalidad nueva, no una mejora. Es lo más arriesgado del plan. |

### 1.6 Seguridad (estado medido, y qué toca el rediseño)

- **RLS:** desde la `0053` la llave publicable **no ve** `invitations` ni
  `invitation_modules`. La lectura pública pasa por `public.invitacion_esta_publicada`.
  *El rediseño no cambia nada de esto* — sigue siendo el mismo `saveEditor`.
- **Storage:** bucket `invitation-images`, ruta `${userId}/${invitationId}/${uuid}.${ext}`,
  tope 10 MB antes de comprimir, cuota por plan verificada **en servidor**
  (`checkUploadQuota`). Cualquier «subir imagen» nuevo del rediseño **debe pasar
  por `ImageUploader`**, nunca por un `supabase.storage.upload` propio, o se salta
  la cuota.
- **Riesgo nuevo que introduce el rediseño:** la edición directa de texto en el
  lienzo usará `contentEditable`. Hay que forzar **texto plano** (`paste` en
  plano, `contentEditable="plaintext-only"` + saneado en el `onChange`), porque
  el texto se guarda en `config` jsonb y se re-renderiza en la página pública.
  Pegar HTML ahí sería una vía de inyección en contenido de terceros.
- **Riesgo de cuota:** los topes de zod (`max(120)` en títulos, `max(6)` en
  `textOffsets`) son la barrera contra un documento que crezca sin límite. El
  esquema de **escritura** debe seguir siendo el estricto; el de **lectura**,
  tolerante. (Ver §1.7.)

### 1.7 La trampa que gobierna todo el versionado

`parseConfig` **descarta en silencio** la config entera de un módulo que no
valide. Consecuencia dura, y ya pagada una vez en este repo:

> Endurecer un esquema de **lectura** borra datos ya guardados de clientes reales.

Regla del rediseño, sin excepción:
- Campos nuevos: **siempre** con `.default(...)`, y el default es la conducta de hoy.
- Rangos: `.catch().transform(clamp)` — **recortar, nunca rechazar** (el patrón de
  `fraccionDeDesplazamiento`).
- Lo estricto va en `moduleConfigWriteSchemas`, no en el de lectura.

---

## 2. Auditoría del editor actual (tabla del §6 del brief)

Contra la IMAGEN 1 (editor real) y el código.

| Elemento actual | Estado | Problema | Propuesta |
|---|---|---|---|
| **Top bar** (←, título, «Guardado», ↶ ↷, Ver, Despublicar) | **Modificar** | El título no es editable in situ; «Ver» y «Despublicar» compiten visualmente; no hay Compartir ni Ajustes; el estado de guardado es texto gris sin jerarquía | Título editable inline (patrón Invitio). Agrupar: ← · título+estado · [↶↷] · [Vista previa] · [Compartir] · **[Publicar]** como único botón primario. Ajustes pasa a un menú «⋯». |
| **Riel de secciones** | **Evolucionar** | Es el ÚNICO camino a todo. Mezcla navegar, activar, borrar y reordenar en una fila de 44 px. El `+` de inserción entre secciones existe pero es invisible hasta el hover | Se conserva como **una pestaña** de un riel de herramientas (Secciones). Se le añade miniatura visual de la sección. El `+` del gutter se mantiene: es un buen patrón, solo necesita ser descubrible. |
| **Activar/desactivar (toggle)** | **Mantener** | Ninguno. Funciona y es claro | Igual, pero también accesible desde el árbol de capas (icono ojo). |
| **Orden por arrastre** | **Mantener** | Cumple: `@dnd-kit` con `KeyboardSensor` ya da alternativa de teclado (WCAG 2.2 «Dragging Movements») | Igual. Añadir «Subir/Bajar» en el menú contextual por descubribilidad. |
| **Lienzo (`PreviewPane`)** | **Evolucionar — es el corazón del cambio** | **Es de solo lectura.** No se puede hacer clic en nada. El usuario ve su invitación y no puede tocarla | Capa de selección sobre `data-modulo`/`data-bloque`. Hover, bounding box, toolbar contextual, edición directa de texto. **Fase 2 y 3.** |
| **Pills Móvil/Escritorio** | **Mover** | Flotan sueltas ENCIMA del lienzo, roban altura y no pertenecen ahí | Bajan a la barra de estado inferior, junto al zoom. Es donde las pone Canva y donde la gente las busca. |
| **Zoom (barra inferior)** | **Mantener** | Está bien resuelto: `transform` elegido midiendo, ajustar-al-ancho contra la columna real | Igual. Solo sube el estado a un contexto para que lo lea la barra nueva. Añadir ⌘+/⌘−/⌘0. |
| **Paginador «Portada · 1 de 6»** | **Combinar** | Hoy comparte píldora con el zoom; dos funciones distintas en un solo control | Se separa: zoom a la derecha de la barra de estado, navegación de sección a la izquierda. |
| **Panel derecho** | **Rehacer (contextual)** | **Es el problema UX número 1 después del lienzo.** Un formulario vertical largo que mezcla contenido (Título, Subtítulo), diseño (Diseño de la portada), interacción (Movimiento libre) y animación (4 controles). En la captura hay que hacer scroll para ver Velocidad | Panel **contextual por selección**, en tres grupos fijos: **Contenido · Diseño · Animación**. Sin selección → propiedades del documento. Lo que no aplica, no se pinta. |
| **Animaciones (4 controles en el panel)** | **Mantener y mover** | La funcionalidad es buena (incluye «Reproducir en el lienzo», que es justo lo que pide §19). El problema es que ocupa media pantalla siempre | Colapsar en el grupo «Animación» del panel contextual + botón ⚡ en la toolbar del lienzo. |
| **Movimiento libre del texto** | **Evolucionar** | Es un interruptor con una frase de ayuda. El usuario no tiene forma de saber qué hace hasta activarlo y adivinar que puede arrastrar | Deja de ser un interruptor explícito: **seleccionar un texto y arrastrarlo lo activa**. El interruptor pasa a «Restablecer posición». |
| **Stickers** | **Evolucionar** | Existen, se arrastran, y **no hay ningún panel que permita añadirlos** desde el editor | Pasan a ser el tipo «Decoración» del panel Elementos. Ya tienen x/y/scale/rotation normalizados: son el único elemento de posición libre de verdad, y ya es responsive. |
| **Tema (`theme-panel`, 618 ln)** | **Mantener, reubicar** | Bien construido. Pero es un panel hermano de «la sección seleccionada», y no lo es: es de nivel documento | Pasa a la pestaña **Estilo** del riel. Aparece en el panel derecho solo cuando no hay selección. |
| **Invitados / Ajustes** | **Mover fuera del riel de diseño** | Gestionar invitados no es diseñar. Ocupa un nivel del navegador principal | Al menú «⋯» de la top bar, o a una pestaña claramente separada por un divisor. |
| **Plantillas** | **Crear** | **No existen dentro del editor.** Solo se elige plantilla al crear la invitación | Pestaña **Plantillas** del riel, con «probar sin aplicar». **Fase 9, la más arriesgada.** |
| **Capas** | **Crear** | No existe | Árbol DERIVADO del documento. **Fase 5.** |
| **Barra móvil (< 1024)** | **Mantener** | Rehecha el 11-09 y bien: un solo árbol por CSS, lienzo siempre visible, hojas inferiores | Se le añade la toolbar contextual como hoja. **No rehacer.** |
| **Undo/Redo** | **Mantener** | Completo | Solo hay que asegurar que las acciones nuevas entren con la `claveDeFusion` correcta. |
| **Autoguardado** | **Mantener, revestir** | El motor es correcto. Solo se anuncia con texto gris «Guardado» | Estados explícitos: `Guardando… / Guardado hace 2 min / No se pudo guardar · Reintentar`. |

---

## 3. Lo que aportan las referencias (y lo que NO se copia)

### Imagen 2 — Invitio: qué se toma

| Patrón | Se toma | Por qué |
|---|---|---|
| Riel de iconos + panel desplegable | **Sí** | Mete 6 destinos en 64 px y deja el lienzo ancho. Es la estructura que falta. |
| Toolbar contextual FLOTANTE sobre el lienzo | **Sí, adaptada** | Es la pieza que convierte «configurar» en «diseñar». |
| Título y fecha editables inline en la top bar | **Sí** | Elimina el viaje a «Ajustes» para cambiar el nombre. |
| Buscador dentro del panel de elementos | **Sí (Fase 4)** | Escala sin saturar. |
| Handles de redimensión + rotación en TEXTO | **No** | Redimensionar texto por handle produce tamaños arbitrarios que rompen el responsive y la escala tipográfica del tema. El tamaño se cambia por **escalón** (S/M/L/XL) en la toolbar. |
| Lienzo de proporción fija | **No, jamás** | Invitio fija secciones de 900 px y renuncia al responsive. Es precisamente donde Sobrely gana. Ya está escrito en `sobrely-canvas-poc.md` y en el comentario del zoom. |
| Marcas de premium (👑) sembradas en el panel | **No** | Frustra antes de crear valor. El gate de plan de Sobrely ya vive donde debe. |

### Imagen 3 — Canva: qué se toma

| Patrón | Se toma | Por qué |
|---|---|---|
| Barra de estado inferior (zoom · página · vista) | **Sí** | Saca los controles de encima del lienzo. |
| Toolbar flotante ANCLADA al objeto seleccionado | **Sí** | Mejor que la de Invitio (fija arriba): menos distancia entre intención y control. |
| Indicador de guardado discreto junto al título | **Sí** | Confianza sin ruido. |
| Icono rail con etiquetas de texto | **Sí** | Iconos solos no se entienden; WCAG y sentido común. |
| Capas como lista plana de objetos | **No** | Sobrely tiene jerarquía real (sección → bloque). El árbol refleja el documento, no una pila z. |
| Añadir página / lienzo infinito / posicionamiento absoluto libre | **No** | Es un editor de piezas fijas. Sobrely produce una página responsive. |
| ~10 destinos en el riel | **No** | Se queda en **6**. Menos opciones simultáneas, que es lo que pide el §4. |

---

## 4. Arquitectura propuesta

### 4.A El concepto central: la **dirección de bloque**

No se introduce un árbol de elementos libres. Se **formaliza lo que el DOM ya tiene**:

```ts
// src/lib/editor/seleccion.ts   (NUEVO)

export type Seleccion =
  | null                                          // documento
  | { tipo: "modulo";   moduloId: string }        // la sección entera
  | { tipo: "bloque";   moduloId: string; bloque: string }  // "title" | "0" | "1" …
  | { tipo: "media";    moduloId: string }        // el slot de imagen de la sección
  | { tipo: "sticker";  stickerId: string };      // decoración libre
```

`bloque` es exactamente el valor de `data-bloque` que el renderer YA emite.

Por qué así, y no un árbol de elementos:

1. **Cero migraciones.** La dirección se DERIVA del `module_type` + el contrato
   del renderer. No se guarda nada nuevo para poder seleccionar.
2. **Cero riesgo para las 18 invitaciones vivas.** Una invitación sin tocar
   renderiza exactamente igual: la selección es estado de UI, no de documento.
3. **El responsive se mantiene por construcción.** Los bloques siguen en el flujo;
   `Section` sigue decidiendo la disposición. No hay `position: absolute`.
4. **Un solo modelo para los 12 módulos.** No hay que escribir un editor por tipo.

El precio, y hay que decirlo: **los bloques por índice son frágiles**. Si un
renderer cambia el orden de sus hijos, los `textOffsets` guardados se mueven de
sitio. Ya existe `movimiento-libre-render.test.ts` fijando el conteo; **hay que
extenderla a fijar la SECUENCIA de `data-bloque` de los 12 módulos**. Es un
criterio de aceptación de la Fase 2, no un «luego».

### 4.B Contrato de bloques (lo que hay que escribir)

```ts
// src/lib/editor/bloques.ts   (NUEVO)
// Deriva, por tipo de módulo, qué bloques existen y qué se puede hacer con cada uno.

export type CapacidadBloque = {
  id: string;             // coincide con data-bloque
  etiqueta: string;       // "Título", "Mensaje" — para capas y a11y
  campo: string;          // la clave de `config` que lo alimenta: "title", "message"
  editable: boolean;      // ¿edición directa de texto?
  tipografia: boolean;    // ¿escalón de tamaño / peso?
  mueve: boolean;         // ¿arrastrable (textOffsets)?
};

export function bloquesDe(tipo: ModuleType): CapacidadBloque[];
```

Una tabla, no doce componentes. Y una prueba que la cruza contra el HTML
renderizado de cada módulo: si divergen, la suite se pone roja.

### 4.C Estado del editor

Hoy: un `useReducer` gigante dentro de un componente de 1 128 líneas. Se parte en
**tres contextos** para que mover el cursor no re-renderice la invitación:

| Contexto | Contenido | Cambia |
|---|---|---|
| `DocumentoContext` | `historia.presente` + `aplicar()` | Solo en ediciones reales |
| `SeleccionContext` | `Seleccion` + `setSeleccion` | En cada clic del lienzo |
| `LienzoContext` | `zoom`, `vista`, `seccionActual` | Al navegar/zoom |

`PreviewPane` consume `DocumentoContext`; la capa de selección consume
`SeleccionContext`. **Seleccionar deja de tocar el documento**, que es la
condición para que el §25 (performance) se cumpla.

El historial **no cambia**: `editor-history.ts` se queda tal cual. La selección
sigue deliberadamente FUERA del documento — la decisión ya está tomada y
documentada en `editor-document.ts`, y es correcta.

### 4.D Sistema de capas (derivado, no almacenado)

```
CAPAS
▼ 🖼  Portada                       👁 🔒
   ├─ Fondo (imagen)
   ├─ Título        "Mis XV años"
   ├─ Subtítulo     "Una noche entre estrellas"
   └─ Etiqueta      "Ver más"
▸ ✉️  Bienvenida                    👁 🔒
▸ ⏱  Cuenta regresiva               👁 🔒
   DECORACIÓN (libre)
   ├─ ❀ sticker-a1
   └─ ★ sticker-b2
```

El árbol es `modules.map(m => ({ m, bloques: bloquesDe(m.module_type) }))`. Pura
función. Seleccionar y navegar: **gratis, Fase 5**.

Ocultar/bloquear **por bloque** sí necesita persistencia. Cabe en el jsonb sin
migración:

```ts
// dentro de layoutShape — default {} ⇒ una config vieja renderiza idéntica
blocks: z.record(z.string(), z.object({
  hidden: z.boolean().default(false),
  locked: z.boolean().default(false),
})).default({}),
```

`locked` es **solo del editor** (impide seleccionar/arrastrar) y no debe llegar al
render público. `hidden` sí afecta al render: es una decisión de contenido.

### 4.E Drag & Drop: el sistema híbrido de tres niveles (respuesta al §16)

Esta es la pregunta técnica más importante del brief y la respuesta ya está medida
en este repo.

| Nivel | Qué mueve | Cómo se guarda | Responsive |
|---|---|---|---|
| **1 · Flujo** | Orden de secciones, posición del slot de media (top/bottom/left/right), alineación | `sort_order`, `media.position`, `align` | **Intacto.** Es CSS de layout. |
| **2 · Empuje** | Cada texto respecto de su posición NATURAL | `textOffsets[] = {dx,dy}` en **fracciones**, unidad `cqw` | **Intacto.** Fracciones del ancho del contenedor: escalan solas. La altura NO colapsa porque los bloques no salen del flujo. |
| **3 · Libre** | Solo decoración (stickers) | `{x,y,scale,rotation}` normalizados 0..1 | **Intacto.** Ya normalizado. Decorativo: si se desplaza un poco, no rompe nada. |

**Regla dura: nunca se guarda un píxel.** No existe nivel 4. Un `position:absolute`
con `left: 214px` es exactamente lo que convierte a Invitio en no-responsive, y es
lo que este producto no puede permitirse.

Trampas ya pagadas, que hay que respetar (§7 del roadmap):
- `container-type: inline-size` hace que `cqw` mida la caja de **contenido**, no la de borde.
- El límite del arrastre es el **CENTRO** del bloque, no el bloque entero. Con el
  bloque entero, un `<h2>` que llena el ancho tiene recorrido **cero** — medido:
  325 px de 418, se arrastraban 90 y se movía 41.
- `top: %` con `position: relative` da **0** si la caja tiene `min-height`. El eje
  vertical va en unidades de ANCHO, con el factor `extension`.

**WCAG 2.2 «Dragging Movements» (AA):** todo lo arrastrable necesita alternativa de
un solo puntero. Con la selección ya hecha, es trivial: **flechas del teclado
mueven el bloque seleccionado** (1 % por pulsación, 5 % con ⇧), y el panel de
propiedades trae los números. Criterio de aceptación de la Fase 6.

### 4.F Responsive (§17)

Se mantiene lo que ya hay y se resiste la tentación de duplicar:

- **Un solo árbol.** `view: "mobile" | "desktop"` solo cambia el ANCHO del marco;
  el responsive lo resuelven los container queries (`@2xl/inv`, `@4xl/inv`…).
- **No se guardan overrides por breakpoint.** Duplicaría el modelo de datos, el
  panel de propiedades y el árbol de capas, y dejaría al usuario preguntándose
  cuál gana. La contención vive en el sistema, no en el editor.
- Si un día hace falta, el punto de extensión es `media.position` + `align` con un
  sufijo `@sm`. **No es de este plan.**

### 4.G Performance (§25)

Causa raíz medida: **cero `React.memo` en `components/modules/`** y un solo árbol
de cliente de 1 128 líneas.

1. `memo()` en los 12 previews, comparando por `config` (la referencia solo cambia
   cuando `updateConfig` toca ESE módulo — el reducer ya devuelve el mismo objeto
   si no hay cambio).
2. Los tres contextos de §4.C: seleccionar deja de tocar el documento.
3. El arrastre (texto y sticker) escribe en una **ref + variable CSS** durante el
   gesto y despacha al reducer solo en `pointerup`. Es como ya funciona el
   sticker; hay que mantenerlo.
4. `startTransition` para el paginador y el zoom.
5. **Cuidado con `replayKey`:** hoy remonta el lienzo entero al cambiar cualquier
   animación. Con selección viva eso la tira. Hay que acotar el remonte al módulo
   afectado o restaurar la selección tras el remonte.

Objetivo medible: **arrastrar un texto no debe re-renderizar ningún otro módulo.**
Se verifica con un contador de renders en la prueba, no a ojo.

---

## 5. Wireframes

### 5.1 Desktop (≥ 1024)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ←  XV noche estelar ✎   ● Guardado         ↶ ↷   │  Vista previa  Compartir │
│                                                   │        [ Publicar ]   ⋯  │
├────┬──────────────────┬─────────────────────────────────────┬───────────────┤
│ ▤  │                  │                                     │               │
│Secc│  SECCIONES       │      ┌─────────────────────────┐    │  PORTADA      │
│    │  ┌────────────┐  │      │                         │    │  ───────────  │
│ ✧  │  │▦ Portada ●│  │      │      Mis XV años        │    │  CONTENIDO    │
│Elem│  └────────────┘  │      │   ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌    │    │   Título      │
│    │  ┌────────────┐  │      │ ┌─○────────────○─┐      │    │   [Mis XV …]  │
│ ◐  │  │▦ Bienven.●│  │      │ ○ Una noche …   ○  ←sel  │    │   Subtítulo   │
│Esti│  └────────────┘  │      │ └─○────────────○─┘      │    │   [Una noche] │
│    │  ┌────────────┐  │      │                         │    │               │
│ ⧉  │  │▦ Cuenta  ○│  │      │      ─ VER MÁS ─        │    │  DISEÑO       │
│Capa│  └────────────┘  │      │                         │    │   Composición │
│    │       ⊕          │      └─────────────────────────┘    │   ▣ ▤ ▥ ▦ ▧   │
│ ▧  │  ┌────────────┐  │                                     │   Alineación  │
│Plan│  │▦ Ubicación○│  │   ╭───────────────────────────╮     │   ⌐ ⌂ ¬       │
│    │  └────────────┘  │   │ Aa 32 ▾ │ B I │ ≡ │ ▦ │⚡│⋯│   │   Marco       │
│════│                  │   ╰───────────────────────────╯     │               │
│ ⚙  │  [+ Sección]     │      toolbar anclada al bloque      │  ANIMACIÓN    │
│    │                  │                                     │   Entrada ▾   │
│    │                  │                                     │   ▷ Probar    │
├────┴──────────────────┴─────────────────────────────────────┴───────────────┤
│  ‹  Portada · 1 de 6  ›          │ 📱 Móvil  🖥 Escritorio │  − ▬▬●▬▬ + 100% ⛶│
└──────────────────────────────────────────────────────────────────────────────┘
  64px      240px                    flexible                      300px
```

Decisiones, y el porqué de cada una:

- **El riel de iconos son 6 destinos, no 10.** Secciones · Elementos · Estilo ·
  Capas · Plantillas — y bajo un divisor, Ajustes. Invitados sale del riel de
  diseño (no es diseñar) y se va al menú «⋯».
- **Cada icono lleva etiqueta.** Iconos solos son adivinanzas y un fallo de
  accesibilidad.
- **Las pills Móvil/Escritorio bajan a la barra de estado.** Dejan de robar
  altura al lienzo y quedan donde la gente ya las busca.
- **La toolbar se ancla al bloque, no a la ventana.** Menos distancia entre
  intención y control que la de Invitio. Se reposiciona (arriba/abajo) para no
  salirse del lienzo, y **nunca tapa el foco de teclado** (WCAG 2.2 «Focus Not
  Obscured», AA).
- **El panel derecho tiene tres grupos fijos: Contenido · Diseño · Animación.**
  Siempre los mismos, en el mismo orden, para todos los módulos. Lo que no aplica
  no se pinta. Eso es lo que hace que deje de parecer un formulario.
- **Un solo botón primario: Publicar.** Hoy compiten «Ver» y «Despublicar».

### 5.2 Selección — los tres estados

```
Sin selección          Sección seleccionada        Bloque seleccionado
┌──────────────┐       ╔══════════════╗            ┌──────────────┐
│              │       ║ ▣ Portada ⋮  ║            │ ┌─○──────○─┐ │
│  Mis XV años │       ║  Mis XV años ║            │ ○ Mis XV  ○ │
│              │       ║              ║            │ └─○──────○─┘ │
└──────────────┘       ╚══════════════╝            └──────────────┘
 → Propiedades del      → borde + etiqueta          → caja + 4 handles
   documento              esquina + menú ⋮            + toolbar de texto
   (tema, fondo…)       → Fondo/Layout/Espaciado    → Fuente/Tamaño/Color…
```

Un solo clic selecciona el **bloque**. `Esc` sube al módulo. `Esc` otra vez,
deselecciona. Doble clic sobre un texto entra en **edición directa**.

Handles: **4 en las esquinas, sin rotación**. Sobre texto solo cambian el escalón
tipográfico (S/M/L/XL), no un px arbitrario. Rotación libre solo en stickers, que
es donde ya existe y donde no rompe nada.

### 5.3 Toolbar contextual por tipo

```
TEXTO       [ Aa Playfair ▾ │ S M L XL │ B  I │ ≡ ≣ ≡ │ ■ color │ ⚡ │ ⧉ 🗑 ⋯ ]
IMAGEN      [ ⟳ Reemplazar │ ▭ Proporción ▾ │ ◉ Encuadre ▾ │ ◐ Velo │ ⚡ │ ⧉ 🗑 ]
SECCIÓN     [ ▣ Composición ▾ │ ⌐⌂¬ Alineación │ ▭ Marco ▾ │ ⚡ │ ↑↓ │ ⧉ 👁 🗑 ]
STICKER     [ ⤢ Tamaño │ ⟳ Rotar │ ◍ Forma ▾ │ ⧉ 🗑 ]
```

Cada control de la toolbar de TEXTO mapea a algo que **ya existe** en el esquema o
en `theme.typography`. Ninguno inventa datos nuevos en la Fase 3.

### 5.4 Mobile (< 1024) — evoluciona lo que se rehizo el 11-09

```
┌───────────────────────┐   ┌───────────────────────┐
│ ←  XV noche  ● ↶↷  ⋯ │   │ ←  XV noche  ● ↶↷  ⋯ │
├───────────────────────┤   ├───────────────────────┤
│                       │   │                       │
│    ┌─○────────○─┐     │   │    Mis XV años        │
│    ○ Mis XV años○     │   │                       │
│    └─○────────○─┘     │   ├───────────────────────┤
│                       │   │  ═══  (arrastrar)     │
│   Una noche entre…    │   │  Título               │
│                       │   │  ┌─────────────────┐  │
├───────────────────────┤   │  │ Mis XV años     │  │
│ Aa│S M L│B I│≡│■│⚡│⋯│   │  └─────────────────┘  │
├───────────────────────┤   │  Subtítulo            │
│ ‹ Portada 1/6 › 100% ⛶│   │  ┌─────────────────┐  │
├───────────────────────┤   │  │ Una noche entre │  │
│ ▤   ✧   ◐   ⧉   ⚙   │   │  └─────────────────┘  │
│Secc Elem Esti Capa Aju│   ├───────────────────────┤
└───────────────────────┘   │ ▤   ✧   ◐   ⧉   ⚙   │
  bloque seleccionado        └───────────────────────┘
                              hoja de propiedades
```

- **El lienzo es siempre la pantalla.** Eso ya está y es correcto: no se toca.
- La toolbar contextual aparece **sobre** la barra de estado, deslizante
  horizontal si no cabe. Nunca se parte en dos filas.
- Las propiedades son una **hoja inferior** a media altura, arrastrable a
  completa. El lienzo sigue visible detrás: el usuario ve el efecto mientras edita.
- Todos los objetivos táctiles a **44 px**. Hoy hay 37 de 39 controles del editor
  por debajo, y está medido que **no es cosa del ancho** (a 1400 px son los
  mismos 37). Es deuda que el rediseño debe saldar, no heredar.
- No se fuerza el escritorio en móvil: **no hay riel lateral en móvil**, hay barra
  de pestañas inferior. Ya es así.

---

## 6. Elementos — el MVP honesto (§11)

El brief pide texto, imagen, forma, línea, icono, botón, separador, decoración,
marco, contenedor. **Implementar eso sería construir Canva, y el §35 lo prohíbe.**

La propuesta es dividirlo en tres, según lo que el motor ya sabe hacer:

**Grupo A — Ya existen, solo hay que EXPONERLOS (Fase 4, sin datos nuevos):**

| Elemento | Dónde vive ya |
|---|---|
| Imagen de sección | `media{url,position,ratio,focal,overlay,shape}` — completo y sin exponer |
| Marco / borde | `frame: none\|line\|double\|inset` |
| Composición de portada | `variant` × 5 |
| Decoración libre | `theme.stickers[]` — con x/y/scale/rotation/rounded |
| Fondo de documento | `theme.backgroundImage{url,overlay}` |

**Grupo B — Baratos y de valor real (Fase 4, campo nuevo con default):**

| Elemento | Coste |
|---|---|
| Separador (línea/ornamento) entre secciones | Un campo `divider` en `layoutShape` |
| Icono decorativo en cabecera de sección | Reusa `decoration.symbol` |

**Grupo C — NO en este plan:** formas arbitrarias, líneas libres, botones sueltos,
contenedores anidados, capas z arbitrarias. Ninguno produce una invitación mejor
y todos rompen el responsive o el modelo de secciones.

> El panel «Elementos» de Sobrely **no es una biblioteca de clip-art**. Es *«qué
> le puedo añadir a esta sección»*. Esa diferencia es la identidad del producto:
> no compite con Canva en cantidad, gana en que lo que sale siempre se ve bien.

---

## 7. Plantillas dentro del editor (§13) — y su riesgo

**Estado medido:** no existe cambiar plantilla. `createFromTemplate` solo crea, y
la invitación guarda **su propia copia** de `theme_config`. Una migración de
plantillas no la toca.

El peligro es real y el brief lo nombra: cambiar plantilla **no puede destruir el
contenido del usuario**.

Estrategia propuesta — **tres capas separadas**, y solo la primera es de bajo riesgo:

| Capa | Qué cambia | Riesgo | Reversible |
|---|---|---|---|
| **1 · Estilo** | Solo `theme_config` (paleta, tipografías, decoración) | **Bajo** | Sí, con ⌘Z |
| **2 · Composición** | `align`/`bleed`/`frame`/`variant` de cada módulo. **No toca textos ni imágenes** | Medio | Sí, con ⌘Z |
| **3 · Estructura** | Añade/quita módulos según `modules_config` | **Alto** | Solo con ⌘Z |

Reglas duras:
- **Nunca se borra contenido del usuario.** Un módulo que la plantilla nueva no
  contempla **se conserva y se marca oculto**; no se elimina.
- **Fusión por `module_type`**, no por posición: los textos e imágenes del usuario
  se conservan y solo se sobreescriben las perillas de composición.
- **Diff antes de aplicar**, con conteo explícito: *«Se cambiarán colores y
  tipografías. Se conservan tus 6 textos y 3 imágenes. Se añadirá: Música.»*
- Todo entra por **una sola acción del reducer** (`aplicarPlantilla`) → un solo
  paso de ⌘Z. Deshacer tiene que devolver la invitación entera.
- **Detección de incompatibilidad:** si el usuario subió arte propio
  (`custom_art`), la capa 1 avisa antes de pisar la paleta.

Por eso las plantillas van en la **Fase 9, la última funcional**: necesitan que el
resto esté estable para poder deshacerlas con confianza.

---

## 8. Antes vs. Después (§30)

| Dimensión | Hoy | Propuesto | Beneficio |
|---|---|---|---|
| **Cómo se edita un texto** | Buscar la sección en el riel → buscar el campo en el formulario derecho → escribir → mirar el lienzo | Clic sobre el texto en el lienzo → escribir ahí mismo | Se elimina el viaje de ida y vuelta. Es **el** cambio. |
| **Lienzo** | Espejo pasivo | Superficie de trabajo | «Estoy diseñando», no «estoy configurando» |
| **Panel derecho** | Un formulario largo igual para todo | Contextual, tres grupos fijos | Menos opciones simultáneas (§4 del brief) |
| **Navegación** | Un solo riel que mezcla secciones, tema, invitados y ajustes | Riel de 6 destinos, con lo no-diseño fuera | Jerarquía legible |
| **Motor visual accesible** | ~30 % de las primitivas expuestas | ~90 % | El producto deja de desperdiciar lo que ya construyó |
| **Capas** | No existe | Árbol derivado, navegable | Se entiende la estructura de la invitación |
| **Plantillas** | Solo al crear | Dentro del editor, en 3 capas con diff | Se puede explorar sin miedo |
| **Móvil** | Lienzo + hojas (rehecho 11-09) | Igual + toolbar contextual + 44 px | Se salda la deuda táctil |
| **Undo / Autosave / Zoom / Reordenar** | Ya correctos | **Se conservan tal cual** | Cero regresión, cero trabajo desperdiciado |
| **Invitaciones existentes** | 18 (7 publicadas) | Renderizan **idénticas** | Ningún campo cambia de default |

**Lo que se mantiene sin tocar:** `editor-history.ts`, `use-autosave.ts`,
`saveEditor` + bloqueo optimista, RLS, el modelo de datos, el zoom por `transform`,
el paginador, el sistema de temas, la barra móvil, los 12 renderers.

---

## 9. Compatibilidad y migración (§26) — el bloque crítico

**Formato actual:** `config` jsonb por módulo + `theme_config` jsonb en la
invitación. Sin columna de versión de esquema.

**Veredicto: no hacen falta migraciones de base de datos para las Fases 1–8.**
Todo lo nuevo cabe en el jsonb con `.default(...)`.

Reglas de compatibilidad (no negociables):

1. **Todo campo nuevo tiene `default` = la conducta de hoy.** Una invitación
   guardada antes renderiza bit a bit igual.
2. **Lectura tolerante, escritura estricta.** `parseConfig` descarta la config
   entera si algo no valida — endurecer el esquema de lectura **borra datos de
   clientes reales**. Lo estricto va en `moduleConfigWriteSchemas`.
3. **Rangos recortan, no rechazan** (`fraccionDeDesplazamiento` es el patrón).
4. **Prueba de no-regresión de render:** se captura el HTML de las 18 invitaciones
   vivas ANTES de cada fase y se compara md5 después. Si cambia y no debía,
   la fase no pasa. Es el mismo método que validó la Fase 11.
5. **Versionado:** no se añade `schema_version` todavía. Se añade **solo** si la
   Fase 9 (plantillas) obliga a una transformación no reversible por default.
   Meterlo antes es ceremonia sin beneficio.

⚠️ **Recordatorio del roadmap:** la migración `0026` (álbum) sigue CONGELADA — si
se aplica después de la `0053` nace muerta. Este plan no la toca.

---

## 10. Accesibilidad (§28)

Objetivo: **WCAG 2.2 AA**, y es alcanzable porque la base ya trae `aria-live`,
`aria-pressed`, `aria-current` y sensor de teclado en dnd-kit.

| Requisito | Cómo se cumple |
|---|---|
| **Dragging Movements (AA)** | Todo lo arrastrable tiene alternativa: flechas del teclado mueven el bloque seleccionado; el panel trae los números; el menú ⋮ trae «Subir/Bajar». |
| **Target Size (AA, 24 px web)** | Toda la toolbar y el riel a ≥ 24 px; en móvil, **44 px**. Hoy 37 de 39 controles no llegan: es deuda a saldar. |
| **Focus Not Obscured (AA)** | La toolbar flotante se reposiciona antes de tapar el elemento con foco. `scroll-padding` en el lienzo. |
| **Focus Appearance** | Anillo de 2 px con contraste 3:1 — ya hay `focus-visible:ring-3` en el chrome; se extiende a la capa de selección. |
| **Navegación por teclado del lienzo** | `Tab` recorre los bloques en orden de documento. `Enter` edita. `Esc` sube un nivel. `⌘↑/↓` mueve la sección. |
| **Lectores de pantalla** | Cada bloque seleccionable es un `button` real con nombre accesible («Título de Portada»), no un `div` con `onClick`. |
| **`prefers-reduced-motion`** | El «Reproducir animación» del lienzo se respeta como intención explícita del usuario; las transiciones del chrome, no. |
| **Anuncio de selección** | `aria-live="polite"`: «Título de Portada, seleccionado». |

---

## 11. Flujo UX (§23) — pasos que sobran hoy

| # | Paso | Hoy | Propuesto |
|---|---|---|---|
| 1 | Crear invitación | Dashboard → plantilla | Igual |
| 2 | Entrar al editor | Directo | Igual |
| 3 | **Ver qué hacer** | ❌ Panel derecho vacío. No hay primer paso evidente | ✅ La portada nace seleccionada + pista «Toca cualquier texto para editarlo» |
| 4 | Editar un texto | ❌ Riel → panel → campo → mirar lienzo | ✅ Clic en el texto → escribir |
| 5 | Cambiar una imagen | ❌ Riel → panel → «Subir imagen» | ✅ Clic en la imagen → «Reemplazar» en la toolbar |
| 6 | Añadir sección | Riel → «Agregar sección», o el `+` invisible del gutter | El `+` se hace descubrible; se mantiene la inserción posicional |
| 7 | Cambiar el diseño de una sección | ❌ Enterrado en un `<Select>` con valores en inglés | ✅ Miniaturas visuales en la toolbar de sección |
| 8 | **Renombrar la invitación** | ❌ Panel «Ajustes» | ✅ Editable en la top bar |
| 9 | Probar animación | Panel → «Reproducir en el lienzo» (ya existe, bien) | ✅ También ⚡ en la toolbar |
| 10 | Publicar | Ya correcto | Igual, como único botón primario |

**Pasos que se eliminan:** el viaje riel→panel→campo (4), el viaje a Ajustes para
el nombre (8), y la búsqueda del selector de composición (7).

---

## 12. Fases

> Cada fase es independiente, entra por su propia rama `skarlette/<tipo>-<desc>`,
> y **ninguna empieza sin «APROBADO FASE N»**.
> Criterio transversal: `tsc` ✅ · `eslint` ✅ · las 988 pruebas en verde · y el
> **md5 del HTML de las 18 invitaciones vivas sin cambiar**, salvo donde la fase
> diga explícitamente que cambia.

### FASE 1 · Fundación — partir el monolito y subir el estado
- **Objetivo:** que seleccionar deje de re-renderizar la invitación. Sin cambio visible.
- **Alcance:** partir `invitation-editor.tsx` (1 128 ln) en `EditorShell` + `TopBar` +
  `RielHerramientas` + `PanelPropiedades`. Crear `DocumentoContext`, `SeleccionContext`,
  `LienzoContext`. Subir `zoom`/`vista`/`seccionActual` desde `PreviewPane`. `memo()` en los 12 previews.
- **Archivos:** `components/editor/invitation-editor.tsx`, `preview-pane.tsx`,
  nuevos `components/editor/shell/*`, `lib/editor/contextos.ts`.
- **Dependencias:** ninguna.
- **Riesgos:** romper el historial al mover el reducer (**mitigación:** `editor-history.ts` no se toca); perder el zoom al subir el estado.
- **Aceptación:** el editor se ve y funciona **idéntico**. Prueba de conteo de renders: cambiar la selección re-renderiza 0 módulos.
- **Pruebas:** contador de renders; las 20 de historial y las de autosave siguen verdes.

#### ✅ FASE 1 — CERRADA, con lo MEDIDO

Tres commits en `skarlette/refactor-editor-fase1`.

**Lo que se encontró al empezar, y no estaba en el plan:** `ModulePreview`
llamaba `parseConfig()` suelto en el render. Devuelve `safeParse(...).data`, o
sea un objeto **nuevo cada vez**, así que la prop `config` de los doce Preview
cambiaba de identidad en cada render y un `React.memo` habría fallado el 100 %
de las veces. Sin arreglar eso primero, el resto del trabajo de rendimiento
habría sido teatro. Es el commit 1.

**Efecto medido en Chrome** (invitación real de 10 secciones, `localhost:3000`,
pestaña `visible`, esperas por `requestAnimationFrame` continuo). Cinco cambios
de selección alternando entre dos secciones:

| Componente | Acoplado (mutante) | Fase 1 |
|---|---|---|
| `CanvasArea` | **10** renders | **0** |
| `PreviewPane` | **10** renders | **0** |
| Los 12 previews | 0 (ya los cortaba `memo`) | **0** |
| `Countdown` | 2 | 2 — su propio `setInterval`, no la selección |

Y editar el título de una sección repinta **solo su módulo** (`Map` +2), no los
otros nueve. Esa es la memoización cobrándose.

⚠️ **Cómo se llegó a ese número importa.** La primera sonda midió renders de los
*previews* y dio 0 **también con el mutante aplicado** — o sea que el mutante
sobrevivió. No era un pase: era la sonda mirando el sitio equivocado. Los
previews los protege `memo` con acoplamiento o sin él; lo que el desacople evita
es el repintado de `PreviewPane` mismo, que sí hace trabajo real (filtrar
visibles, `resolveAnimation` ×10, construir la `replayKey`, leer el
`ResizeObserver`). Con la sonda movida a ese nivel, el mutante murió y el número
apareció. **Un 0 no vale hasta demostrar que el instrumento sabe ver un 10.**

**Decisiones tomadas durante la fase:**

- *Prueba de conteo de renders en CI:* **no se hizo así.** El repo corre vitest
  con `environment: "node"` e `include: ["**/*.test.ts"]`, sin testing-library ni
  DOM. En su lugar: `desacople-canvas.test.ts` recorre el **cierre transitivo de
  imports** del lienzo y falla si algo, a cualquier profundidad, llama a
  `useSeleccion()`. Es un PROXY de la estructura, y el archivo lo dice; el efecto
  se midió en el navegador. Decisión del dev: guard estructural + medición, sin
  añadir dependencias al repo de producción.
- *Estabilizar el objeto `animation` de `preview-pane`:* **fuera de la Fase 1.**
  Medido el camino, `ModulePreview` repinta pero su `Preview` memoizado corta, así
  que el trabajo caro ya está protegido y lo que queda son envoltorios finos.
  Entra en la Fase 2, donde la capa de selección sí lo hará pesar.

**Daños colaterales, y cómo quedaron:**

- `barra-movil.test.ts` leía el texto fuente de `invitation-editor.tsx`. Se
  **reapuntó** a la superficie completa del editor (lee el directorio `shell/`,
  no una lista a mano). Ninguna aserción relajada.
- `slot-de-media.test.ts` y `portada-marco-stickers.test.ts` anclaban en
  `indexOf("export function HeroPreview")`. Reapuntadas — y de paso se les cerró
  un **verde falso**: con el ancla rota el recorte quedaba vacío y su
  `not.toContain` pasaba igual. Ahora se afirma que el ancla existe.

**Verificación:** `tsc` ✅ · `eslint` ✅ · **995 pruebas en 66 archivos** ✅ (7
nuevas). Ocho mutantes aplicados, los ocho mueren. El editor se ve y se comporta
igual: 10 secciones, selección, zoom, paginador, Móvil/Escritorio, un solo
`PreviewPane`, cero errores de consola.

**Deuda que la Fase 1 NO saldó** (sigue viva, y está arriba en §1.5):
`config-editors.tsx` con 1 067 líneas, los 37 controles bajo 44 px, y
`hayCambiosSinGuardar` comparando por `JSON.stringify` completo.

---

### FASE 2 · Selección en el lienzo  ← la fase bisagra
- **Objetivo:** hacer el lienzo interactivo.
- **Alcance:** `lib/editor/seleccion.ts` + `lib/editor/bloques.ts` (contrato de bloques por tipo). `CapaDeSeleccion` sobre `PreviewPane`: hover, bounding box, etiqueta de sección, sincronía bidireccional con el riel. Teclado: Tab/Enter/Esc.
- **Archivos:** `preview-pane.tsx`, nuevos `capa-de-seleccion.tsx`, `lib/editor/bloques.ts`, `previews.tsx` (añadir `data-bloque` donde falte).
- **Dependencias:** Fase 1.
- **Riesgos:** **el más alto del plan** — conflicto de hit-testing con `StickerEditorLayer` (z-30) y `useMovimientoLibre`. Ya hay precedente medido: el paginador necesitó `z-40` porque `elementFromPoint` devolvía la capa de stickers. **Mitigación:** escalera de z documentada y una prueba de `elementFromPoint` por capa.
- **Aceptación:** clic en cualquier texto de las 12 secciones lo selecciona; `Esc` sube; el riel y el lienzo siempre coinciden; `elementFromPoint` sobre cada capa devuelve lo esperado.
- **Pruebas:** contrato `bloquesDe()` × HTML renderizado de los 12 módulos (**fija la SECUENCIA de `data-bloque`**, no solo el conteo); hit-testing por capa; recorrido de teclado.

#### ✅ FASE 2 — CERRADA, con lo MEDIDO

Dos commits. El lienzo deja de ser un espejo y pasa a responder.

**Un agujero del PLAN, no del código.** El §4.A afirma «el DOM ya está anotado».
Medido: **eso es cierto solo para la portada**. El hero emite
`data-bloque="title|subtitle|cta"` siempre; las otras **once** secciones solo lo
emiten con `freeMove` encendido, y el defecto es `false`. Las 18 invitaciones
vivas no tenían **ni un ancla** en esos once módulos.

La salida: `Section` marca sus hijos también con `freeMove` apagado, pero **solo
dentro del editor** (`ModoEditorProvider`), y **clonando** el hijo en vez de
envolverlo — `cloneElement` añade un *atributo*, no un *nodo*, así que no se
mueve un píxel. La página pública no provee el contexto y su HTML sigue igual.
Y no se afirma de palabra: la prueba le quita los `data-bloque` al HTML del
editor y exige que quede **byte a byte** el HTML público, en los doce módulos.

**El contrato de bloques, medido y no supuesto:**

- Los huecos de CONTENIDO conservan su slot (`welcome` sin mensaje sigue dando
  su segundo bloque, vacío). El índice no se corre porque el usuario borre texto.
- Los hijos CONDICIONALES DE COLA sí desaparecen (`gifts` da 3 bloques con
  enlaces y 2 sin ellos).
- De ahí: lo renderizado es siempre un **prefijo** de la tabla. La prueba afirma
  «prefijo», no «longitud exacta» — afirmar la longitud se pondría roja sola con
  el primer cambio de copy.

Un bloque **no es «un texto»**: el primero de `rsvp` es compuesto (título y
descripción juntos) y uno de `dresscode` son dos figuras SVG. Su `campo` queda
en `null` antes que adivinar — la Fase 3 escribe en esos campos.

**El riesgo nº1 del plan, cerrado por medición.** La capa es
`pointer-events-none` y solo dibuja; la selección se detecta por **burbujeo**,
que es el patrón que ya usan las dos capas que funcionan. Medido en Chrome:
`elementFromPoint` sobre un texto devuelve el `SPAN`, no la capa; el paginador
sigue recibiendo el clic; los stickers siguen en `pointer-events: none`. La
escalera de z no se tocó (contenido 10 < **selección 20** < stickers 30 <
paginador 40 < modal 50).

**Efecto medido en Chrome** (invitación real de 10 secciones, 20 anclas):

| Comprobación | Resultado |
|---|---|
| Desalineación del recuadro al 100 % / 150 % / 50 % | **0, 0, 0 px** |
| Renders al hacer clic en el lienzo | `CapaDeSeleccion` 4 · **`PreviewPane` 0 · `CanvasArea` 0** |
| `Esc` | bloque → módulo → nada |
| Riel → lienzo | «Itinerario» → recuadro «Itinerario» |
| Lienzo → inspector | «Cuenta regresiva · Título» → inspector «Cuenta regresiva» |

El desacople de la Fase 1 **sobrevivió**: la capa es un componente hermano que se
suscribe ella sola y no monta ni un módulo.

**El guard de la Fase 1 cazó este cambio, y se AFINÓ, no se relajó.** Su método
era el cierre de imports, e importar se parece a acoplar sin serlo. El
invariante bueno no es «nadie se suscribe» sino **«quien RENDERIZA módulos no se
suscribe»**. Ahora hay lista explícita de suscriptores permitidos más dos
pruebas que impiden que sea una puerta trasera.

**Auditoría de seguridad del rango: sin hallazgos.** Se verificó inyección de
selector (`CSS.escape` + entradas de baja capacidad), sobrescritura de props vía
`cloneElement`, XSS en la etiqueta (cadenas estáticas), y que el modo editor no
puede filtrarse a la página pública. Se corrigió un listener de `mouseleave` que
no se retiraba en el cleanup.

**⚠️ LO QUE NO SE HIZO, y estaba en el alcance:** el recorrido por **`Tab`** y
`Enter` sobre los bloques del lienzo. `Esc` sí está. Hacer los 20 bloques
focusables exige un *roving tabindex* bien hecho —si no, se mete un laberinto de
tabulación peor que no tenerlo— y `Enter` solo tiene sentido cuando exista la
edición directa. **Recomendación: entra en la Fase 3, emparejado con `Enter` →
editar.** Hasta entonces el lienzo es navegable con ratón y el riel sigue siendo
el camino accesible por teclado, como antes.

Verificado por mutación, los cuatro mueren: `preview-pane` suscrito ·
un permitido renderizando módulos · `Section` envolviendo en vez de clonar
(11 de 12 módulos rojos) · la tabla de bloques desordenada.

`tsc` ✅ · `eslint` ✅ · **1 049 pruebas en 67 archivos** ✅ (54 nuevas).

---

### FASE 3 · Edición directa de texto + toolbar contextual
- **Objetivo:** «clic sobre el texto → escribir».
- **Alcance:** `contentEditable` **plaintext-only** sobre el bloque seleccionado, con saneado en `paste`. Toolbar flotante anclada al bloque, con reposicionamiento. Escalones tipográficos, peso, alineación, color desde el tema.
- **Archivos:** `capa-de-seleccion.tsx`, nuevos `toolbar-contextual.tsx`, `lib/editor/texto-directo.ts`; `lib/modules/types.ts` (campos tipográficos con default).
- **Dependencias:** Fase 2.
- **Riesgos:** **seguridad** — pegar HTML en `config` jsonb que luego renderiza la página pública. **Mitigación:** `plaintext-only` + saneado + tope de longitud del esquema + prueba de inyección. Segundo riesgo: la fusión del historial por tecla (ya resuelta por `claveDeFusion`, hay que verificar que aplique).
- **Aceptación:** editar «Mis XV años» en el lienzo cambia el documento, lo guarda, y ⌘Z lo deshace **como palabra, no como letra**. Pegar `<script>` guarda texto plano.
- **Pruebas:** inyección por pegado; fusión de historial al teclear; reposicionamiento de la toolbar en los 4 bordes.

#### ✅ FASE 3a — CERRADA · ⬜ FASE 3b — PENDIENTE DE APROBACIÓN

**Lo hecho (3a):** edición directa de texto. Doble clic en un texto del lienzo y
se escribe ahí. `Esc` cancela, `Enter` confirma. Escribe por la misma vía que los
paneles (`updateConfig`), así que hereda autoguardado, bloqueo optimista y ⌘Z.
Un paso de deshacer por edición — no por letra.

**Seguridad:** el pegado se intercepta y se inserta texto plano a mano; no se
confía en `contenteditable="plaintext-only"`. Los topes de longitud se **leen del
esquema** desenvolviendo el `ZodDefault`, no de una tabla copiada. Auditoría del
rango: sin hallazgos, y confirmó que la validación server-side existe
(`saveEditorSchema` + `moduleConfigWriteSchemas` por módulo en `actions.ts`).

**Tres defectos encontrados, y dos eran de la Fase 2:**

1. `bloques.ts` mapeaba `dresscode[3]` al campo `notes`, **que no existe** en el
   esquema — es `description`. Editar ahí habría hecho desaparecer el texto del
   usuario en silencio. Lo cazó la prueba que cruza cada `campo` con su tope.
2. La prueba de secuencia afirmaba «PREFIJO» y eso **enmascaraba un hueco en
   medio**: `[0,1]` es prefijo de `[0,1,2]`. Medido, `dresscode` da `[0,1,3]` sin
   `freeMove`, porque `cloneElement` sobre un COMPONENTE añade la prop pero el
   componente no la reenvía a su raíz. Ahora el conjunto está **pinchado**: se
   probó con un mutante que quitaba el bloque 1 y **sobrevivía** al subconjunto.
3. **Deshacer no repintaba el lienzo.** Aplanar el bloque con `textContent = ...`
   destruye nodos que React posee; sus fibras apuntan a nodos desprendidos y
   React actualiza lo que ya no está en la página. El documento revertía bien y
   **la pantalla mentía**. La suite estaba verde: sólo se vio midiendo. Arreglado
   con una generación por módulo en la `key`.

**Medido en Chrome:** editar → deshacer → rehacer → deshacer; lienzo y panel
coinciden en los cuatro pasos. El `U+00A0` que aparecía en el lienzo se persiguió
hasta el dato: **lo guardado lleva espacios normales (32)**; el 160 lo mete
`TextReveal` al pintar. No hay corrupción.

**Limitación documentada:** `map.address` no es editable en el lienzo — su bloque
no queda marcado sin `freeMove`, por el problema del `cloneElement`.

---

### ⬜ FASE 3b — lo que falta, y la decisión que necesita

**Por qué se paró.** El plan puso «escalones tipográficos, peso, alineación,
color» en la Fase 3 dando por hecho que era *exponer* algo existente. Medido:
**no existe ni un campo** de tamaño, peso o color por bloque ni por módulo, y los
tamaños están **100 % hardcodeados** — los once `<h3>` de sección repiten
literalmente la misma cadena Tailwind.

O sea que una toolbar tipográfica exige **campo nuevo + des-hardcodear el render
de 18 invitaciones vivas**. Eso es una decisión del dev, no del agente.

**Lo que SÍ existe hoy** (inventariado, no supuesto):

| Control | Campo | Alcance |
|---|---|---|
| Familia tipográfica | `theme.font` | invitación |
| Titulares ≠ cuerpo | `theme.typography{heading,body}` + `parcheDeParTipografico` + aviso `cuerpoIlegible` | invitación |
| Colores | `theme.colors.*` | invitación |
| Espaciado | `theme.spacing` | invitación |
| Alineación | `config.align` | **sección** (hero no lo hereda) |
| Marco / sangrado | `config.frame`, `config.bleed` | sección |
| Mover el bloque | `config.freeMove` + `textOffsets[i]` | **bloque**, por índice |
| Variante de portada | `hero.variant`, `hero.imageRatio` | hero |

Para contraste: **`deriveAccentText(color, superficie, tinta, 4.5)`** en
`lib/theme/contrast.ts` — obligatorio si la toolbar deja elegir color, o se rompe
el trabajo de contraste ya hecho (212 casos bajo AA documentados).

**Propuesta para 3b, con el patrón que este repo ya probó dos veces:**

Un campo por bloque cuyo **default no emite nada** — igual que `align: center` y
`imageRatio: "auto"`, que son la cadena vacía a propósito. Cero píxeles de cambio
en lo guardado, y la prueba de identidad byte a byte de la Fase 2 lo demostraría.

- Sitio: `layoutShape` en `types.ts` (lo heredan los 11 de golpe). **Hero va
  aparte** — no hereda `layoutShape`, y meterle esos campos sería config muerta.
- Forma: paralelo a `textOffsets` (array por índice), con `.catch()` y recorte en
  vez de `min/max` — porque `parseConfig` **descarta la config entera** del módulo
  si algo no valida.
- Render: `previews.tsx` tiene que dejar de hardcodear y pasar por un mapa de
  escala. Es el cambio con más riesgo de regresión visual de todo el rediseño.

---

#### ✅ FASE 3b · opción A — CERRADA (roving tabindex)

**Lo aprobado:** sólo el recorrido por teclado. La tipografía por bloque (B/C)
queda sin aprobar; nada de `types.ts` ni de `previews.tsx` se ha tocado.

**Dos afirmaciones del traspaso que la medición corrigió antes de escribir nada:**

1. «Emparejarlo con `Enter` → editar, **que ya existe**» — **no existía.** Se
   entraba a editar SÓLO por `dblclick`; el único `Enter` del archivo confirmaba
   una edición ya abierta. O sea que el alcance no era «añadir `Tab`», era `Tab`
   **más** una puerta de entrada por teclado que no había.
2. «Los once `<h3>` repiten literalmente la misma cadena» — son **once + un
   huérfano**: el de `rsvp` (`previews.tsx:1167`) es `text-lg font-semibold` a
   secas, sin los tres escalones de container query. Importa para la opción B:
   escribir el mapa de escala mirando «la cadena que se repite» le REGALARÍA a
   RSVP tres escalones que hoy no tiene — píxeles movidos en invitaciones vivas,
   colados por una uniformización que parece limpieza.

**Lo hecho.** `Tab` entra al lienzo y sale de él en **una** parada; las flechas
recorren bloque a bloque cruzando el límite de módulo; `Inicio`/`Fin` van a los
extremos; `Enter` edita; `Esc` sube un nivel (eso ya estaba). Los 20 bloques
llevan `aria-label` derivado del MISMO contrato que pinta el rótulo del recuadro,
así que lector de pantalla y pantalla no pueden discrepar.

**Decisiones, y por qué:**

- **Roving, no 36 paradas de `Tab`.** Doce módulos por ~3 bloques obligarían a
  pulsar `Tab` 36 veces para cruzar el lienzo hasta el panel. Es justo lo que el
  patrón existe para evitar. ⚠️ Se aparta de la letra del traspaso («recorrido
  por `Tab`»): se apartó a propósito, y está dicho.
- **Topa, no envuelve.** En un lienzo de varias pantallas, envolver teletransporta
  el foco al otro extremo sin anunciarlo. Topar devuelve la MISMA selección y el
  provider, que compara por valor, no repinta. Misma decisión que `subirUnNivel`.
- **Las paradas se leen del DOM, no de la tabla de `bloques.ts`.** La secuencia
  renderizada es un PREFIJO de la tabla; la tabla prometería paradas que no están
  en la página.
- **`preventDefault` también al topar**, o la flecha que no mueve nada desplaza
  la página y parece que el foco se fue.

**Un defecto encontrado midiendo, y era mío:** el clic seleccionaba pero **dejaba
el foco en `<body>`**. Ratón y teclado se desincronizaban: pulsabas un bloque,
veías el recuadro, y la flecha siguiente no hacía nada. Arreglado enfocando el
bloque en el clic, con `preventScroll` porque ya está a la vista y el
desplazamiento automático dentro de un lienzo escalado por `transform` salta.

**Medido en el Chrome del dev**, no por verde de suite:

| Comprobación | Resultado |
|---|---|
| Invariante del roving | 1 nodo con `tabindex="0"`, 19 con `-1`, 20 con `aria-label` |
| Clic | foco, `tabindex="0"` y rótulo del recuadro coinciden los tres |
| Flechas | cruzan de `Portada · Etiqueta` a `Bienvenida · Título` y vuelven |
| `Inicio`/`Fin` | `Portada · Título` ↔ `Confirmación (RSVP) · Formulario` |
| Topes | flecha de más en ambos extremos: la selección NO se mueve |
| `Enter` → editar | abre `contentEditable` sobre el bloque enfocado |
| `Esc` | cancela y restaura el texto original |
| `Enter` → confirmar (de la 3a) | **no lo pisa mi manejador**: el texto tecleado se guarda entero, y ⌘Z lo revierte. Lienzo y panel coinciden después |
| `Tab` / `Shift+Tab` | sale al control de zoom y vuelve por la misma puerta |

**Pruebas:** `recorrido.test.ts`, 12 casos sobre lógica pura (el entorno de
vitest es `node`: el foco y el layout no se pueden medir ahí, por eso se midieron
en Chrome). **Seis mutantes, seis muertos:** envolver en vez de topar (2 rojas),
caer al principio en vez de al módulo (2), entrar siempre por la primera (1),
devolver `null` con la lista vacía (1), ignorar el módulo al buscar el índice (2),
y `paradaExtrema` siempre al final (1).

**Auditoría del rango (`a63bec1..048bb66`), antes del push:** sin hallazgos de
seguridad. Los únicos `setAttribute` nuevos son `tabindex` y `aria-label`, con
valores de tablas de literales y no del `config` del usuario; el saneado del
pegado, los topes leídos del esquema y la guarda de bloque compuesto quedan
intactos.

La auditoría sí levantó un defecto de corrección **plausible y falso**: que el
`Enter` del contenedor volviera a entrar en edición tras el `confirmar()` de la
3a y perdiera lo tecleado. Dos mediciones parecieron confirmarlo — y las dos
eran clics sobre un bloque que la animación tenía a `0x0`. Medido sobre un
bloque estable y con el arreglo puesto y quitado, el texto se guarda **igual en
los dos casos**: el defecto no existe. Se revirtió el «arreglo», porque llevaba
en un comentario un defecto «medido» que no se reproduce, y una justificación
falsa en el código es peor que no tener la guarda. Es el tercer caso de la
trampa nº 9.

**Suite: 1 098 en 69 archivos · `tsc` ✅ · `eslint` ✅ · cero migraciones.**
El cambio vive entero en un `useEffect` bajo `ModoEditorProvider`: no toca el
render, no toca `types.ts`, y la página pública no lo ve.

---

#### ⬜ FASE 3b · opciones B y C — SIN APROBAR

La toolbar tipográfica (tamaño, y en C peso y color). Siguen intactos su coste y
su riesgo: campo nuevo en `layoutShape` con default que no emita nada, más
des-hardcodear `previews.tsx` respetando el huérfano de RSVP. Y en C, el color
obliga a pasar por `deriveAccentText(...)` o se rompen los 212 casos bajo AA.

---

### FASE 4 · Imágenes y elementos — exponer lo que ya existe

> **🟡 EN CURSO (2026-09-17).** Hecho: el gate de `custom_art`, el slot de
> imagen en las 11 secciones y las miniaturas de portada. Falta: el panel
> «Elementos» y la toolbar de imagen en el lienzo.
>
> **Dos archivos que este plan nombra MAL.** `composicion-de-seccion.tsx` vive
> en `components/editor/`, no en `components/modules/`; y `config-editors.tsx`
> al revés. Medido al abrirlos, no supuesto.
>
> **Lo que el plan NO vio, y bloqueaba la fase:** `custom_art` —«Arte propio
> (fondo e **imágenes**)»— se comprobaba mirando **tres campos del `theme`** y
> ninguno de la `config` de un módulo. Las otras dos superficies de subida
> (`gallery`, `dresscode`) quedaban cubiertas de rebote porque sus módulos son
> de Celebración, que ya trae la capacidad. El slot de media rompe esa
> coincidencia: lo heredan los once, y `welcome`, `countdown` y `rsvp` son
> **Free**. Se cerró la fuga ANTES de abrir la superficie, en su propio commit.
>
> **Deuda abierta, y es del dev:** `hero.imageUrl` («Imagen de fondo») sigue
> dejando publicar arte propio en plan Free. Es una fuga que YA existía.
> Cerrarla puede empezar a exigir Celebración a invitaciones vivas que hoy
> publican gratis, así que pide censar las 18 antes de tocar nada. Decisión de
> precio, no efecto colateral.
>
> **El md5 de las 18 que pedía este plan no hizo falta para el slot:** no se
> tocó el render. Ni una línea de `previews.tsx`, ni un defecto del esquema. No
> hay diff que medir porque no hay cambio que medir. Sigue haciendo falta para
> lo que quede de la fase si toca el renderer.
>
> **Un defecto de UI que sólo salió midiendo:** `<SelectValue />` a secas pinta
> el valor CRUDO del enum. El panel decía «top», «rect», «4/3», «center» y
> —desde antes— «center», «double», «contained», mientras los desplegables sí
> mostraban los rótulos. Las tablas de rótulos eran código muerto justo en lo
> que el usuario ve primero. Arreglado con la función de formato que documenta
> `SelectValue.d.ts`.

- **Objetivo:** el mayor retorno por unidad de riesgo del plan.
- **Alcance:** exponer `media{position,ratio,focal,overlay,shape}` en los 11 módulos; `imageRatio` y `variant` de portada con **miniaturas visuales** en vez de un `<Select>` en inglés; panel «Elementos» con stickers, separador y marco. Selección y toolbar de imagen.
- **Archivos:** `composicion-de-seccion.tsx`, `config-editors.tsx` (se parte), `sticker-editor-layer.tsx`, nuevo `panel-elementos.tsx`.
- **Dependencias:** Fases 2–3.
- **Riesgos:** exponer `media.position` cambia el render de invitaciones que tenían la config sembrada por plantilla. **Mitigación:** el default sigue siendo `none`; md5 de las 18 antes/después. **Toda subida pasa por `ImageUploader`** o se salta la cuota de plan.
- **Aceptación:** el usuario puede poner una foto a la izquierda de «Bienvenida» sin tocar un formulario. Las 18 no se mueven.
- **Pruebas:** md5 de render; cuota de subida ejercitada; `proporcionMasCercana` con la imagen real.

### FASE 5 · Capas
- **Objetivo:** hacer visible la estructura.
- **Alcance:** árbol derivado (sección → bloques + decoración). Seleccionar, navegar, ojo/candado. `blocks{hidden,locked}` en `layoutShape` con default `{}`.
- **Dependencias:** Fase 2 (el contrato de bloques).
- **Riesgos:** `locked` no debe llegar al render público.
- **Aceptación:** el árbol refleja el documento; ocultar un bloque lo oculta en el lienzo **y en la página pública**; bloquear impide seleccionar **solo en el editor**.

### FASE 6 · Drag & Drop híbrido + alternativa de teclado
- **Objetivo:** libertad visual sin romper el responsive.
- **Alcance:** arrastre desde la selección (no desde un interruptor); guías y snap al centro/tercios; flechas del teclado; «Restablecer posición». `freeMove` deja de ser un interruptor visible.
- **Riesgos:** las trampas de `cqw` y del límite por CENTRO ya están medidas en §7 del roadmap: **respetarlas, no re-descubrirlas**.
- **Aceptación:** arrastrar un texto no re-renderiza ningún otro módulo; las flechas hacen lo mismo que el ratón; ningún valor guardado es un píxel.

### FASE 7 · Panel de propiedades contextual
- **Objetivo:** matar el formulario.
- **Alcance:** los tres grupos fijos (Contenido · Diseño · Animación) por tipo de selección; propiedades de documento cuando no hay selección; `theme-panel` se reubica.
- **Aceptación:** ninguna propiedad irrelevante visible; el panel cabe sin scroll en el 80 % de los casos.

### FASE 8 · Chrome, móvil y pulido
- **Objetivo:** que se sienta premium.
- **Alcance:** top bar nueva (título inline, estado de guardado explícito, un solo primario); barra de estado inferior; riel de 6; hoja de propiedades móvil; **los 37 controles bajo 44 px**; tokens `--ed-*`.
- **Aceptación:** medido en Chrome real a 375 px: cero controles bajo 44 px; sin scroll horizontal; foco siempre visible.

### FASE 9 · Plantillas dentro del editor  ← la más arriesgada
- **Objetivo:** explorar plantillas sin miedo.
- **Alcance:** pestaña Plantillas; las 3 capas (Estilo / Composición / Estructura); diff con conteo antes de aplicar; `aplicarPlantilla` como **un solo paso de ⌘Z**.
- **Riesgos:** **pérdida de datos de clientes reales.** Es el único punto del plan que puede destruir trabajo.
- **Mitigación:** nunca borrar — ocultar; fusión por `module_type`; diff obligatorio; probado contra una copia de las 18 antes de salir.
- **Aceptación:** aplicar una plantilla a las 18 conserva el 100 % de textos e imágenes; ⌘Z devuelve el estado exacto.

### FASE 10 · QA, migración y salida
- Recorrido E2E en Chrome real; las 18 verificadas por efecto observado; medición de renders; auditoría de accesibilidad; actualización de `AUDIT-REPORT.md` y de la §7 del roadmap con las lecciones.

---

## 13. Riesgos del plan completo

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | Conflicto de hit-testing entre selección, stickers y arrastre | **Alta** | Alto | Escalera de z documentada + prueba de `elementFromPoint`. Hay precedente medido (el paginador y el `z-40`). |
| R2 | `contentEditable` mete HTML en el jsonb público | Media | **Crítico** | `plaintext-only` + saneado + tope de esquema + prueba de inyección |
| R3 | Exponer primitivas mueve el render de las 7 publicadas | Media | Alto | Defaults inalterados + md5 antes/después de cada fase |
| R4 | Cambiar plantilla destruye contenido | Media | **Crítico** | Fase 9 aislada, nunca borra, diff obligatorio, un solo ⌘Z |
| R5 | Partir el monolito rompe historial o autoguardado | Media | Alto | No se tocan `editor-history.ts` ni `use-autosave.ts`. Fase 1 sin cambio visible. |
| R6 | `textOffsets` por índice se desalinea al cambiar un renderer | Media | Medio | Prueba que fija la **secuencia** de `data-bloque` de los 12 |
| R7 | El alcance se desborda hacia un clon de Canva | **Alta** | Medio | El Grupo C del §6 está explícitamente fuera. Revisar cada fase contra el §35. |
| R8 | `replayKey` tira la selección al remontar | Media | Bajo | Acotar el remonte o restaurar la selección |
| R9 | Trabajo en `main` (producción, clientes reales) | Baja | **Crítico** | Rama por fase; hay guard; merge solo a petición del dev y por fast-forward |

---

## 14. Decisiones tomadas, y por qué

1. **No se introduce un árbol de elementos libres.** Rompería el responsive, exigiría
   migraciones y pondría en riesgo 18 invitaciones vivas, a cambio de una libertad
   que produce invitaciones peores. La dirección de bloque da el 90 % del valor con
   el 10 % del riesgo.
2. **No se guarda ningún píxel.** Tres niveles de libertad, todos relativos. Es
   la línea que separa a Sobrely de Invitio.
3. **No se duplica el contenido por breakpoint.** Un solo árbol, container queries.
4. **No se toca lo que funciona:** historial, autoguardado, bloqueo optimista, RLS,
   zoom, paginador, barra móvil, los 12 renderers.
5. **Se exponen las primitivas antes de inventar elementos.** El motor ya está
   pagado y el editor solo deja tocar el 30 %.
6. **Plantillas al final.** Es lo único que puede destruir trabajo de un cliente.
7. **Accesibilidad como criterio de aceptación, no como pulido final.** WCAG 2.2 AA
   entra en cada fase, no en la Fase 8.

---

## 15. Pendiente de tu decisión

1. **¿Se aprueba la tesis del §0?** (evolucionar sobre la selección, no reconstruir)
2. **¿Se acepta el recorte del §6?** El Grupo C (formas, líneas, botones sueltos,
   contenedores) queda fuera. Si lo quieres dentro, cambia el plan entero.
3. **¿Invitados y Ajustes salen del riel de diseño?** Lo propongo al menú «⋯».
4. **¿La Fase 9 (plantillas) entra en este ciclo o se separa?** Es la única con
   riesgo de pérdida de datos; se puede cortar el plan en la Fase 8 sin perder coherencia.
5. **Orden sugerido:** 1 → 2 → 3 → 4 → 7 → 5 → 6 → 8 → 9 → 10.
   Adelanto la 7 (propiedades contextuales) porque después de la 4 el panel viejo
   se queda corto y sería trabajo tirado.

---

*Documento vivo. Se actualiza al cerrar cada fase con lo medido, no con lo previsto.*
