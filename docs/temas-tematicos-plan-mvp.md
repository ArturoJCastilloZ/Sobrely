# Temas temáticos — Plan de implementación MVP

> Deriva del doc de exploración `temas-tematicos-exploracion.md` (aprobado).
> Alcance MVP: **aplicar un tema a una invitación existente con 1 clic desde el
> editor**, con catálogo curado seguro (sin IP) y gate premium. **Sin** fondos de
> imagen pesados ni stickers SVG (esos son V2).

## Principio rector

Reusar todo lo que existe. El MVP **no toca** el render de módulos, ni el pipeline
de guardado (`saveEditor` ya persiste `theme_config`), ni el sistema de
animaciones. Sólo:
1. define un catálogo de "theme packs" como dato,
2. una función pura `applyThemePack(theme, pack)` (gemela de `applyStylePreset`),
3. un selector visual en el tab "Tema" del editor,
4. el gate premium con la feature `advanced_personalization` ya existente.

Cada fase es commiteable y verificable por separado.

---

## Fase 1 — Modelo de datos del theme pack (código, sin DB todavía)

**Archivo nuevo:** `src/lib/theme/theme-packs.ts`

Fuente de verdad tipada de los packs (mismo patrón que `plans.ts` y
`style-presets.ts`: un objeto en código, no en la DB para el MVP). Cada pack:

```ts
export type ThemePackCategory = "boda" | "xv" | "infantil" | "corporativo";

export type ThemePack = {
  key: string;                 // slug estable, p.ej. "floral-romantico"
  label: string;
  category: ThemePackCategory;
  isPremium: boolean;          // gate: true => requiere advanced_personalization
  previewImageUrl?: string;    // tarjeta del selector (bucket, opcional en MVP)
  // Sub-objeto de theme_config que el pack IMPONE al aplicarse:
  theme: {
    colors: { primary; secondary; background; text };
    font: FontKey;             // "sans" | "serif" | "elegant" | "script"
    spacing: SpacingKey;
    stylePreset: StylePresetKey; // reusa un preset de animación existente
    decoration: { enabled; variant; symbol }; // emoji en MVP
  };
};
```

**Función pura** (gemela de `applyStylePreset`, retro-compat):

```ts
export function applyThemePack(theme: ThemeConfig, key: string): ThemeConfig {
  const p = THEME_PACKS[key];
  // Reusa applyStylePreset para animación+decoración, luego sobreescribe
  // paleta/font/spacing. NO toca theme.animations (master switch del usuario).
  const withStyle = applyStylePreset(theme, p.theme.stylePreset);
  return {
    ...withStyle,
    colors: { ...p.theme.colors },
    font: p.theme.font,
    spacing: p.theme.spacing,
    decoration: { ...p.theme.decoration },
    themePack: p.key,   // <-- nuevo campo opcional en themeSchema (Fase 2)
  };
}
```

**Seed inicial:** 8–10 packs del §3 del doc de exploración (paletas ya definidas
ahí). Empezar con 2 free (p.ej. `minimalista-moderno`, `floral-romantico`) y el
resto premium, para probar el gate.

**Tests** (`theme-packs.test.ts`): `applyThemePack` es idempotente, no muta el
input, preserva `theme.animations`, y todo `theme` resultante pasa `themeSchema`.

**Verificación:** `applyThemePack(defaultTheme(), "<key>")` → `themeSchema.parse`
no lanza para todos los packs (test que itera `Object.keys(THEME_PACKS)`).

---

## Fase 2 — Extensión mínima de `themeSchema`

**Archivo:** `src/lib/theme/theme.ts`

Agregar **un** campo opcional retro-compat:

```ts
// dentro de themeSchema:
themePack: z.string().optional(),  // último pack aplicado (display en selector)
```

Es idéntico al `stylePreset` que ya existe (línea 67). **No** se agrega el bloque
`background` de imagen todavía (eso es V2). Cero cambios en `themeCssVars`.

**Verificación:** parsear un `theme_config` viejo (sin `themePack`) sigue dando
default; los tests existentes de `parseTheme` pasan sin cambios.

---

## Fase 3 — Gate premium

**Archivo:** `src/lib/billing/plans.ts` (helper simétrico a `minimalPlanForModules`)

El pack premium requiere la feature `advanced_personalization` (Celebración+):

```ts
export function minimalPlanForFeature(feature: PlanFeature): Plan | undefined {
  return getActivePlans()
    .filter((p) => p.features.includes(feature))
    .sort((a, b) => a.priceRegular - b.priceRegular)[0];
}
```

**Decisión de UX del gate (CONFIRMADA con el dev):** el usuario en plan
insuficiente **puede aplicar** el pack premium en el editor y verlo en preview; el
bloqueo salta **al publicar**, ofreciendo el plan mínimo que lo desbloquea.
Consistente con los módulos premium ⭐ (reusa el patrón `minimalPlan*` + el
checkout de un solo plan). Así el usuario "prueba" el tema y hay incentivo de
compra. → En el enforcement de publicación, incluir el `themePack` premium
aplicado como condición que exige `advanced_personalization`, junto a los módulos.

**Verificación:** `minimalPlanForFeature("advanced_personalization")` → plan
`celebracion` (test).

---

## Fase 4 — UI: selector de temas en el editor

**Archivo nuevo:** `src/components/editor/theme-pack-picker.tsx`
**Integración:** dentro de `theme-panel.tsx`, arriba del selector de "Estilo de
animación", en el tab "Tema" del editor.

Galería de tarjetas agrupadas por `category`. Cada tarjeta: `previewImageUrl` (o
un swatch de la paleta como fallback si no hay imagen en MVP), `label`, y badge ⭐
si `isPremium`. Al hacer clic:

```ts
onChange(applyThemePack(theme, pack.key));  // reusa el onChange/updateTheme existente
```

`updateTheme` (`invitation-editor.tsx:181`) ya hace el merge en estado;
`saveEditor` ya persiste `theme_config`. **Cero cambios en el guardado.** El pack
aplicado se resalta leyendo `theme.themePack`.

Para packs premium con plan insuficiente: mostrar el ⭐ y, al aplicar, un aviso
"disponible en el plan Celebración+" reusando el patrón del gate de módulos
premium (commit `c33390e`).

**Verificación (manual, es UI):** en el editor, elegir un pack → el preview-pane
cambia paleta/fuente/decoración en vivo; guardar → recargar → el tema persiste.
Pack free en cuenta free no dispara gate; premium sí muestra ⭐.

---

## Fase 5 — Preview visual del catálogo (opcional pero recomendado)

Poblar `previewImageUrl`. En MVP puede ser un **swatch generado** (gradiente de la
paleta + nombre de la fuente) en vez de imagen real, para no bloquear el
lanzamiento en arte curado. Imagen real → V2.

---

## Orden de entrega y dependencias

```
Fase 1 (theme-packs.ts + tests)  ──┐
Fase 2 (themeSchema.themePack)   ──┤─→ Fase 4 (selector UI) ─→ Fase 5 (previews)
Fase 3 (gate premium helper)     ──┘
```

Fases 1–3 son lógica pura, testeables sin UI. Fase 4 es el clic real que pide el
dev. Cada una es un commit independiente.

## Fuera de alcance del MVP (V2+, ver exploración §4.5)

- Fondos de **imagen/patrón** (`theme_config.background` como objeto + render de
  `--inv-bg-image` + overlay de legibilidad).
- **Sets de stickers SVG** (`decoration.variant: "sticker-set"`).
- **Subida de arte propio** del usuario (opción legal (b) + ToS de indemnización).
- Migrar el catálogo de packs de código → tabla DB editable en caliente (como se
  planea para `plans` en Subfase 8.2).

## Riesgos a vigilar durante la implementación

- 🟠 **Retro-compat:** `themePack` debe ser `.optional()`; ninguna invitación
  publicada debe romperse al parsear. Cubrir con test de `parseTheme` sobre un
  `theme_config` legacy.
- 🟠 **No pisar el master switch:** `applyThemePack` **no** debe forzar
  `theme.animations`. Confirmar que `applyStylePreset` respeta el `animations` de
  nivel invitación al construir la función encima.
- 🟡 **Gate consistente:** el bloqueo premium debe comportarse igual que el de
  módulos (aplicar+preview, bloquear al publicar) para no confundir al usuario.
- 🔴 **Legal (recordatorio):** los packs del seed son genéricos sin IP. Ningún
  pack nombrado por marca ni con arte que evoque un personaje protegido. Revisión
  humana del arte antes de poblar `previewImageUrl` en V2.
```
