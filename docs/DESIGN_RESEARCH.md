# Sobrely — Investigación de diseño (Fase 0)

> **Estado: PROPUESTA. Nada implementado.** Este documento cierra la auditoría, la
> investigación y el benchmark, y presenta tres conceptos visuales con una
> recomendación y un roadmap. El plan detallado por fases vive en
> `REDESIGN_PLAN.md` y **no se escribe hasta que el dueño apruebe**.
>
> Fecha: 2026-09-07 · Rama: `skarlette/resend-y-orden-invitados` · `main` en `8867131`
>
> **Convención de evidencia.** `[M]` = lo medí yo en el producto vivo o en el
> código. `[V]` = una URL cargada y leída. `[S]` = snippet de buscador, sin
> fetch del artículo — un escalón por debajo. `[X]` = no verificado, y se dice.

---

## 0. Qué NO es este documento

Sobrely **ya está desarrollado y funciona**. Esto no es un plan para reconstruirlo.
Tres compromisos que atraviesan todo lo que sigue:

1. **No se propone eliminar ninguna funcionalidad.** El inventario de §3 clasifica
   todo en KEEP / IMPROVE / REFACTOR / REPLACE / NEW, y los cuatro REPLACE traen
   su justificación explícita.
2. **El backend no se reemplaza.** El hallazgo más importante de la auditoría de
   arquitectura es que `invitation_modules` **ya es** una tabla de secciones con
   orden y visibilidad: el editor modular que se propone **no requiere ninguna
   migración**.
3. **El modelo de pago por evento se conserva.** Lo que cambia es cómo se
   comunica, no cuánto cuesta.

---

## 1. El hallazgo que ordena todo lo demás

Antes de cualquier discusión de estética, hay un defecto de una línea que explica
más del "se siente básico" que las otras cuarenta observaciones juntas.

**`sobrely.com` renderiza todo su texto de cuerpo en Times New Roman.** [M]

```
getComputedStyle(document.body).fontFamily        →  "Times"
--font-sans                                       →  ""   (cadena vacía)
--font-geist-sans                                 →  "Geist", "Geist Fallback"
```

Medido en el sitio publicado, no en local. La causa es `src/app/globals.css:10`:

```css
--font-sans: var(--font-sans);   /* se referencia a sí misma */
```

Un ciclo en una custom property computa al valor *guaranteed-invalid*, así que
`font-family: var(--font-sans)` cae a la fuente por defecto del navegador. Y
mientras tanto **Geist sí estaba cargada y auto-hospedada** todo este tiempo,
colgando sin usar de `--font-geist-sans` (el `variable` está en el `<html>` de
`layout.tsx:70`). El proyecto pagaba la descarga de la fuente y no la usaba.

Los títulos no lo delataban porque varios piden Playfair explícitamente — el
`<h1>` del landing computa `"Playfair Display"`. Lo que se veía mal era el
cuerpo, que es casi todo el texto.

El mecanismo se confirmó inyectando la definición corregida en vivo antes de
tocar el archivo: el mismo `body` pasó de `Times` a `Geist` en el acto. [M]

**Estado por ref**, verificado con `git show`: [M]

| Ref | `globals.css:10` |
|---|---|
| `main` (lo que está en producción) | roto |
| checkout local del dev (`7afdd44`) | roto |
| `origin/skarlette/resend-y-orden-invitados` (`32a9efa`) | **arreglado, sin mergear** |

**Es P0 y no depende de este rediseño.** Es el cambio de mayor impacto visual del
proyecto entero y cuesta un merge.

---

## 2. Auditoría del producto actual

### 2.1 Arquitectura — lo que está bien hecho

Hay que decirlo antes de la lista de problemas, porque condiciona el plan:

- **Cero `"use client"` en `src/app/**`.** Las 47 rutas son Server Components; el
  cliente vive en `src/components/`. Es la arquitectura correcta y no se toca. [M]
- **`invitation_modules`** (`0001_initial_schema.sql:94-104`) tiene
  `sort_order`, `is_visible` y `config` jsonb. **Ya es una tabla de secciones.** [M]
- **El motor de animación es la mejor pieza de ingeniería del repo.**
  `src/app/animations.css` (221 líneas) anima solo `transform`/`opacity`/
  `clip-path`/`filter` — compositor puro; gatea el estado oculto con
  `@media (scripting: enabled)` para que sin JS nada quede invisible; e implementa
  `prefers-reduced-motion` de verdad (`:201-220`), deteniendo los 5 loops
  continuos. Encima hay un `registry.ts` con `cost` y `reducedMotionSafe` por
  preset. [M]
- **El gate de pago bloquea la publicación, no la creación.** El usuario ya
  invirtió esfuerzo cuando se le pide pagar. Es una buena decisión de producto, y
  su razón está documentada en el propio código (`plans.ts:39-44`). [M]
- **Las fracciones 0–1 para posición de stickers** (`theme.ts:79-82`) son el
  modelo responsive correcto, y ya está probado.
- `next/font/google` **auto-hospeda en build**: no viola cero phone-home.
  Verificado — cero referencias a `gstatic` en el build. [M]

### 2.2 El editor — la prioridad #1

`invitation-editor.tsx`, 549 líneas, un solo componente cliente.

| Hallazgo | Anclaje | Consecuencia |
|---|---|---|
| **Ocho `useState` sueltos**, sin reducer | `:85-99` | No hay un "documento" único que versionar. |
| **No existe undo/redo en todo el producto** | `grep` → 0 coincidencias reales | — |
| **No hay autosave ni guardia `beforeunload`** | `grep` → 0 de ambos | Cerrar la pestaña con cambios pierde todo, sin aviso. |
| **Borrar un módulo NO pide confirmación** | `sortable-module-item.tsx:65-73` → `:159` | Un clic en un botón de **28 px** destruye el módulo y su config, sin retorno. |
| Guardar y Publicar se bloquean mutuamente | `:335` `disabled={isPublishing \|\| dirty}` | Modelo de dos pasos que el usuario debe deducir. |
| `setModules(fresh)` tras guardar | `:252` | Reemplaza el árbol entero; una edición durante el guardado se pierde. |
| `saveEditor` hace **un UPDATE por módulo** | `actions.ts:399` | N+1. Y sin optimistic locking: dos pestañas se pisan en silencio. |
| **Dos sistemas de selección desconectados** | `:92 selectedId` vs `sticker-editor-layer.tsx:34` | Un panel de propiedades único necesita `selection: {kind, id}`. |
| El panel de propiedades está **anidado bajo la lista**, dentro de un tab | `:429-466` | Hay que scrollear entre "qué edito" y "cómo lo edito". Es el defecto estructural más visible. |
| Hasta **5 tabs `flex-1`** en 420 px | `:372-390` | Se truncan en móvil. Es lo primero que se ve al abrir el editor en un teléfono. |
| El preview se monta **dos veces** en escritorio | `:530-544` | Dos árboles vivos, dos capas de stickers escuchando punteros. |
| El preview fuerza `trigger:"load"` | `preview-pane.tsx:100-103` | **No muestra la animación real** de la invitación publicada. La promesa es falsa. |
| Dos `switch` gigantes en vez de registry | `config-editors.tsx` (999 líneas), `previews.tsx` (670) | Añadir un tipo obliga a tocar 4 sitios. |

**La buena noticia:** las ocho mutaciones **ya están centralizadas** en funciones
(`:134-203`). Migrar a un reducer con pila de historial es contenido, no
arqueología.

### 2.3 Design system — lo que falta

- **`src/components/ui/` tiene 12 primitivas.** Faltan ~22, y cuatro cuestan hoy:
  **Dialog** (el único modal está hecho a mano en `:267-308`, sin focus trap, sin
  Escape, sin restauración de foco), **Table** (cuatro `<table>` crudos con tres
  `min-w-` distintos), **Skeleton** (`grep animate-pulse` → 0) y **Tooltip** (los
  botones de icono usan `title=` nativo). [M]
- **Ningún tamaño de botón alcanza 44×44 px.** `button.tsx:22-34`: default 32 px,
  `sm` 28, `icon-sm` 28 — y ese es justo el que borra un módulo. En un producto
  que se usa en móvil, fallar el target táctil se siente barato antes de que el
  usuario razone por qué. **P0.** [M]
- **27 `<button>` crudos** fuera de `ui/`, y **ninguno hereda** el
  `focus-visible:ring-3` de `button.tsx:7`. Son navegables por teclado sin
  indicador visible. [M]
- **Emoji como iconografía** en los 12 módulos (`types.ts:289-353`), más `⠿`,
  `🗑`, `←`, `↗`, `📱`, `🖥`. `lucide-react` **ya está instalado y usado en 5
  componentes de producto**. Los emoji no heredan color ni grosor del tema y
  cambian de forma entre sistemas operativos. [M]
- **`error.tsx`: cero en todo el proyecto.** Una excepción en el dashboard, el
  admin o el check-in muestra la pantalla genérica de Next: en producción, una
  página en blanco con "Application error". **P0.** [M]
- **Un solo `loading.tsx`**, y su contenido íntegro es el texto
  `"Cargando editor…"`. [M]
- **Once estados vacíos, once párrafos de texto gris.** Cero icono, cero
  ilustración, cero acción dentro del contenedor. Y uno de ellos filtra jerga de
  desarrollo al cliente que paga: *"No hay plantillas disponibles. Ejecuta la
  migración de seed de plantillas."* (`templates/page.tsx:55`). [M]
- **No hay sidebar** — el dashboard es un header `max-w-5xl`. Y `globals.css`
  define **16 tokens `--sidebar-*` usados 0 veces**: hay tokens de un componente
  que nunca se construyó. [M]
- **Confirmación de borrado con `window.confirm()`** nativo, en dos sitios. [M]
- **Un error de ortografía visible al usuario**: "Púlsa" (`publish-controls.tsx:22`). [M]

### 2.4 El sistema de temas

Seis variables `--inv-*` (`theme.ts:155-171`): primary, secondary, bg, text, card,
space. Eso es todo el "diseño" de una invitación. No hay escala tipográfica, ni
radio, ni sombra, ni tokens semánticos, ni tema por sección. [M]

- **`FONT_STACKS` declara 4 familias y solo 3 son webfont**: `serif` es
  `Georgia, "Times New Roman"` — la del sistema. [M]
- **Toda la invitación usa UNA familia**, fijada una vez en la raíz
  (`theme.ts:170`). Por eso el pack `floral-romantico` pinta Dancing Script
  también en la dirección y en el formulario de RSVP. **Cero pairings display +
  cuerpo**, que es la regla básica de la papelería. [M]
- **Los 10 títulos de módulo son la misma línea copiada** — `previews.tsx` en las
  líneas 158, 217, 244, 285, 333, 367, 410, 447, 492 y 529, las diez idénticas:
  `text-lg font-semibold`. El hero es `text-3xl font-bold tracking-tight`.
  Relación display/cuerpo **1.7:1**; la papelería real usa 4:1 a 6:1. [M]
- **11 de 20 theme packs fallan contraste AA** en el CTA (blanco sobre
  `--inv-primary`). `boda-lujo`, el pack que vende el plan caro, está en **3.09**.
  Y `hexColor` (`theme.ts:9-11`) valida el formato, **nunca la legibilidad**. [M]
- **`previewImageUrl` nunca se pobló** — y el hallazgo más incómodo: la columna
  `preview_image_url` **existe en la BD desde la primera migración**
  (`0001_initial_schema.sql:49`), y el `SELECT` del catálogo
  (`templates/page.tsx:28`) **ni siquiera la pide**. [M]

### 2.5 Las tres superficies, medidas

**Landing** (`sobrely.com`, en vivo): **3 encabezados en toda la página**, **0
imágenes**, y la sección de preguntas frecuentes ocupa el **46% de la altura**. De
los 13 bloques que un landing de este producto necesita (hero, plantillas, tipos
de evento, editor, cómo funciona, features, ejemplos, RSVP, invitados, pricing,
testimonios, FAQ, CTA), existen **tres**. [M]

**Panel**: 108 de 143 usos tipográficos son ≤14 px (`text-xs` ×70, `text-xl` ×1).
No existe el nivel "encabezado de sección". `font-bold` ×26 supera a
`font-semibold` ×15 — cuando todo es negrita, nada tiene jerarquía. [M]

**Invitación pública**: es la parte mejor resuelta. Contenedores `@container/inv`,
escalas responsivas reales, y la PoC del canvas usa `cqw` en vez de `vw`, que es
la decisión correcta. Sus problemas son de sistema (§2.4), no de layout. [M]

### 2.6 Pricing — el problema no es el precio, es el relato

Precios en vivo: Free · Esencial **$199** (de $299) · Celebración **$399** (de
$499, "Más elegido") · Premium **$699** (de $899). Cero imágenes en la página. [M]

Los planes están redactados como **desbloqueo de funciones**: *"Módulos básicos"*,
*"Galería, Itinerario, Dress code y Música"*, *"Sin branding de Sobrely"*. Es
literalmente la frase que el dueño no quiere que el usuario piense.

Y el diferenciador real —**"Invitados nominales con link único y QR de acceso"**—
está enterrado como **quinta viñeta del plan más caro**. Invitio no tiene eso y
cobra $599.

---

## 3. Inventario KEEP / IMPROVE / REFACTOR / REPLACE / NEW

### KEEP — funciona y diferencia

| Área | Razón |
|---|---|
| Motor de animación (`animations.css`, `src/lib/animation/*`) | Compositor puro, reduced-motion real, degradación sin JS. Mejor que casi todos los competidores. |
| `src/app/**` como Server Components (0 `"use client"`) | Arquitectura correcta ya lograda. |
| RSVP + lista nominal + QR + check-in + libro de firmas | El motor de valor que Canva e Invitio no tienen. |
| Pago por evento con gate en la publicación | El usuario paga cuando ya invirtió esfuerzo. |
| Enforcement server-side de entitlements + RLS | Dominio crítico, ya cubierto. |
| `invitation_modules` con `sort_order`/`is_visible`/`config` | Ya es una tabla de secciones: **cero migraciones** para el editor nuevo. |
| Fracciones 0–1 para posición de stickers | Modelo responsive correcto y probado. |
| Esquemas de lectura vs escritura separados | Razonamiento explícito y correcto sobre retro-compatibilidad. |
| Firma de webhook de Mercado Pago verificada + test | Dominio dinero, cubierto. |
| SEO: 5 landings por tipo de evento, JSON-LD, sitemap | Canal de adquisición ya construido. |
| **Scroll continuo y responsive de la invitación** | Ver §4: es una **ventaja** sobre Invitio, no un atraso. |

### IMPROVE — existe y está bien, le falta acabado

Theme packs (faltan miniaturas y gate de contraste) · Preview del editor (zoom y
paginador) · Barra superior del editor (título editable en línea) · Paleta de
módulos (iconografía real) · Los 11 estados vacíos · `saveEditor` (N+1 y sin
control de concurrencia) · `button.tsx` (faltan tamaños táctiles) · Admin (existe,
con gate correcto; el UI son tablas crudas) · Landing y pricing.

### REFACTOR — la forma actual bloquea el rediseño

Estado del editor (8 `useState` → reducer con documento único y pila) ·
Selección (dos sistemas → uno) · `config-editors.tsx` + `previews.tsx` (dos
`switch` → registry con code-splitting) · `parseConfig` (descarta la config entera
en silencio; debe hacer merge campo a campo) · `EditorModule.config` (sin tipo
discriminado, un panel genérico es imposible) · Tokens `--inv-*` (6 → escalas) ·
Layout del editor (2 columnas + tabs → riel + canvas + inspector) · z-index
implícito por orden de array (debe ser un campo del dato).

### REPLACE — los cuatro, con justificación

| Qué | Por qué se reemplaza, no se elimina |
|---|---|
| `window.confirm()` → `AlertDialog` | La función se conserva íntegra. Se reemplaza un diálogo del navegador, sin estilo, que en algunos navegadores sale en inglés. Cero pérdida funcional. |
| Modal de upgrade a mano → `Dialog` | Mismo contenido y mismo flujo de checkout. Se gana focus trap, Escape y restauración de foco, que hoy **no existen**. Es un fallo de accesibilidad, no una preferencia estética. |
| Emoji de módulo → `lucide-react` | La librería **ya está instalada y en uso**. Los emoji no heredan color ni tamaño y cambian entre sistemas operativos: es inconsistencia técnica. Se puede conservar el emoji como decorativo en superficies públicas si se prefiere. |
| Tres `<table>` crudos → primitiva `Table` | Los datos y las columnas no cambian; se unifica un scroll horizontal que hoy tiene tres valores distintos. |

### NEW — no existe y hace falta

`error.tsx` (raíz, dashboard, editor, admin) y `not-found.tsx` raíz · ~22
primitivas, empezando por Dialog / AlertDialog / Skeleton / Table / Tooltip /
Slider · Undo/redo · Autosave + guardia de navegación · Tokens semánticos y
escalas · Gate de contraste en `themeSchema` · Miniaturas reales de plantillas y
packs · Zoom y paginador de secciones · Tamaños de botón ≥44 px · Onboarding ·
Micro-animaciones en el panel · Optimistic locking en `saveEditor`.

---

## 4. Benchmark

### 4.1 El competidor de referencia: Invitio

Verificado en vivo en `invitio.events/es-MX` y sobre la captura del editor que
aportó el dueño. [V][M]

**Su editor**, tal como se observa: barra superior con título editable en línea
(tipo de evento + nombres, cada uno con lápiz) y la fecha como chip; undo/redo;
"Vista previa" y "Continuar". Riel izquierdo de **7 entradas**: Plantillas,
Elementos, Figuras, Imágenes, Animación, Secciones, Capas. Panel desplegable con
plantillas **en miniatura real**. Canvas central con una tarjeta vertical a
sangre. Barra inferior con **zoom por slider al 100%** y paginador
**"Sección 1 de 3"**.

**Su landing**, en orden: hero con badge de WhatsApp, H1 con palabra acentuada en
color, **4.8/5 y "Miles de invitaciones creadas"**, doble CTA, y una **imagen de
producto** (sobre con sello de lacre + teléfono con una invitación dentro) → 6
tipos de evento con ejemplos → testimonio con nombre → **"Invitio presente en más
de 106,416 eventos"** con contadores → "¿Cómo crear una invitación?" en 5 pasos →
upsell → CTA "Empieza gratis, sin tarjeta de crédito" → precios. [V]

**Sus precios**, textuales de su propia página: Plan básico $0 (máximo 5
invitados, **20 vistas**, **"3 secciones de 900px en la invitación"**, marca de
agua) · **Premium $599 MXN pago único** · **Planner $799 MXN/mes** (15 eventos
concurrentes, colaboradores, perfil público) · **Álbum Digital $599 pago
único**. [V]

**Dos ventajas de Sobrely que este benchmark confirma, y que el rediseño no debe
tirar:**

1. **Invitio renuncia al responsive.** Lo dice su propia página de precios: *"3
   secciones de 900px"*. De ahí el zoom y el paginador. **Sobrely hace scroll
   continuo y es responsive**, y una invitación se abre en el teléfono. Adoptar
   su lienzo fijo sería un retroceso.
2. **Invitio destruye tu contenido al cambiar de plantilla.** Su propio aviso lo
   admite: *"Al aplicarla, los cambios actuales no se guardarán."* Si Sobrely
   conserva el contenido al cambiar de plantilla, es un argumento de venta
   directo y barato.

**Y features que Invitio vende y Sobrely no tiene:** mesas, control de
presupuesto del evento, autoregistro con restricciones alimentarias.

### 4.2 Tabla comparativa

Solo filas con evidencia verificada. Lo no verificado va en §7.

| Producto | URL | Categoría | Editor | Templates | RSVP / Invitados | Pricing | Qué aprender |
|---|---|---|---|---|---|---|---|
| **Invitio** | invitio.events [V] | MX, directo | Canvas fijo 900px, 7 paneles, capas, zoom, secciones paginadas | Miniaturas reales, nombres propios | RSVP, mesas, presupuesto | $0 / $599 único / $799 mes / Álbum $599 | Anatomía del editor; prueba social; **no** copiar el lienzo fijo |
| **Invita+** | invitaplus.mx [V] | MX, directo | Constructor drag-and-drop, 17 bloques | — | RSVP individual **o familiar**, QR por invitado, mesas, check-in | **$249 / 100 invitados** | Ancla de precio agresiva; **QR y check-in no son diferenciador exclusivo** |
| **Casa Convite** | casaconvite.com [V] | MX | — | — | QR por familia | desde $390 | Self-host + tokens propios; **la unidad es la familia, no la persona** |
| **Riley & Grey** | rileygrey.com [V] | Premium US | — | Editorial | — | alto | Se ve carísimo **sin una sola ilustración**: puro editorial |
| **Paperless Post** | — [S] | Premium US | — | Catálogo licenciado | — | — | El valor está en el arte comprado y en el **ritual de apertura del sobre** |
| **Greenvelope** | greenvelope.com [V] | Premium US | — | Texturas, sello de cera | Preguntas custom, **envío de prueba** | por invitado | *"No hay estante premium donde los buenos diseños cuesten más"* |
| **RSVP PRO** | rsvp-pro.mx [V] | MX, servicio | — | — | **RSVP Concierge**: 4 rondas de seguimiento humano | — | El dolor del seguimiento es real y **nadie lo ha automatizado** |
| **Zankyou MX** | → bodas.com.mx [M] | — | — | — | — | — | **Ya no existe** como producto separado (301) |

### 4.3 Patrones de editores y SaaS premium

**El hallazgo estructural**: Wix Studio resuelve exactamente el problema de
Sobrely —secciones full-width apiladas— y **no depende del drag** para reordenar:
expone `Move Up` / `Move Down` en el menú. [V] Para bloques altos, dos botones son
mejor UX que arrastrar. Sobrely ya tiene drag; le faltan los botones.

**El patrón más adoptable es el de bloques de Notion**, porque es el más cercano
a un editor modular:

- Notion tiene **dos** affordances en el margen, no una: el `+` inserta *en esa
  posición*, y el `⋮⋮` arrastra **o** abre un menú. [V] Sobrely tiene un `⠿` que
  solo arrastra y un "+ Agregar módulo" global que siempre añade al final.
- Su menú mapea casi 1:1 a los módulos: Duplicar (trivial, altísimo valor en
  itinerario y galería), Mover arriba/abajo, **Eliminar escondido en el menú** —
  hoy en Sobrely es un `🗑` siempre visible a un clic, sin undo.
- Atajos que se copian literales y gratis: `cmd+D` duplicar,
  `cmd+shift+↑/↓` mover, `esc` seleccionar, `backspace` eliminar, `?` para ver los
  atajos. [V]

**Valores de sistema extraídos de bundles de producción** (no de reseñas) [V]:

- **Linear**: cuerpo 15 px/1.6 con `letter-spacing -.011em`; micro 11 px; pesos
  no redondos **400 / 510 / 590 / 680**; grises **tintados** `#282a30`, `#6f6e77`,
  `#e9e8ea`; radios 4/6/8/12/16/24/32; motion 100 / 160 / 250 ms con
  `cubic-bezier(.23,1,.32,1)`. **La regla que casi nadie copia**: el tracking se
  vuelve más negativo conforme sube el tamaño (−.011em a 15 px → −.022em a 32 px)
  y llega a 0 en micro. Y **en modo oscuro apaga las sombras** y usa solo bordes.
- **Vercel Geist**: cada sombra flotante es **borde de 1px + 2 a 4 capas** con
  offsets y blur crecientes. Nunca una sombra sola.
- **Stripe**: la sombra lleva **tinte azul** (`#003770`), no negro — por eso se
  siente menos sucia.
- **Notion**: pesos variables no redondos también (420/520/620/680), lo que
  confirma que es práctica sistémica y no una rareza de Linear.

**Regla derivada**: nada por encima de **300 ms** en controles del editor; los
>300 ms son para la invitación renderizada.

**Advertencia crítica sobre el chrome**: el editor necesita **su propia escala de
color fija**, independiente del tema de la invitación. Con `ThemeScope` ya
existente hay riesgo real de que el panel se tiña cuando alguien elija un tema
rosa.

### 4.4 Lo que Sobrely debe EVITAR

Canvas libre con X/Y y snapping (contradice la arquitectura y multiplica los
estados rotos en móvil) · Sistema de 3–4 breakpoints (una invitación es un scroll
móvil; el toggle que ya existe basta) · **Lienzo de altura fija tipo Invitio** ·
Capas anidadas y z-index (el documento es plano) · Historial con timeline en el v1
· Zoom real del canvas · Grises neutros puros (`#666` se ve barato; Linear los
tinta) · Una sola `box-shadow` · Sombras en modo oscuro · `transition: all` ·
Transiciones >300 ms en el panel · El "Turn into" universal de Notion (convertir
`rsvp` en `countdown` no tiene semántica; solo pares compatibles) · **Modelar
`Guest` como persona suelta** (en México la unidad es la familia, y cambiarlo
después toca QR, check-in y conteo a la vez) · Recursos con atribución obligatoria
(Freepik/Vecteezy/Noun Project gratis son deuda legal en un producto de pago).

---

## 5. Los tres conceptos

Los tres asumen el **Paso 0** de §6 (arreglar la fuente, el contraste del CTA y
los targets táctiles), que no es una dirección de diseño sino reparar lo roto.

Los tres se diferencian en **apuesta estratégica**, no en paleta.

### Concepto A — MINIMAL LUXURY

> **Tesis:** la invitación debe sentirse como papelería fina y el panel como una
> herramienta moderna; hoy comparten la misma estética indecisa y eso abarata las
> dos.

| | |
|---|---|
| **Display** | Cormorant Garamond 300 (OFL 1.1) — nadie en el nicho MX la usa: Fraunces la tiene Invita+, EB Garamond Casa Convite |
| **Cuerpo invitación** | EB Garamond / Jost (OFL 1.1) |
| **Chrome** | Instrument Sans (eje de ancho: condensa la tabla de invitados sin cambiar de familia) |
| **Script** | Pinyon Script o Ephesis — **retirar Dancing Script**, la fuente más asociada a "invitación gratis" |
| **Color** | Papel `#faf7f2`, tinta `#1c1a17` (16.25:1), acentos AA: borgoña `#6d2b3a`, verde `#2f5d4a`. Oro `#d4af37` **solo con tinta encima** (8.26), nunca con blanco (2.10) |
| **Forma** | Radios 4/8/12 por rol; bordes hairline tintados; **sin sombras** salvo overlays; escala display/cuerpo 4:1 |
| **Invitación** | Cinco niveles de jerarquía (nombres, línea de invitación en versalitas con tracking .28em, fecha escrita con letra, lugar, letra chica), filetes, fleurones Unicode, textura de grano con `feTurbulence` (380 bytes, cero arte) |
| **Editor** | Chrome neutro y silencioso para que el canvas mande |
| **Costo** | ~20 h. **Riesgo: toca `theme-packs.ts`, que afecta invitaciones publicadas en producción.** Requiere retro-compatibilidad por defecto |

### Concepto B — MODERN EDITORIAL

> **Tesis:** lo que se ve amateur no es la invitación —eso lo controlan los
> packs— sino la herramienta; y como el mercado ancla en $249 pago único, el panel
> es lo único que justifica $699.

| | |
|---|---|
| **Sistema** | Trasplante de los valores medidos de Linear: cuerpo 15/1.6 −.011em, micro 11, títulos 17/20/24/32; pesos 400/510/590/680; grises tintados; radios 4/6/8/12/16; hairline 1px; 100/160/250 ms con ease-out-quint |
| **Tipografía** | Geist (**ya cargada y hoy sin usar**) + Geist Mono para folios y códigos QR |
| **Dashboard** | Sidebar real (los 16 tokens `--sidebar-*` **ya están definidos** y sin usar), menú de cuenta con avatar en vez del email crudo en un `<span>`, tabla densa de invitados, skeletons, ⌘K |
| **Editor** | Topbar 52 px con título editable en línea y estado de guardado · riel izquierdo 300 px con outline de módulos y gutter `+`/`⋮⋮` · **canvas al centro, protagonista** · inspector derecho 320 px con el nombre del módulo en el header · barra inferior con móvil/escritorio |
| **Invitación** | **No se toca** |
| **Costo** | ~35 h. **Riesgo bajo: no altera ninguna invitación publicada.** Superficie amplia, riesgo de regresión visual, pero no toca dinero ni datos |

### Concepto C — CREATIVE PREMIUM

> **Tesis:** el producto no se ve pobre por sus tokens sino porque **no enseña
> nada de lo que hace**.

| | |
|---|---|
| **Tipografía** | Bodoni Moda (display, solo ≥40 px) + Geist |
| **Color** | Negro `#111111` sobre hueso `#f4f1ea` (16.74:1); radio 0–4 px; cero sombras; **la imagen manda** |
| **Landing** | Hero con rejilla real de invitaciones en vez del muro de texto actual; prueba social; los 13 bloques |
| **Catálogo** | Las 50 plantillas con miniatura a sangre, filtros por estilo y categoría, favoritos — marketplace, no lista |
| **Dashboard** | Cada tarjeta de invitación con preview real |
| **Costo** | Código 12–16 h. **Arte: 50 miniaturas + 20 previews de pack** |
| **Honestidad** | **Es la de mayor retorno visual y la única que no se puede empezar hoy.** Pero las miniaturas se generan con Playwright en CI a partir del render público que ya existe: **es arte generado por código, no comprado** |

---

## 6. Recomendación

**Paso 0 primero, luego B, luego A, y C en cuanto existan las miniaturas.**

**Paso 0 — reparar lo roto (~6 h, no es diseño).** Arreglar
`globals.css:10` · añadir `--inv-cta` derivado de `primary` oscurecido hasta 4.5:1
y usarlo en los tres botones que hoy hardcodean `text-white`, con **tratamiento de
contorno** para los pasteles donde oscurecer destruye la identidad (`kawaii`
tendría que irse de rosa pastel a magenta) · piso táctil de 44 px · los cuatro
`error.tsx`. Esto va **con o sin** rediseño aprobado.

**Luego B**, por tres razones en orden de peso:

1. **Es donde está el dinero.** Invita+ ofrece drag-and-drop, RSVP familiar, QR,
   mesas y check-in **por $249**. Sobrely no gana esa comparación por la lista de
   features. La gana por **calidad de la herramienta**, y hoy la herramienta es lo
   que peor se ve.
2. **Ningún competidor mexicano lo hizo.** Los cinco que se inspeccionaron usan
   estética nupcial en el panel. Attio y Withjoy demuestran que separar las dos
   personalidades —marca editorial afuera, herramienta neutra adentro— es lo que
   distingue a un producto serio.
3. **Es la de menor riesgo.** No toca `theme-packs.ts`, así que **no altera ni una
   invitación publicada**. A sí lo hace, con 12 invitaciones y 11 usuarios reales
   en producción, y por eso no debería ir primera.

A queda como segunda fase natural: reusa los tokens que B instala. C se desbloquea
en cuanto las miniaturas existan, y su generación por CI puede correr en paralelo
desde el día uno porque **no depende de ninguna de las otras dos**.

---

## 7. Roadmap propuesto

Cada fase se detiene al terminar. Nada avanza sin aprobación explícita.

| Fase | Objetivo | Criterio de aceptación | Riesgo |
|---|---|---|---|
| **0. Reparar** | Fuente, contraste del CTA, targets 44 px, `error.tsx` | `getComputedStyle(body).fontFamily` = Geist **en producción**; los 20 packs pasan AA medido | Ninguno. Independiente del rediseño |
| **1. Design system** | Tokens del chrome (escala, pesos, radios, sombras, motion) **separados** del tema de la invitación; 8 primitivas nuevas | Cero `<button>` crudos; contraste validado en CI | Medio: superficie amplia |
| **2. Editor — estructura** | Riel + canvas + inspector; gutter `+`/`⋮⋮`; duplicar; mover arriba/abajo; iconos lucide | El inspector deja de estar anidado; el preview se monta una sola vez | Alto: es el corazón del producto |
| **3. Editor — seguridad de datos** | Reducer con documento único; undo/redo; autosave con debounce; guardia `beforeunload`; confirmación de borrado; optimistic locking | `cmd+Z` funciona; cerrar la pestaña no pierde nada; dos pestañas no se pisan | Alto. **Prerrequisito de todo lo demás del editor** |
| **4. Miniaturas** | Playwright en CI genera las 50 plantillas y los 20 packs; poblar `preview_image_url` (la columna **ya existe**) | El catálogo muestra imágenes reales | Bajo. Puede ir **en paralelo desde el día uno** |
| **5. Dashboard** | Sidebar (tokens ya definidos), KPIs en portada, tarjetas con miniatura, 11 estados vacíos, skeletons | Ningún estado vacío es un párrafo gris suelto | Bajo |
| **6. Onboarding** | Tipo de evento → plantilla → datos base → editor | El usuario no aterriza en el editor completo de golpe | Bajo |
| **7. Theme System** | `--inv-*` de 6 a ~24 tokens; pairing display+cuerpo; 4 estilos de papelería; gate de contraste | Los 20 packs × 4 estilos = 80 combinaciones sin arte nuevo | **Alto: toca invitaciones publicadas** |
| **8. Landing y pricing** | Los 13 bloques; prueba social; el relato de precio pasa de "desbloquea funciones" a "invitación profesional" | El QR nominal deja de ser la quinta viñeta | Bajo |
| **9. Admin y plantillas** | Gestión de plantillas: crear, duplicar, publicar, versionar | — | Medio |
| **10. Mobile, performance, QA** | `next/image` (hoy **0 usos**), code-splitting del editor, responsive del editor | — | Medio |

**Dependencia dura:** la Fase 3 (seguridad de datos) debería ir **antes o junto**
con la Fase 2. Hoy un clic en un botón de 28 px borra un módulo sin confirmación y
sin undo; hacer el editor más manipulable **antes** de tener red de seguridad
aumenta la probabilidad de pérdida de datos de un usuario real.

---

## 8. Lo que NO se pudo verificar

- **No abrí el editor de Invitio autenticado.** Lo que digo de sus paneles
  Elementos, Figuras, Animación, Secciones y Capas sale de la captura del dueño y
  de su página de precios, no de usarlo. El benchmark de competidores quedó
  incompleto: un tercer agente de investigación fue bloqueado por el límite de
  agentes por turno.
- **Canva quedó sin fuente.** `canva.com/help` devuelve 403 al fetch
  automatizado, igual que en la investigación previa. No se escribe nada de
  memoria sobre su sistema de "Estilos". Adobe Express: timeout, sin verificar.
- **Paperless Post, The Knot y bodas.com.mx bloquearon el fetch** (406/403). Lo
  poco que se dice de ellos es `[S]`.
- **No medí el bundle en KB.** El peso se infirió del tamaño de los archivos
  fuente.
- **Los conteos tipográficos y los cálculos de contraste** los produjo la
  investigación previa; se verificó de forma independiente la **causa
  estructural** (que `hexColor` no valida contraste y que no existen
  `--success`/`--warning`), no cada número.
- **Discrepancia menor sin resolver**: `<button>` crudos fuera de `ui/` — un
  barrido contó 26 y otro 27, sobre refs distintos.
- **Los valores CSS de Linear, Vercel, Notion y Stripe** salen de sus *marketing
  sites*. Sus apps autenticadas podrían usar otros tokens.
- Loom, Arc, Superhuman y Slack **no se investigaron**.
- **No se consultó ni escribió nada en el brain**, por instrucción explícita del
  dueño.

---

## 9. Decisión pendiente

Este documento se detiene aquí. `REDESIGN_PLAN.md` —con el detalle por fase:
objetivo, alcance, componentes, archivos afectados, riesgos, dependencias y
criterios de aceptación— **no se escribe hasta que el dueño responda
"APROBADO"**.

Tres preguntas que conviene contestar antes, porque cambian el plan:

1. **¿Se mergea el Paso 0 a `main` ya?** Es un bug de producción vivo,
   independiente de todo lo demás.
2. **¿B primero o A primero?** La recomendación es B por riesgo y por dinero,
   pero A es lo que el dueño describió cuando dijo "las plantillas se ven
   premium".
3. **¿Hay presupuesto de arte, o la Fase 4 se hace 100% con Playwright?** La
   respuesta cambia si C es alcanzable este trimestre.
