# Invitaciones con temática ("theme packs") — Exploración de diseño

> Doc de producto/arquitectura. **No hay código aún.** Recomendación priorizada
> (MVP vs futuro) y riesgos legales al final de cada sección.

## TL;DR (recomendación)

1. **No inventes un sistema nuevo.** Un "theme pack" es un `template` enriquecido.
   La tabla `templates` (`theme_config` + `modules_config` + `event_type` +
   `preview_image_url`) y `createFromTemplate()` ya existen y ya copian tema +
   módulos a una invitación. El 80% del trabajo está hecho.
2. **El único gap técnico real es el fondo.** Hoy `theme_config.colors.background`
   es un **color hex sólido** (`themeCssVars` setea `backgroundColor`). No hay
   imagen ni patrón de fondo. Ese es el trabajo nuevo de infra de render.
3. **Legal: cero IP de terceros distribuida por Sobrely.** Nada de "tema
   Spiderman/Pokémon/anime" con arte oficial. Se ofrecen temas **genéricos
   "inspirados"** con arte original/licenciado, y **subida de arte propio** del
   usuario (el riesgo lo asume el usuario). Esta es la línea comercial defendible.
4. **Gate premium ya tiene mecanismo:** la feature `advanced_personalization`
   (plan Celebración+) es el candado natural para packs premium.

---

## 1. Modelo de "theme pack"

### 1.1 Qué compone un tema (capas)

| Capa | Hoy en el código | ¿Existe? |
|---|---|---|
| Paleta (primary/secondary/bg/text) | `theme_config.colors` (4 hex) | ✅ |
| Tipografía | `theme_config.font` (4 keys: sans/serif/elegant/script) | ✅ |
| Espaciado | `theme_config.spacing` (compact/normal/relaxed) | ✅ |
| Set de animaciones | `theme_config.animation` + `stylePreset` | ✅ |
| Decoración ambiental | `theme_config.decoration` (variant + **emoji**) | ✅ parcial |
| **Imagen / patrón de fondo** | — | ❌ **GAP** |
| **Stickers / decoración SVG** | sólo emoji `symbol` (máx 4 chars) | ❌ **GAP** |
| **Set de íconos** | íconos de módulo hardcodeados en `MODULE_META` | ❌ |
| Contenido pre-armado por módulo | `modules_config` (en `templates`) | ✅ |

**Conclusión:** un theme pack = `theme_config` (extendido con fondo) +
`modules_config` + assets (imágenes/SVG) + metadatos (nombre, categoría, preview,
gate premium).

### 1.2 Representación como dato — **recomendación: extender `templates`, no crear tabla nueva**

Ya existe `public.templates`. En vez de una tabla `theme_packs` paralela que
duplique el flujo de `createFromTemplate`, se agregan columnas/campos:

- `category` (text) — para agrupar en el selector ("Bodas", "Infantil", "XV").
- `is_premium` (bool) o `required_feature` (text) — gate de plan.
- `theme_config` extendido con un bloque de **fondo** (ver §4.1).
- `preview_image_url` — ya existe; poblarlo para el selector visual.

Los **assets** (fondos, SVG) van al bucket `invitation-images` (ya existe,
`0005_storage_images.sql`) bajo un prefijo curado, p.ej. `theme-assets/<slug>/`,
servidos como URL pública. No requieren tabla propia; se referencian por URL
dentro de `theme_config`.

> **Matiz importante:** hoy `templates` sirve para **crear una invitación desde
> cero** (`createFromTemplate` inserta una invitación nueva). El pedido del dev
> es "un usuario **elige una temática y la invitación se ajusta**" — eso implica
> **aplicar un tema a una invitación EXISTENTE** sin borrar su contenido. Son dos
> operaciones distintas:
>
> - **Aplicar-tema (nuevo):** sobreescribe sólo `theme_config` (paleta, fuente,
>   fondo, decoración, animación) — **no toca** `modules_config` ni los textos
>   del usuario. Es el "1 clic desde el editor" que pide el dev.
> - **Crear-desde-template (existe):** copia tema **+** contenido pre-armado.
>
> El MVP debe entregar **aplicar-tema**, que es más barato (sólo un patch a
> `theme_config`, ya hay el patrón exacto en `applyStylePreset`).

### 1.3 UX de "aplicar con 1 clic"

Ya existe el patrón en el theme-panel: el `<Select>` de "Estilo de animación"
llama `applyStylePreset(theme, key)` y hace `onChange({...})`. Un **selector de
temas** es el mismo patrón, un nivel arriba: una galería de tarjetas con
`preview_image_url` → al elegir, `applyThemePack(theme, pack)` devuelve un
`theme_config` nuevo (merge de paleta+font+spacing+fondo+decoración+animación) y
se persiste con el mismo `onChange`. Cero reescritura del render.

---

## 2. ⚠️ Derechos de autor / marcas (CRÍTICO)

Spiderman, Pokémon, animes, personajes Disney/Pixar, clubes de fútbol, etc. son
**marcas registradas y obra con copyright**. Distribuir ese arte —o siquiera
nombrar el tema con la marca y venderlo— expone a Sobrely a:

- **Infracción de copyright** (reproducir la ilustración/personaje).
- **Infracción de marca / dilución** (usar "Spiderman" como nombre de producto
  de pago sugiere afiliación o licencia que no existe).
- Es **Sobrely** quien distribuye y monetiza → la responsabilidad es del SaaS, no
  del usuario final. Es el peor escenario legal.

### Salidas viables

| Opción | Qué es | Riesgo p/ Sobrely | Veredicto |
|---|---|---|---|
| **(a) Genéricos "inspirados"** | "Superhéroe", "Kawaii/animalitos", "Aventura ninja", "Galaxia", arte **original o licenciado** | Bajo (si el arte no copia un personaje reconocible) | ✅ **Base del catálogo** |
| **(b) Sube tu propio arte** | El usuario carga su imagen/personaje al bucket | **Trasladado al usuario** (self-serve). Cubrir con ToS: el usuario declara tener derechos + indemniza a Sobrely | ✅ **Válvula de escape** |
| **(c) Packs con licencia comercial** | Assets de marketplaces (con licencia extendida/SaaS) o ilustradores contratados | Bajo-medio; exige **due diligence de la licencia** (muchas licencias stock **prohíben** re-distribución en "plantillas"/POD) | ✅ Futuro / diferenciador premium |

**Sobre (a) — la línea fina "inspirado":** un tema "Superhéroe" con capa, antifaz
y skyline genéricos es seguro. Un "superhéroe" con **traje rojo-azul con telaraña
y araña negra en el pecho** ya evoca a Spiderman y es infractor aunque no lleve el
nombre — la *trade dress* y el personaje se protegen aunque no uses la marca. La
regla operativa: **el arte no debe permitir que un tercero reconozca el personaje
protegido.** Curar con criterio, no maquillar la IP.

**Sobre (b) — condiciones para que el traslado de riesgo funcione:**
- ToS explícito: "declaras ser titular o tener licencia del contenido que subes;
  indemnizas a Sobrely frente a reclamos de terceros".
- Los assets subidos por el usuario **no se re-ofrecen** a otros usuarios como
  parte del catálogo (eso re-introduce el riesgo a Sobrely).
- Proceso de **notice-and-takedown** (bajar contenido ante reclamo). Barato y
  estándar.

### Recomendación de postura (producto comercial)

- **MVP:** sólo **(a) genéricos inspirados** curados por Sobrely + **(b) subida
  propia** con ToS de indemnización. Es defendible, escalable y no depende de
  cerrar licencias antes de lanzar.
- **NUNCA** ofrecer un tema nombrado por una marca ("Tema Spiderman") ni arte que
  reproduzca personajes reconocibles, aunque un cliente lo pida. Si el cliente
  quiere Spiderman, **él lo sube** (opción b) — Sobrely no lo distribuye.
- **(c)** entra después como packs premium diferenciados, sólo tras revisar que la
  licencia permita uso en plantillas de un SaaS multi-tenant (revisión legal, no
  técnica).

> Esto toca un **dominio sensible (riesgo legal)** → cualquier catálogo curado
> debe pasar revisión humana del arte antes de publicarse, no sólo "compila".

---

## 3. Temas comunes seguros (sin IP) — catálogo vendible

12–20 temáticas originales, con dirección de paleta / tipografía / decoración.
(La tipografía usa las 4 keys existentes: `elegant`=Playfair, `script`=Dancing,
`serif`, `sans`.)

### Bodas / adultos
1. **Boda de lujo (Champán & Oro)** — dorado/marfil/carbón · `elegant` · gradiente ambiental. *(ya insinuado por el retheme actual)*
2. **Floral romántico** — rosa palo/verde salvia/crema · `script`+`elegant` · pétalos flotando (🌸).
3. **Minimalista moderno** — blanco/negro/un acento · `sans` · sin decoración.
4. **Botánico/greenery** — verdes/crema · `serif` · hojas flotando (🍃).
5. **Tropical/destino** — turquesa/coral/arena · `sans` · hojas de palma.
6. **Terracota/boho** — terracota/mostaza/crema · `elegant` · geometría suave.
7. **Editorial nocturno** — azul noche/oro/marfil · `elegant` · destellos (✦).

### XV años / cumpleaños adulto
8. **XV clásico elegante** — vino/oro/marfil · `elegant`.
9. **XV glam/moderno** — magenta/lila/negro · `script` · destellos.
10. **Dorado festivo** — negro/oro · `sans` · confeti (🎉).

### Infantiles (los "temáticos" que el dev busca — genéricos)
11. **Princesas (genérico)** — rosa/lila/dorado · `script` · coronas/estrellas.
12. **Dinosaurios (genérico)** — verde/naranja/café · `sans` redondeada · huellas/hojas.
13. **Superhéroe (genérico, NO IP)** — rojo/azul/amarillo · `sans` bold · estrellas/rayos.
14. **Unicornios / arcoíris** — pastel multicolor · `script` · estrellas (⭐)/nubes.
15. **Jungla / safari** — verdes/ocre · `sans` · hojas.
16. **Espacio / galaxia** — índigo/violeta/plata · `sans` · destellos.
17. **Animalitos kawaii (genérico)** — pastel · `script` redondeada · corazones (💖).
18. **Marino / bajo el mar** — azules/turquesa · `sans` · burbujas.
19. **Deportes / balón (genérico, NO club)** — verde cancha/blanco/negro · `sans` bold.
20. **Fiesta neón** — negro/fucsia/cian · `sans` · destellos.

Cada uno se aterriza como un `theme_config` (paleta + font + spacing +
decoración + animación) + opcionalmente fondo/patrón + `category`.

---

## 4. Integración con lo que ya hay

### 4.1 Lo único que hay que agregar al render: **fondo**

Hoy `themeCssVars()` sólo hace `backgroundColor: theme.colors.background`. Para
temáticas de verdad hace falta imagen/patrón. Extensión mínima retro-compatible:

```
theme_config.background = {
  kind: "color" | "image" | "pattern",   // default "color" → comportamiento actual
  imageUrl?: string,                       // bucket invitation-images
  patternKey?: string,                     // SVG tileable curado
  overlay?: number,                        // 0..1 velo para legibilidad de texto
  attachment?: "scroll" | "fixed"
}
```

`themeCssVars` pasa a emitir `--inv-bg-image` / gradiente-overlay además del
color. **Retro-compat:** `background` como string hex sigue parseando (default
`kind:"color"`), así ninguna invitación existente se rompe — el `themeSchema` con
Zod `.default()` lo absorbe.

### 4.2 Decoración: emoji → sets SVG (incremental)

`decoration.symbol` es un string. Ya funciona con emoji temáticos (🦕, 👑, 🚀) —
**el MVP puede usar emoji y verse temático sin assets nuevos.** Para arte
original de marca Sobrely, se agrega una 4ª variante `"sticker-set"` que apunta a
un `symbolSetKey` (colección SVG curada). No rompe las 3 variantes actuales.

### 4.3 Módulos y animaciones: **cero cambios**

El pack sólo escribe `theme_config` (que ya incluye `animation` + `decoration`).
Los 11 módulos leen `--inv-*` vía `ThemeScope`. Un pack puede opcionalmente
traer `modules_config` (como los `templates` actuales) para la ruta
"crear-desde-tema".

### 4.4 Gate premium — **ya hay mecanismo**

- Feature `advanced_personalization` (Celebración+, en `plans.ts`) → temas free
  vs. temas premium. Marcar packs premium con ⭐, igual que los módulos premium ya
  se marcan (commit `c33390e`).
- Al aplicar un pack premium en plan insuficiente: mismo patrón que módulos →
  ofrecer el plan mínimo que lo desbloquea en el checkout (ya existe
  `minimalPlanForModules`; se replicaría un `minimalPlanForFeature`).

### 4.5 Trabajo nuevo, ordenado (MVP → futuro)

**MVP (aplica-tema, sin assets pesados):**
1. Migración: `templates` + columnas `category`, `is_premium`; **seed** de ~10–12
   temas §3 como `theme_config` (paleta+font+spacing+decoración emoji+animación).
2. `theme.ts`: bloque `background` retro-compat (color por ahora) + `applyThemePack()`.
3. UI: **selector de temas** (galería de tarjetas con preview) en el editor →
   `onChange` del `theme_config`. Reusa el patrón del `<Select>` de estilos.
4. Gate premium con `advanced_personalization`.

**V2 (assets curados):**
5. Fondos imagen/patrón en `invitation-images/theme-assets/` + render de
   `--inv-bg-image` + overlay de legibilidad.
6. Sets de stickers SVG (`decoration.variant:"sticker-set"`).
7. Subida de arte propio del usuario (opción legal **b**) con ToS de indemnización.

**Futuro:**
8. Packs con licencia comercial (opción **c**), tras revisión legal de licencias.

---

## 5. Opcional/futuro: fondos con IA local vs. assets curados

- **Assets curados (recomendado para MVP/V2):** predecibles, revisables por
  humano (crítico por el riesgo legal §2), consistentes con la marca, cacheables.
  El costo es de curaduría/ilustración una sola vez por pack.
- **Generación con IA local:** encaja con la doctrina de **soberanía de datos**
  del entorno (nada sale a la nube), y permitiría fondos "infinitos" por evento.
  Pero: (1) **riesgo legal se agrava**, no se reduce — un modelo puede regurgitar
  estilos/personajes con IP y nadie revisó el output; (2) calidad/consistencia
  variable rompe la percepción premium; (3) costo de infra de inferencia local.

**Recomendación:** IA local **no** para el catálogo de temas (donde el control
legal y de marca es prioritario). Sí tiene sentido acotado y a futuro para
**texturas/patrones abstractos** (no personajes, no escenas reconocibles) como
generador de fondos tileables — bajo riesgo de IP y alta reusabilidad. Empezar
con assets curados; IA como herramienta interna de producción de patrones, no
como feature expuesta al usuario final.

---

## Resumen de riesgos marcados

- 🔴 **Legal (IP/marca):** ningún tema nombrado por marca ni arte que reproduzca
  personajes reconocibles distribuido por Sobrely. Catálogo curado = revisión
  humana obligatoria. Arte de terceros = sólo vía subida del usuario con ToS de
  indemnización + takedown.
- 🟠 **Retro-compatibilidad del render:** el cambio de `background` (string →
  objeto) debe mantener el string hex funcionando vía default de Zod, o se rompen
  invitaciones publicadas.
- 🟠 **Aplicar-tema ≠ crear-desde-template:** el MVP debe sobreescribir sólo
  `theme_config` sin tocar el contenido del usuario. No reusar tal cual
  `createFromTemplate` (que inserta invitación nueva).
- 🟡 **Licencias stock:** muchas prohíben uso en "plantillas"/redistribución en
  SaaS. Revisar cada licencia antes de incluir el asset (opción c).
