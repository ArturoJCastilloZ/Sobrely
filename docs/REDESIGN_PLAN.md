# Sobrely — Plan de rediseño

> **Aprobado el 2026-09-07.** Deriva de `DESIGN_RESEARCH.md`, que es su fundamento
> y no se repite aquí: si una decisión de este plan te parece arbitraria, su
> evidencia está allá.
>
> **Regla de ejecución, absoluta:** cada fase **se detiene al terminar**. Ninguna
> fase arranca la siguiente automáticamente, ni siquiera si sobra tiempo. Nunca se
> asume aprobación.
>
> **Actualizado el 2026-09-08:** añadida la **Fase 11 — Research V2** (assets
> visuales por evento) a petición del dueño. Son doce fases, 0–11. La Fase 4
> quedó CERRADA ese día: miniatura a sangre, filtros por tipo de evento,
> búsqueda y favoritos con RLS atacada cláusula por cláusula. El filtro por
> ESTILO se descartó con el dueño porque **no hay dato** — medido, las 13 artes
> de la `0030` viven cada una dentro de un solo tipo de evento, así que como
> faceta paralela daría 0 resultados en la mayoría de combinaciones.

---

## 0. Reglas que gobiernan todo el plan

Estas no son preferencias; son las condiciones bajo las que este código vive.

| Regla | Qué implica en la práctica |
|---|---|
| **Producción es la única base de datos.** 11 usuarios y **14** invitaciones reales (medido el 2026-09-08; eran 12 el 09-07). De ellas **sólo CUATRO están PUBLICADAS** — el «12» de versiones anteriores de este doc era el total, no las públicas. | Ninguna fase siembra datos sin nombrar explícitamente el `user_id` del dev (`d1f1dc44-aca7-4a96-8fd8-0b97242940f6`). Nunca un `limit 1`. |
| **Las migraciones las corre el dev a mano.** | Ningún commit con migración entra a `main` antes de que su SQL esté aplicado. El commit puede existir en la rama; lo que espera es el merge. |
| **Nada llega a `main` sin petición explícita del dev.** | Se entrega en rama y se pushea para que él pruebe. El fast-forward, cuando lo pida, se hace en el servidor con `git push origin <rama>:main` si su checkout tiene la rama tomada. |
| **RLS no está terminada hasta atacarla con la llave pública**, cláusula por cláusula, incluido el caso legítimo. | Aplica a cualquier fase que toque políticas. |
| **Cero phone-home.** | `next/font/google` sirve porque auto-hospeda en build (verificado). Nada de CDNs en runtime, nada de fuentes remotas, nada de recursos con atribución obligatoria. |
| **Ninguna funcionalidad se elimina.** | Los cuatro REPLACE del inventario van con justificación; el resto es KEEP / IMPROVE / REFACTOR / NEW. |
| **Verificación por efecto observado.** | "Compila y pasan los tests" no cierra una fase. Cierra el output del comando o la medición que prueba el cambio en vivo. |
| **Una rama de trabajo, empujada conforme avanza.** | Para que el dev pruebe sin esperar al final. |

**Convención de criterios de aceptación.** Cada fase cierra con evidencia
**medible**, no con una opinión. Donde diga "medido", significa un comando o una
lectura del navegador cuyo output se pega en el cierre.

---

## Fase 0 — Reparar lo roto

> **No es diseño. Es un bug de producción vivo.** Esta fase se puede ejecutar y
> mergear con independencia de todo lo demás, y debería.

**Objetivo.** Que la app deje de renderizarse en Times New Roman, que ningún CTA
sea ilegible, que ningún control destructivo mida menos de 44 px, y que una
excepción no muestre una página en blanco.

**Alcance — dentro:**
1. `--font-sans` deja de auto-referenciarse. **Ya está hecho** en `32a9efa`, en la
   rama de trabajo, sin mergear.
2. Token `--inv-cta` derivado de `primary`, oscurecido hasta cumplir 4.5:1 con
   blanco, aplicado en los tres botones que hoy hardcodean `text-white`.
   **Con dos tratamientos, no uno:** para los pasteles muy claros (`kawaii`,
   `baby-revelacion`) oscurecer destruye la identidad del pack —`#f7a8c4` tendría
   que irse a `#e5105b`, de rosa pastel a magenta—, así que esos usan **CTA de
   contorno**: tinta oscura del pack sobre un tinte claro de `primary`.
3. `size="touch"` (h-11 = 44 px) en `button.tsx`, aplicado a los CTAs primarios y
   a **todo control destructivo**.
4. `error.tsx` en raíz, dashboard, editor y admin; `not-found.tsx` en raíz.

**Alcance — fuera:** migrar los 27 `<button>` crudos (eso es Fase 1); rediseñar
nada.

**Componentes.** `Button` (tamaño nuevo), `ErrorBoundary` de ruta ×4.

**Archivos afectados.** `src/app/globals.css` · `src/lib/theme/theme.ts`
(`themeCssVars`, y `hexColor` gana una función de contraste) ·
`src/components/ui/button.tsx` · `src/components/public/public-rsvp-form.tsx:243`
· `src/components/public/guest-response-panel.tsx:159` ·
`src/components/modules/signature-wall.tsx:138` · 4 `error.tsx` + 1
`not-found.tsx` nuevos.

**Riesgos.** Bajo. El único real: `--inv-cta` cambia el color de un botón en
**invitaciones ya publicadas**. Mitigación: el token se deriva, no se guarda, así
que no hay dato que migrar y es reversible con un revert.

**Dependencias.** Ninguna. Es la raíz del árbol.

**Criterios de aceptación.**
- En **producción**, `getComputedStyle(document.body).fontFamily` devuelve Geist,
  no Times. Medido en el navegador, no en local.
- Los **20** theme packs pasan 4.5:1 en el CTA. Se pega la tabla de los 20 con su
  ratio calculado, no una muestra.
- Ningún control destructivo mide menos de 44 px, medido con
  `getBoundingClientRect()`.
- Una excepción provocada a propósito en el dashboard muestra la pantalla de
  error propia, no la genérica de Next.

---

## Fase 1 — Design system

**Objetivo.** Que exista un sistema, y que el chrome del editor **no pueda ser
teñido** por el tema de la invitación.

**Alcance — dentro:**
- Tokens del chrome, **namespace propio `--ed-*`**, deliberadamente separados de
  `--inv-*`: escala tipográfica (11/13/15/17/20/24/32 con su line-height y su
  tracking negativo creciente), pesos 400/510/590, radios 6/8/12, sombras
  compuestas (borde 1px + capas), motion 100/160/250 ms.
- Tokens semánticos `--success` / `--warning` / `--danger` / `--info`, que hoy no
  existen, y migración de los 75 colores crudos de Tailwind.
- Ocho primitivas: **Dialog, AlertDialog, Tooltip, Popover, Skeleton, Table,
  Alert, Avatar**.
- Componente `EmptyState` (icono + título + explicación + acción **dentro** del
  contenedor).
- Migración de los 27 `<button>` crudos a `Button`, y regla de lint que prohíba
  `<button>` fuera de `src/components/ui/`.
- Iconografía: `MODULE_META.icon` pasa de emoji a componentes de `lucide-react`,
  que ya está instalado.

**Alcance — fuera:** tocar `--inv-*` o `theme-packs.ts`. Eso es Fase 7, y es la
fase que toca invitaciones publicadas.

**Componentes.** Los 8 primitivos + `EmptyState` + `Button` extendido.

**Archivos afectados.** `src/app/globals.css` (bloque de tokens nuevo) ·
`src/components/ui/*` (8 archivos nuevos) · `src/lib/modules/types.ts:289-353`
(iconos) · los 20 archivos con `<button>` crudo · `eslint.config.*`.

**Riesgos.** **Medio-alto por superficie**: toca casi todo `src/components`. Alta
probabilidad de regresión visual. No toca dinero ni datos, así que el gate de
dominio crítico no aplica. Mitigación: migrar por superficie (dashboard →
editor → público), no por tipo de componente, para poder revisar pantalla por
pantalla.

**Dependencias.** Fase 0.

**Criterios de aceptación.**
- `grep -rn "<button" src --include="*.tsx" | grep -v ui/` devuelve **0**.
- Cero colores crudos de Tailwind fuera de la definición de tokens.
- El foco es visible en **todo** elemento interactivo, verificado navegando la
  app entera con Tab.
- Un script de contraste corre en CI y falla el build si un par token/fondo no
  llega a AA.
- Los 11 estados vacíos usan `EmptyState`. Ninguno es un párrafo gris suelto.

---

## Fase 2 — Editor: seguridad de datos

> **Va ANTES que la reestructura visual, y esto es una inversión deliberada
> respecto al orden intuitivo.** Hoy un clic en un botón de 28 px borra un módulo
> sin confirmación y sin retorno, y cerrar la pestaña pierde el trabajo. Hacer el
> editor más manipulable **antes** de tener red de seguridad aumenta la
> probabilidad de que un usuario real pierda su invitación.

**Objetivo.** Que sea imposible perder trabajo en el editor.

**Alcance — dentro:**
- Los 8 `useState` sueltos (`invitation-editor.tsx:85-99`) se unifican en **un
  documento** con `useReducer`. Las 8 mutaciones ya están centralizadas en
  funciones, así que es contenido, no arqueología.
- Pila de undo/redo con `⌘Z` / `⌘⇧Z`, como middleware del reducer.
- Autosave con debounce + guardia `beforeunload`. **El botón Guardar desaparece**,
  y con él el modelo de dos pasos en que Guardar y Publicar se bloquean
  mutuamente.
- Confirmación al borrar un módulo (`AlertDialog` de la Fase 1).
- `saveEditor`: los N UPDATE secuenciales pasan a un batch, y se añade
  **optimistic locking** contra `updated_at` — hoy dos pestañas se pisan en
  silencio.
- `parseConfig` deja de descartar la config entera cuando un campo no valida:
  hace merge campo a campo y reporta lo descartado.

**Alcance — fuera:** mover un solo píxel de la interfaz. Esta fase no se ve.

**Componentes.** `editorReducer` + `useHistory` + `useAutosave`.

**Archivos afectados.** `src/lib/invitations/editor-types.ts` (documento y
selección) · `src/components/editor/invitation-editor.tsx:85-260` ·
`src/lib/invitations/actions.ts:326-436` · `src/lib/modules/types.ts:364-372`
(`parseConfig`).

**Riesgos.** **Alto: es el corazón del producto.** El cambio de `parseConfig` es
el más delicado — endurecer o relajar la lectura es retroactivo sobre datos que ya
existen. Mitigación obligatoria: **antes de tocarlo, contar contra la BD cuántos
configs guardados no validan hoy**, y comprobar el efecto sobre esas filas. Sin
ese conteo no se toca.

**Dependencias.** Fase 1 (necesita `AlertDialog`).

**Criterios de aceptación.**
- `⌘Z` deshace las 8 mutaciones, verificado una por una contra la BD.
- Cerrar la pestaña con cambios pendientes avisa; y tras un autosave, recargar
  muestra el contenido guardado.
- **Dos pestañas abiertas sobre la misma invitación no se pisan**: la segunda en
  guardar recibe un conflicto y se le ofrece recargar. Verificado con dos
  ventanas reales, no razonado.
- Borrar un módulo pide confirmación, y `⌘Z` lo devuelve con su config intacta.
- El conteo de configs afectados por el cambio de `parseConfig` está documentado
  en el cierre, con su query.

---

## Fase 3 — Editor: estructura visual

**Objetivo.** Que el editor se lea como una herramienta de diseño: se ve **qué**
editas y **cómo**, a la vez.

**Alcance — dentro:**
- Layout de tres columnas: **riel izquierdo** (300 px, outline de secciones +
  accesos a Tema/Invitados/Ajustes al pie) · **canvas al centro, protagonista** ·
  **inspector derecho** (320 px) con el nombre del módulo en su header.
  Desaparecen los 5 tabs que hoy se truncan.
- **Topbar de 52 px**: título editable en línea, fecha como chip, estado de
  guardado, undo/redo, Vista previa, Publicar.
- **Gutter estilo Notion**: `+` entre secciones que inserta *en esa posición*, y
  menú `⋮` con Duplicar / Mover arriba / Mover abajo / Ocultar / Restablecer al
  tema / **Eliminar (al fondo, separado)**.
- Atajos literales de Notion: `⌘D`, `⌘⇧↑/↓`, `esc`, `backspace`, y `?` que abre la
  tabla de atajos.
- Barra inferior: toggle móvil/escritorio y paginador `Sección N de M` que hace
  `scrollIntoView` — **navegación, no modelo**: sin lienzo de altura fija.
- Click bidireccional: outline ↔ canvas.
- El preview se monta **una sola vez** (hoy son dos árboles vivos en escritorio) y
  gana un control explícito para reproducir las animaciones reales, en vez de
  forzar `trigger:"load"` y mostrar algo que no es lo que verá el invitado.
- Los dos `switch` gigantes pasan a un registry
  `Record<ModuleType, {Editor, Preview, meta, icon}>` con code-splitting.

**Alcance — fuera:** canvas libre, coordenadas X/Y, snapping, capas anidadas,
z-index, zoom real, breakpoints. Está argumentado en `DESIGN_RESEARCH.md` §4.4.

**Archivos afectados.** `src/components/editor/invitation-editor.tsx:311-545`
(reescritura del layout) · `preview-pane.tsx` · `sortable-module-item.tsx` ·
`module-palette.tsx` · `src/components/modules/config-editors.tsx` (999 líneas →
registry) · `previews.tsx` (670).

**Riesgos.** Alto. Es la reescritura más grande del plan. Mitigación: el registry
primero y por separado, con la interfaz vieja funcionando, y solo después el
layout.

**Dependencias.** Fase 2 (**dura**) y Fase 1.

**Criterios de aceptación.**
- El inspector es visible al mismo tiempo que el outline, en 1280 px y en 1440 px.
- El preview aparece **una sola vez** en el DOM en escritorio (medido con
  `querySelectorAll`).
- Los atajos funcionan y `?` los documenta.
- Insertar con el `+` del gutter coloca el módulo en esa posición, no al final.
- En un teléfono real, el editor no trunca ningún control.
- La animación mostrada en el preview es la misma que la de la invitación
  publicada, comparadas lado a lado.

---

## Fase 4 — Miniaturas de plantillas

> **Puede correr en paralelo desde el día uno: no depende de ninguna otra fase.**

**Objetivo.** Que la galería de un producto de diseño muestre diseños.

**Alcance — dentro:** job de CI con Playwright que renderiza cada plantilla y cada
theme pack contra el render público **que ya existe**, y puebla
`templates.preview_image_url` — **la columna existe en la BD desde la migración
`0001`** y hoy el `SELECT` del catálogo ni la pide. Rediseño del catálogo a
marketplace: miniatura a sangre, filtros por evento y estilo, búsqueda, favoritos.
Y reescribir el estado vacío que hoy dice *"Ejecuta la migración de seed de
plantillas"* a un cliente que paga.

**Alcance — fuera:** comprar arte. **Esta fase es arte generado por código.**

**Archivos afectados.** `.github/workflows/*` (job nuevo) · script de captura ·
`src/app/dashboard/templates/page.tsx:28` (el `SELECT`) y `:54-76` (la rejilla) ·
`src/lib/theme/theme-packs.ts` (poblar `previewImageUrl`) ·
`theme-pack-picker.tsx`.

**Riesgos.** Bajo. El único: el costo de almacenamiento de 70 imágenes, y que las
miniaturas queden desactualizadas si una plantilla cambia. Mitigación: regenerar
en cada cambio del seed.

**Dependencias.** Ninguna dura. Se ve mejor después de Fase 7, pero no la
necesita.

**Criterios de aceptación.** Las 50 plantillas y los 20 packs tienen miniatura
real, verificado contando filas con `preview_image_url IS NOT NULL` en la BD. El
catálogo carga en menos de 2 s con las imágenes optimizadas por `next/image`.

---

## Fase 5 — Dashboard

**Objetivo.** Que la pantalla de aterrizaje se sienta un sistema, no una lista.

**Alcance — dentro:** sidebar persistente — **los 16 tokens `--sidebar-*` ya están
definidos en `globals.css` y usados cero veces** · menú de cuenta con avatar, en
vez del email crudo en un `<span>` · KPIs agregados y actividad reciente subidos a
la portada (los componentes `funnel-kpis`, `confirmations-chart` y `activity-feed`
**ya existen** y hoy solo viven dentro de una invitación) · tarjetas de invitación
con miniatura · skeletons por ruta · jerarquía de las 6 acciones de la tarjeta,
donde hoy Eliminar pesa lo mismo que Editar.

**Archivos afectados.** `src/app/dashboard/layout.tsx` · `dashboard/page.tsx` ·
`dashboard-nav.tsx` · `invitation-card.tsx` · `loading.tsx` por ruta.

**Riesgos.** Bajo. **Dependencias.** Fases 1 y 4.

**Criterios de aceptación.** Ninguna navegación queda sin feedback visible. La
portada muestra al menos un dato agregado real. Ningún estado vacío es un párrafo
gris.

---

## Fase 6 — Onboarding

**Objetivo.** Que nadie aterrice en el editor completo de golpe. Hoy
`createInvitation` crea la invitación y **redirige directo al editor**, donde el
primer texto que se lee es *"Selecciona un módulo para editarlo"*.

**Alcance — dentro:** flujo de 4 pasos —tipo de evento → nombre y fecha → estilo →
plantilla con miniatura— y recién entonces el editor, ya con módulos sembrados
según el tipo de evento. El modo (`open` / `guest_list`) ya se pasa como
parámetro y entra en el flujo.

**Archivos afectados.** Ruta nueva `dashboard/nuevo/*` ·
`src/lib/invitations/actions.ts:32-94`.

**Riesgos.** Bajo, pero toca el primer minuto del usuario: **hay que medir el
abandono antes y después.** **Dependencias.** Fase 4 (sin miniaturas, el paso de
plantilla no tiene sentido).

**Criterios de aceptación.** Un usuario nuevo llega al editor con una invitación
que ya tiene contenido propio, no una plantilla vacía. Se mide con una cuenta de
prueba, sembrada con el `user_id` del dev.

---

## Fase 7 — Theme System

> **La fase de mayor riesgo del plan: toca invitaciones publicadas de usuarios
> reales.**

**Objetivo.** Que las 50 plantillas se vean bien sin comprar arte.

**Alcance — dentro:** `--inv-*` de 6 a ~24 tokens (escala tipográfica, medida,
márgenes en %, filete, radio, sombra, textura, fuente display **y** fuente de
cuerpo) · pairing display + cuerpo, que hoy es **arquitectónicamente imposible**
porque la fuente se fija una sola vez en la raíz · componente
`StationeryHeading` que reemplaza los 10 `<h3>` idénticos · 4 estilos de papelería
ortogonales a los 20 packs = 80 combinaciones · retirar Georgia como falsa
webfont y Dancing Script por su asociación a "invitación gratis" · textura de
grano con `feTurbulence` (380 bytes, cero arte) · gate de contraste en
`themeSchema`.

**Riesgos.** **Alto y de cara al cliente.** Un `theme_config` guardado hoy debe
seguir renderizando igual. Mitigación **obligatoria**: cada token nuevo tiene
default que reproduce el aspecto actual; el estilo de papelería nace en "clásico"
= lo de hoy; y **antes del merge se comparan capturas antes/después de las 12
invitaciones reales**, una por una.

**Dependencias.** Fases 1 y 2.

**Criterios de aceptación.** Las invitaciones existentes se ven **idénticas**
tras el cambio, comparadas por captura. Las 50 plantillas se ven distintas y
mejores. Los 80 pares pasan AA.

---

## Fase 8 — Landing y pricing

**Objetivo.** Que la primera impresión y el momento de pagar dejen de contradecir
al producto.

**Alcance — dentro:** los 13 bloques del landing (hoy hay 3 encabezados, 0
imágenes y la FAQ ocupa el 46% de la altura) · hero que **muestra** una invitación
· prueba social **solo con cifras reales**: si no hay dato, no se pone · el
pricing pasa de "desbloquea funciones" a describir un evento, **sin cambiar los
precios** · y el QR nominal por invitado sale de ser la quinta viñeta del plan de
$699 para volverse un bloque propio, porque es el diferenciador que Invitio no
tiene a $599.

**Riesgos.** Bajo técnicamente; **alto comercialmente**, porque toca conversión.
Mitigación: no tocar precios ni el contenido de los planes, solo su redacción y
jerarquía.

**Dependencias.** Fases 1 y 4.

**Criterios de aceptación.** El landing muestra al menos una invitación real. La
FAQ baja de 46% a menos de 15% de la altura. Cero cifras de prueba social
inventadas.

---

## Fase 9 — Admin y gestión de plantillas

**Objetivo.** Que crear una plantilla no exija un deploy.

**Alcance — dentro:** UI de administración de plantillas (crear, editar, duplicar,
publicar, despublicar, categoría, premium/free, versiones) sobre el gate
`requireAdmin()` que **ya existe y es correcto** · las tablas crudas del admin
migran a la primitiva `Table`.

**Riesgos.** Medio: los theme packs son hoy fuente de verdad **en código**
(decisión consciente). Mover eso a BD es una decisión de arquitectura que **se
consulta antes**, no se asume.

**Dependencias.** Fases 1 y 4.

---

## Fase 10 — Mobile, performance y QA

**Objetivo.** Cerrar la deuda que las fases anteriores no cubrieron.

**Alcance — dentro:** `next/image` (**hoy 0 usos en todo `src`**, con 8 `<img>`
crudos) · code-splitting del editor por tipo de módulo · las grillas
`grid-cols-2/3` sin breakpoint dentro de la columna de 420 px · los tres `min-w-`
divergentes de las tablas (520/640/640) · barrido de accesibilidad completo · los
13 `text-[Npx]` duros en un sistema `rem` · barrido de microcopy, incluida la
tilde errónea en "Púlsa".

**Dependencias.** Todas las anteriores.

**Criterios de aceptación.** Lighthouse de accesibilidad ≥95 en las tres
superficies. Cero `px` duros de tipografía. El editor usable en un teléfono real,
verificado en dispositivo, no en el emulador.

---

## Orden de ejecución recomendado

```
Fase 0  ─────────────────────────────────────────► mergeable YA, independiente
   │
Fase 1 (design system)
   │
   ├── Fase 2 (seguridad del editor) ── Fase 3 (estructura del editor)
   │
   ├── Fase 5 (dashboard) ── Fase 6 (onboarding)
   │
   ├── Fase 7 (theme system)  ◄── la de mayor riesgo, no la primera
   │
   └── Fase 8 (landing y pricing) ── Fase 9 (admin) ── Fase 10 (QA)

Fase 4 (miniaturas) ─────────────────────────────► en PARALELO desde el día uno
```

**Las dos dependencias duras del plan**, y las únicas que no se pueden negociar:

1. **Fase 2 antes que Fase 3.** Red de seguridad antes de manipulación.
2. **Fase 1 antes que cualquier fase de UI**, o se construye dos veces.

---

## Preguntas abiertas que este plan NO decide

Las dejo escritas en vez de asumirlas, porque cada una cambia una fase entera:

1. **¿Se mergea la Fase 0 a `main` ya?** Es un bug de producción vivo e
   independiente. La regla dura del dev es que nada llega a `main` sin que lo
   pida, así que **espera su palabra**.
2. **¿Hay presupuesto de arte?** Si no, la Fase 4 es 100% Playwright y el plan no
   cambia. Si lo hay, se abre una fase de arte después de la 7 — y el orden
   importa: la tipografía es el sustrato, el arte va encima. Comprar arte antes de
   la Fase 7 sería ponerle una guirnalda floral a un layout de dashboard.
3. **¿Los theme packs se mueven a BD?** Afecta la Fase 9. Hoy viven en código por
   decisión consciente y documentada.
4. **¿En qué plan va el álbum digital?** Quedó a medias en la rama, con su
   migración `0026` sin aplicar. Es dominio dinero y la decisión es del dev.
5. **¿`Guest` debe modelarse como familia en vez de persona?** La investigación
   encontró que en México la unidad es la familia (Casa Convite, Invita+ ya lo
   hacen). **Si se va a cambiar, es más barato ahora que después**: toca QR,
   check-in y conteo de lugares a la vez. No entra en ninguna fase de este plan
   porque es una decisión de producto, no de diseño.

---

## Qué pasa al terminar cada fase

1. Se entrega en la rama de trabajo, pusheada.
2. Se reporta el **criterio de aceptación con su evidencia medida**, no con un
   "quedó listo".
3. Se actualizan los artifacts si el bloque cerrado los desactualiza — no se
   actualizan solos.
4. **Se detiene y se espera.**

---

## Estado de ejecución · 2026-09-07

`main` = `91b6258` · rama de trabajo `skarlette/rediseno` = `2d30a1c` · 338 pruebas.

**Regla dura que gobierna la ejecución: TODO va en `skarlette/rediseno`.** No se
crean ramas por fase ni por rebanada, y se pushea en cuanto un bloque compila y
pasa — es la única forma en que el dev puede probarlo, porque su checkout está
en esa rama.

> Este documento y `DESIGN_RESEARCH.md` nacieron en otra rama
> (`skarlette/resend-y-orden-invitados`) y se trajeron aquí al cierre, sin
> arrastrar el álbum ni su migración. Justo el tipo de dispersión que la regla
> de arriba viene a evitar.

| Fase | Estado | Dónde |
|---|---|---|
| **0. Reparar** | ✅ **mergeada** | `main` (`91b6258`) |
| **1. Design system** | ✅ completa | rama · tokens `--ed-*`, 9 primitivas, dashboard, los 67 colores crudos a 0 |
| **2. Editor · seguridad de datos** | ✅ completa | rama · documento único, deshacer, autoguardado, `beforeunload`, `parseConfig` por campo |
| **3. Editor · estructura** | ⚠️ **casi** | rama · registry, tres columnas, gutter con `+`, paginador. **Falta el zoom del canvas** |
| **4. Miniaturas** | ⬜ sin empezar | puede correr en paralelo; `preview_image_url` ya existe en la BD desde la `0001` |
| **5. Dashboard con datos** | ⬜ sin empezar | el shell ya está; faltan los KPIs en la portada |
| **6. Onboarding** | ⬜ sin empezar | |
| **7. Theme System** | ⬜ sin empezar | **aquí entra el "fondo relativo"** que pidió el dev |
| **8. Landing y pricing** | ⬜ sin empezar | |
| **9. Admin y plantillas** | ⬜ sin empezar | el admin ya comparte `AppShell` |
| **10. Mobile, performance y QA** | ⬜ sin empezar | |

### Lo siguiente, en orden

1. **Fondo de imagen "relativo"** (adelanto de la Fase 7, pedido por el dev).
   Medido: la capa es `absolute` cubriendo toda la altura con
   `background-size: cover`, así que la imagen se estira una sola vez y en una
   invitación larga se ve una franja ampliada. Debe permanecer mientras el
   contenido pasa y asomar en cada sección sin imagen propia. **No usar
   `background-attachment: fixed`** — se rompe en Safari móvil y aquí el scroll
   ocurre dentro de un contenedor; la técnica es una capa `sticky` a altura de
   viewport dentro del scope. ⚠️ Toca `ThemeScope`, que pinta **todas** las
   invitaciones: antes de mergear, capturas antes/después de las **4
   PUBLICADAS** (medido el 2026-09-07 contando `is_published`; este doc decía
   «las 12» y 12 es el total de invitaciones, no las públicas).
2. **Analizar el editor de Invitio.** Bloqueado: redirige a login y el agente no
   maneja contraseñas. El dev inicia sesión y deja el editor abierto.
3. **Bloqueo optimista en `saveEditor`** — dos pestañas se pisan en silencio.
4. **Zoom del canvas**, que cierra la Fase 3.

### Deudas declaradas

- `skarlette/resend-y-orden-invitados` tiene el **álbum digital a medias con la
  migración `0026` sin aplicar**. No puede ir a `main` hasta que su SQL corra.
  Falta decidir: retomar, rebasar sobre `skarlette/rediseno`, o congelar.
- El runbook de Resend está listo, esperando trabajo de DNS y panel del dev.
- **Nada del editor se ha verificado con sesión real.** Todo se midió montando
  componentes en rutas desechables con datos inventados; la capa autenticada la
  tiene que probar el dev.

---

## Fase 11 — RESEARCH V2 · Assets visuales por evento y rediseño de plantillas

**Añadida el 2026-09-08 a peticion del dueño. NO EMPEZADA.**

> El brief normativo COMPLETO es el plan canónico del proyecto y **no vive en
> este repo**: `~/.claude/plans/sobrely-research-v2.md`. Lo de aquí es el
> resumen que encaja la fase en el plan de rediseño; ante cualquier duda, manda
> el plan canónico.

**Objetivo.** Que el catálogo deje de venderse por color y empiece a venderse
por diseño. Hoy las plantillas dependen de color, gradiente, tipografía y fondos
abstractos, y tienen muy poca imagen relacionada con el evento; el resultado se
siente genérico, repetitivo y más de MVP que de producto premium.

**Es una SEGUNDA investigación de imágenes, no un reemplazo.** La primera —3
fotos de Pexels descargadas el 2026-09-07, auto-hospedadas, con licencia leída
en la fuente y manifiesto en `public/arte/PROCEDENCIA.md`, más las 10
direcciones SVG de `src/lib/theme/arte.ts`— **no se borra ni se sustituye.**

**Alcance — dentro:** análisis de las plantillas actuales · benchmark visual
editorial (revistas, wedding stationery, luxury invitations, packaging) ·
investigación nueva y profunda en Pexels **y Unsplash** con búsquedas de
objetos/decoración/ambiente en vez de términos genéricos · criterios de
selección de imagen (13 puntos, con el espacio negativo como eje) · dirección
artística · catálogo de layouts (15 tipos de composición) · sistema de assets
con metadata · estrategia de licencias · propuesta de templates por categoría
con ficha y puntuación · selección piloto.

**Alcance — FUERA (explícito):** no se modifica ninguna plantilla existente, no
se reemplaza nada automáticamente, no se borra ningún template, no se hacen
cambios masivos.

**Reglas duras de la fase.**
- Prioridad visual: `EVENTO > OBJETOS > AMBIENTE > DECORACIÓN > PERSONAS`. Las
  plantillas no dependen de modelos posando. *(Coincide con la regla que ya
  existía por licencia: nada de caras identificables.)*
- **CALIDAD > CANTIDAD.** Mejor 40 excelentes que 150 mediocres. El rango de
  referencia (44–62 en 9 categorías) **no es una meta**: si una categoría sólo
  da 5 conceptos diferenciados, son 5.
- **Regla de diferenciación:** si la única diferencia con otro template de la
  misma categoría es el color, la fuente, la fotografía o el texto, **no se
  crea**.
- Puntuación 1–10 en Visual Quality, Uniqueness, Event Relevance, Composition,
  Premium Feel y Mobile Potential. **Promedio < 8/10 → rediseñar o descartar.**
- **Cero phone-home sigue vigente:** las imágenes se descargan y auto-hospedan;
  nunca se enlaza a `images.pexels.com` ni a `images.unsplash.com`.
- **Unsplash tiene licencia DISTINTA de Pexels** y hay que leerla en la fuente.
  Prohíbe compilar fotos para replicar un servicio similar, que es justo el
  riesgo de una "biblioteca de assets". Licencia dudosa → no se usa, y se marca
  `LICENSE_REVIEW_REQUIRED`.
- Toda foto candidata pasa por `scripts/verificar-contraste-arte.mts` antes de
  aprobarse: el velo mínimo para WCAG AA lo fija la medición, no el gusto.

**Entregable.** `docs/TEMPLATE_VISUAL_RESEARCH_V2.md`, con las 18 secciones que
enumera el plan canónico.

**Piloto.** 15 templates: 3 boda · 2 XV · 2 baby shower · 2 gender reveal ·
2 cumpleaños · 1 bautizo · 1 primera comunión · 1 graduación · 1 corporativo.
Valida dirección visual, sistema de assets, calidad, arquitectura, responsive,
performance, editor y percepción premium.

**Riesgos y tensiones que hay que resolver ANTES de gastar trabajo.**
1. **Choca en parte con la Fase 7.** El objetivo declarado de la Fase 7 es *"que
   las 50 plantillas se vean bien sin comprar arte"* (tokens, pairing
   tipográfico, grano con `feTurbulence`, "cero arte"), y la Fase 11 sostiene que
   eso no basta. Hay que decidir orden y alcance con el dueño, o una fase
   deshace trabajo de la otra.
2. **Introduce 4 categorías nuevas.** Hoy `event_type` tiene 5 valores; la Fase
   11 añade Gender Reveal, Bautizo, Primera Comunión y Graduación. Eso toca el
   seed, el filtro del marketplace y probablemente el asistente de creación.
3. **Composición editorial dentro del modelo MODULAR.** Sobrely gana a Invitio
   precisamente por no usar un lienzo absoluto de 900 px; los layouts
   asimétricos y de tipo magazine hay que expresarlos en módulos con responsive
   real, no volviendo al canvas.
4. Cada template nuevo necesita miniatura, y `REVISION_MINIATURAS` tiene que
   subir en la misma tanda o `next/image` sirve las viejas hasta 4 h.

**Dependencias.** Fase 4 (cerrada: el marketplace ya filtra, busca y guarda
favoritos) y, por resolver, su relación con la Fase 7.

⛔ **GATE DE APROBACIÓN.** Esta fase es RESEARCH + DESIGN + ASSET DISCOVERY +
PROPOSAL. Al terminar se **DETIENE**. No se implementa nada hasta que el dueño
escriba la frase exacta **«APROBADO TEMPLATE RESEARCH V2»**, y aun entonces sólo
el conjunto piloto, nunca todas las plantillas de golpe.
