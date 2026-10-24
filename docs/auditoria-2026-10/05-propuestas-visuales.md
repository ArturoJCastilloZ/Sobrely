# 05 · Propuestas visuales

**Prototipo interactivo** (artifact privado): <https://claude.ai/code/artifact/111d9b3d-fc85-4019-8592-8cc6b1528b2b>
**Copia ejecutable en el repositorio:** `docs/auditoria-2026-10/prototipos/propuestas-visuales.html` (ábrelo en cualquier navegador; no toca la aplicación).

Contenido: 5 pantallas × 3 alternativas × 3 dispositivos (escritorio, tablet, móvil) = 45 vistas. Cada una trae su objetivo, problema, justificación, impacto, esfuerzo y riesgos al costado. Algunas piezas son interactivas: elegir paleta, elegir evento, filtrar el catálogo, abrir vista rápida, escribir nombres y verlos en la invitación, avanzar por pasos, marcar una lista de progreso y responder un selector de plan. Se probaron las 45 combinaciones sin desbordes ni errores de consola.

Las maquetas respetan la identidad (negro mate, beige, dorado, serif y sans) y usan datos reales: precios de `plans.ts` y el conteo de plantillas por tipo. No copian ninguna composición de la competencia: los principios que se tomaron (producto visible, precio cerca del botón, un solo botón dominante) están en `03`.

## Resumen y recomendación por pantalla

Esfuerzo: S de 1 a 2 días, M de 3 a 6, L de 7 o más. El impacto es una hipótesis; la métrica de cada una está en `11-plan-experimentacion.md`.

| Pantalla | Alternativa | Qué hace | Esfuerzo | Riesgo principal | Mi recomendación |
|---|---|---|---|---|---|
| **Landing** | A · Demo en vivo | Teléfono con paleta cambiable y botón «Probar con mi evento» | M | Peso de la demo y LCP | **Segunda etapa**, después de medir el hero actual |
| | B · «¿Qué vas a celebrar?» | Cinco tarjetas de evento que llevan a la galería filtrada | S | Sin imagen de producto | **Hacerla ya** si se quiere acortar el camino; combina con A |
| | C · Invitación y puerta | Pase QR y panel de confirmaciones al frente | S | Depende de decidir qué plan incluye el QR | **Después de resolver el QR** |
| **Catálogo** | A · Filtros y precio | Chips de evento, estilo y precio; tarjetas con precio | M | Etiquetar las 65 plantillas | **Primero** (P1) |
| | B · Colecciones por estilo | Tiras curadas; páginas indexables | M | Curaduría y texto único | **Segundo**, aporta SEO |
| | C · Vista rápida | Modal con teléfono y nombres | M | Estado en móvil, accesibilidad del modal | Solo si A no basta |
| **Vista previa** | A · Teléfono y resumen | Qué incluye, precio, un botón | S | Bajo | **Hacerla** (base de lo demás) |
| | B · Inmersiva | Pantalla completa y barra fija | S | La barra puede tapar contenido en iPhone | Probar en móvil |
| | C · Con tus datos | Nombres y paleta en vivo, sin cuenta | M | Pasar los datos al editor sin perderlos | **La de mayor potencial emocional**; después de A |
| **Editor inicial** | A · Asistente de 4 pasos | Evento, datos, foto, revisar | M | Duplica flujos | No ahora |
| | B · Fácil y Avanzado | 3 campos al inicio y modo completo opcional | M | Dos modos que probar | Después de C |
| | C · Lista de progreso | Barra y botón Publicar que se activa con lo esencial | S | Frustrar si bloquea | **Primero** en el editor |
| **Precios** | A · Un plan recomendado | Plan destacado, un pago, señales de confianza | S | Prometer garantías inexistentes | **Hacerla ya** |
| | B · Selector de 2 preguntas | Recomienda plan por invitados y funciones | M | Debe usar la misma fuente que el servidor | Después de A |
| | C · Con servicio asistido | Tabla y columna «Hecho por Sobrely desde $999» | M | Cada venta consume horas | **Como piloto** con 5 clientes |

## Cruce de las tres perspectivas

| Decisión | Técnica | Comercial | Experiencia | Resultado |
|---|---|---|---|---|
| Hero con plantillas reales | Ya hecho; añade una consulta a una página dinámica | Reduce incertidumbre, pero hoy no hay tráfico que lo pruebe | Mejora la primera impresión (vi el antes y el después) | Mantener; **no seguir afinando la landing** hasta tener visitas |
| Demo interactiva en la landing | Peso extra sobre 409 KB de fuentes | Alta atracción (Convite la usa) | Muy buena | Primero quitar peso (fuentes) y medir LCP; luego la demo |
| QR al frente (landing C) | Trivial | Es el diferenciador | Claro | **Bloqueada** por la decisión de plan; prometer mal cuesta confianza |
| Editor asistido de 4 pasos | Duplica lógica | Aumenta borradores completos | Mejor para principiantes | Riesgo de «convertirse en Canva»; empezar por la lista de progreso (S) |
| Servicio asistido en la tabla | Ya hay solicitud manual | Ticket alto con poco volumen | Alivia a quien no quiere editar | Piloto controlado, no precio público todavía |

**Orden sugerido de construcción** (si apruebas): Precios A → Ficha A → Editor C → Catálogo A → Ficha C → Landing B → Landing C. Cada paso es pequeño y medible. Nada de esto se implementa sin tu aprobación.
