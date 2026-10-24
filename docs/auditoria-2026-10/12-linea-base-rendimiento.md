# 12 · Línea base de rendimiento (T09)

Medido el 24 oct 2026 (UTC, ~05:20) contra producción (`https://sobrely.com`), con Lighthouse 13.5.0 en Chrome local, solo categoría de rendimiento. Móvil: perfil por defecto de Lighthouse (4G lenta simulada, CPU ×4), 3 corridas por página, se reporta la mediana. Escritorio: 1 corrida. **Son datos de laboratorio.** No hay datos de campo (CrUX) en este informe; sin ellos no se sabe qué ve un visitante real.

## Resultados

| Página | Móvil: puntaje | LCP (s) | TBT (ms) | CLS | Peso | Escritorio: puntaje | LCP (s) |
|---|---|---|---|---|---|---|---|
| `/` | 85 | 4.28 | 4 | 0 | 707 KB | 99 | 0.83 |
| `/pricing` | 87 | 4.06 | 2 | 0 | 638 KB | 100 | 0.80 |
| `/plantillas` | 84 | 4.49 | 9 | 0 | 807 KB | 99 | 0.94 |
| `/invitaciones-digitales-boda` | 88 | 3.98 | 3 | 0 | 636 KB | 99 | 0.85 |
| `/blog/invitacion-digital-o-impresa` | 86 | 3.99 | 14 | 0 | 640 KB | 100 | 0.79 |

Umbral «bueno» de LCP: ≤ 2.5 s; «deficiente»: > 4 s. **En móvil las 5 páginas están en el límite o por encima de «deficiente»**; en escritorio todas son buenas. CLS es 0 y el bloqueo de hilo es mínimo. INP no se mide en laboratorio.

## Lo que se midió sobre la causa

- En `/pricing`, `/blog/...` y la landing de boda el elemento LCP es el `<h1>` (texto). El primer contenido aparece a ~1 s, pero el LCP llega a ~4 s.
- En todas las páginas se descargan **14 archivos de fuente = 411 KB** (22 % del peso total, más que todo el JavaScript de la página en `/pricing`: 181 KB), incluso en páginas que no usan las fuentes decorativas.
- En `/` el LCP son las imágenes del hero; su fase de «retraso de render» es 1.0 s.

**Hipótesis (no verificada):** las fuentes decorativas del layout raíz compiten por ancho de banda con la fuente del título y retrasan el cambio de tipografía que fija el LCP. T10 es la prueba: si al sacarlas del layout raíz el LCP móvil baja, la hipótesis se confirma.

## Meta para T10

Fuentes < 100 KB por página; LCP móvil por debajo de la línea base de esta tabla, medido con el mismo método.

Reproducir: `npx lighthouse@13.5.0 <url> --only-categories=performance --form-factor=mobile --chrome-flags="--headless=new"`.

## T10, parte 1: fuentes (resultado)

Cambio: `preload: false` en las 11 fuentes de tema de invitación y en Geist Mono (`src/app/layout.tsx`). Playfair y Geist Sans siguen precargadas. Las demás se descargan cuando una página las usa.

Comparación A/B con la misma compilación de producción servida en local (`next start`), Lighthouse 13.5.0 móvil, 3 corridas por página, mediana. Los valores absolutos no son comparables con la tabla de producción de arriba (otra red y sin CDN); lo comparable es antes contra después.

| Página | LCP antes | LCP después | Fuentes antes | Fuentes después | Puntaje |
|---|---|---|---|---|---|
| `/` | 5.17 s | 3.15 s | 14 · 414 KB | 2 · 67 KB | 81 → 93 |
| `/pricing` | 5.31 s | 3.06 s | 14 · 414 KB | 2 · 67 KB | 80 → 94 |
| `/invitaciones-digitales-boda` | 5.16 s | 2.91 s | 14 · 414 KB | 2 · 67 KB | 81 → 95 |

La hipótesis de la sección anterior queda confirmada: el LCP baja unos 2 s y el FCP no cambia. Faltan dos cosas de T10: cachear la home y las landings (la home sigue sin caché) y repetir la medición en producción tras el despliegue.

Comprobado: la variable `--font-dancing` se resuelve en cualquier página y el archivo se descarga bajo demanda. **No comprobado:** una invitación publicada con una tipografía de tema en producción; la única publicada en la base local usa la fuente por defecto. Riesgo conocido: sin precarga, una invitación con tipografía decorativa puede mostrar un instante la fuente de reserva antes del cambio.
