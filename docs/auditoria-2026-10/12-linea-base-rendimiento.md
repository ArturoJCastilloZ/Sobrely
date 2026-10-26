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

## T10, parte 2: caché (decisión: no se hace ahora)

Medido en producción el 24 oct 2026 (cabeceras y TTFB, mediana de 5 peticiones desde la máquina de desarrollo):

| Ruta | Caché (`x-vercel-cache`) | TTFB |
|---|---|---|
| `/invitaciones-digitales-boda` | HIT (pública) | 0.17 s |
| `/blog`, artículos, `/privacidad` | HIT / PRERENDER | 0.16 s |
| `/pricing` | MISS (`private, no-store`) | 0.22 s |
| `/` | MISS (`private, no-store`) | 0.30 s |
| `/plantillas` | MISS (`private, no-store`) | 0.31 s |

- Las landings, el blog y las páginas legales **ya se sirven desde caché**; el supuesto de la auditoría («cachear la home y las landings») solo aplica a la home, `/pricing` y `/plantillas`.
- Esas tres son dinámicas porque leen la sesión (`supabase.auth.getUser()`) y cambian el botón principal según haya sesión (`user ? "Ir al dashboard" : "Empezar a diseñar"`, y el destino de cada plan en `/pricing`).
- La ganancia posible es de unos 50 a 130 ms de TTFB, contra un LCP móvil de ~4 s (≈ 3 %). Para lograrla habría que pasar el botón de sesión a un componente de cliente, lo que pone un parpadeo en el botón principal, justo en la zona del LCP, o servir un botón equivocado a quien ya tiene sesión.
- Decisión: no se toca. Se reevalúa tras medir en producción el efecto de las fuentes.

## T10: medición en producción tras el despliegue (24 oct 2026)

Mismo método que la línea base (Lighthouse 13.5.0 contra `https://sobrely.com`, móvil con 3 corridas y mediana, escritorio con 1 corrida), con el cambio de fuentes ya desplegado: la página precarga 2 fuentes en lugar de 14.

| Página | LCP móvil antes | LCP móvil después | Puntaje móvil | Fuentes |
|---|---|---|---|---|
| `/` | 4.27 s | 2.46 s | 85 → 97 | 14 · 411 KB → 2 · 67 KB |
| `/pricing` | 4.06 s | 2.32 s | 87 → 98 | igual |
| `/plantillas` | 4.49 s | 2.89 s | 84 → 95 | igual |
| `/invitaciones-digitales-boda` | 3.98 s | 2.32 s | 88 → 98 | igual |
| `/blog/invitacion-digital-o-impresa` | 4.18 s | 2.31 s | 86 → 98 | igual |

Escritorio: LCP de 0.79–0.94 s a 0.50–0.60 s en las cinco páginas (puntaje 99–100). CLS 0 y TBT ≤ 8 ms en móvil, sin cambio.

- **Resultado:** el LCP móvil baja entre 1.7 y 1.9 s en las cinco páginas, confirmado en producción y de acuerdo con la comparación local (que daba unos 2 s). Cuatro de cinco quedan en o muy cerca del umbral «bueno» (≤ 2.5 s); `/plantillas` queda en 2.89 s.
- **Lo que queda en `/` y `/plantillas`:** el elemento LCP es una imagen del hero o de la galería, y su fase dominante es el retraso de render (~1.0 s), no la descarga (~0.15 s). Lighthouse marca «entrega de imágenes» con 0.5 y «descubrimiento del LCP» con 0 en las dos. Es el siguiente punto a mirar si se quiere bajar de 2.5 s; no se investigó la causa.
- **Límite:** son datos de laboratorio, 3 corridas por página (la primera corrida de `/` dio 2.51 s y la tercera 1.79 s: hay variación). Sin datos de campo (CrUX), no se sabe qué ven los visitantes reales hasta que haya tráfico.
- **No comprobado en producción:** una invitación pública con una tipografía de tema; no hay una publicada con esa característica a la mano.

## Medición en producción tras las fases 1 a 5 de la propuesta visual (26 oct 2026)

Mismo método (Lighthouse 13.5.0 contra `https://sobrely.com`, móvil, 3 corridas, mediana), con `main` en `7b60c72` ya desplegado (la home trae la sección «Pruébala con tu evento»).

| Página | LCP móvil (T10) | LCP móvil ahora | Corridas | Puntaje | TBT | Peso | CLS |
|---|---|---|---|---|---|---|---|
| `/` | 2.46 s | **2.55 s** | 2.69 · 2.54 · 2.55 | 96–97 | 0–6 ms | 362 KB | 0 |
| `/pricing` | 2.32 s | **2.31 s** | 2.31 · 2.53 · 2.31 | 97–98 | 10–15 ms | 299 KB | 0 |
| `/plantillas` | 2.89 s | **3.36 s** | 3.00 · 3.36 · 3.43 | 91–94 | 36–39 ms | 735 KB | 0 |

- **Home y precios:** sin cambio medible. La diferencia de la home (+0.09 s) está dentro de la variación entre corridas (2.54 a 2.69). La demo no pesa: no se pide hasta que la sección está a punto de verse, y el CLS sigue en 0.
- **`/plantillas` empeoró unos 0.5 s** y el TBT pasó de menos de 9 ms a unos 38 ms. Es la única de las tres que cambió de forma notable.
- **Lo medido:** el JavaScript de `/plantillas` es de 500 KB contra 188 KB en la home, y su «retraso de render del elemento LCP» es de 358 ms contra 66 ms en la home.
- **Hipótesis (no verificada):** la vista rápida (fase 1) arrastra `PublicInvitationView` y todos los módulos de la invitación al paquete de la galería, que se carga entera aunque nadie abra la vista rápida. No hay medición del peso de JavaScript de `/plantillas` antes de la fase 1, así que la causa no está confirmada. El arreglo, si se confirma, es cargar `VistaRapida` bajo demanda al primer clic.

### Arreglo de `/plantillas`: la vista rápida se carga al primer clic

Causa confirmada con A/B. La vista rápida (`VistaRapida`, que trae `PublicInvitationView` y todos los módulos) iba dentro del paquete de la galería. Ahora se pide con `React.lazy` al primer clic en «Probar con tus nombres», o antes si el puntero o el foco llegan al botón.

Comparación con compilaciones de producción servidas en local (`next start`, base local), Lighthouse 13.5.0 móvil, 3 corridas; los valores absolutos no son comparables con producción, lo comparable es antes contra después:

| `/plantillas` | Antes | Después |
|---|---|---|
| LCP (mediana) | 5.19 s (4.98 · 5.19 · 5.19) | **3.52 s** (3.15 · 3.52 · 3.52) |
| JavaScript transferido | 492 KB | **202 KB** |
| TBT | 51–86 ms | **2–5 ms** |
| Puntaje | 81 | 91–93 |
| CLS | 0 | 0 |

Comprobado en el navegador: la vista rápida abre, muestra los nombres en la invitación, cierra y vuelve a abrir. **Pendiente:** repetir la medición en producción tras el despliegue.

**Medición en producción tras el arreglo (26 oct 2026, `main` en `81befa4`).** Mismo método, 3 corridas, `https://sobrely.com/plantillas`:

| `/plantillas` en producción | T10 | Tras fases 1 a 5 | Tras el arreglo |
|---|---|---|---|
| LCP móvil (mediana) | 2.89 s | 3.36 s | **2.76 s** (2.70 · 2.76 · 2.76) |
| JavaScript transferido | sin medir | 500 KB | **203 KB** |
| TBT | < 9 ms | 36–39 ms | **2–8 ms** |
| Peso total | sin medir | 735 KB | **440 KB** |
| Puntaje | 95 | 91–94 | **96** |
| CLS | 0 | 0 | 0 |

La página queda mejor que en T10 (2.89 s) y 0.6 s por debajo de lo medido tras las fases. El elemento LCP sigue siendo una imagen de la galería; no se investigó el retraso de render restante.
