# 14 · Decisión sobre la propuesta visual

Fecha: 24 oct 2026. Elección del dueño sobre las alternativas de `05-propuestas-visuales.md`. Lo de **Vista previa A** (ficha con «qué incluye») y **Editor C** (lista de progreso) ya está construido (T12 y T13).

| Pantalla | Elegido | Qué es |
|---|---|---|
| Landing | **A · Demo en vivo** | Teléfono con paleta cambiable y botón «Probar con mi evento» |
| Catálogo | **B · Colecciones por estilo**, con la **vista rápida con nombres** de la C | Tiras curadas y páginas indexables por estilo; modal con teléfono y nombres, sin cuenta |
| Editor inicial | **A · Asistente de 4 pasos** | Evento, datos, foto y revisar, con vista previa fija; el editor completo sigue disponible |
| Precios | **B · Selector de 2 preguntas** | Recomienda plan según invitados y funciones |

## Lo que `05` y `06` advertían de lo elegido

- **Landing A:** «Segunda etapa, después de medir el hero actual». Ya se midió y se bajó el LCP móvil de ~4.2 s a ~2.3 s (`12`); la demo debe cargar perezosa y con imágenes de 200 KB o menos.
- **Catálogo B:** «Requiere curaduría manual y texto único por colección». Los cinco estilos de T14 ya son colecciones naturales.
- **Vista rápida (C):** «Hay que llevar los datos al editor sin perderlos y sin datos personales en analítica».
- **Editor A:** `05` lo marcó «No ahora» y `06` advirtió el riesgo de «convertirse en Canva» y de duplicar flujos si no se comparte la lógica. Se hace igual, con esa condición: **una capa guiada sobre el mismo documento del editor**, no un segundo editor.
- **Precios B:** «Si la regla no coincide con lo que permite el servidor, se recomienda mal; debe usar la misma fuente (`plans.ts`)». Las preguntas sobre el pase QR esperan a T02.

## Pieza común

Cuatro de las cinco cosas necesitan lo mismo: que alguien escriba **sus nombres, la fecha y una paleta**, los vea en la invitación sin cuenta, y que **esos datos lleguen al editor sin perderse**. Se construye una vez (modelo de «datos iniciales», aplicarlos a una plantilla, llevarlos hasta `createFromTemplate`) y la usan la demo de la landing, la vista rápida del catálogo y el paso «datos» del asistente.

## Orden propuesto

| Fase | Qué | Por qué en este orden |
|---|---|---|
| 1 | Pieza común + **vista rápida con nombres** | Es lo más chico que prueba la pieza en una pantalla real, y es «la palanca emocional más fuerte» según `05` |
| 2 | **Precios B** | Independiente de las demás; las preguntas del QR se añaden cuando se decida T02 |
| 3 | **Catálogo B**: colecciones por estilo | Necesita texto único por colección, que se redacta y se aprueba antes |
| 4 | **Landing A**: demo en vivo | Reutiliza la pieza común; se mide el LCP contra la línea base |
| 5 | **Editor A**: asistente de 4 pasos | El más grande y el que toca el flujo de publicar; al final, con datos de T13 si ya hay tráfico |

Los eventos nuevos (`quick_view_open`, `demo_start`, etc.) exigen ampliar la restricción de `funnel_events` con una migración, y la prueba que la mantiene sincronizada con el código.

## Avance

**Fase 1 (24-26 oct 2026): pieza común y vista rápida con nombres.** Hecha en la rama `plan/90-dias`.

- `src/lib/templates/datos-iniciales.ts`: modelo de datos (nombres y fecha), limpieza y dónde van los nombres en la portada. Medido en las 65 plantillas: en las bodas el título SON los nombres («Ana & Carlos»); en XV años, bautizo, comunión y graduación el título es una frase y los nombres van en el subtítulo.
- `GET /api/plantillas/<slug>/documento`: el documento de escaparate de una plantilla, el mismo que pinta `/plantilla/<slug>`.
- `VistaRapida` (botón «Probar con tus nombres» en cada tarjeta): la invitación real en un marco de teléfono que cambia al escribir; «Usar con estos datos» abre el editor con los nombres y la fecha ya puestos (`createFromTemplate` y `empezarComoInvitado` aceptan `datos`, que se vuelven a limpiar en el servidor).
- Evento `quick_view_open` (migración `0066`) y parámetro `con_datos` en `start_customization`.
- La lista de progreso del editor y el evento `complete_draft` ahora cuentan los nombres si cambia el título **o** el subtítulo de la portada: antes, quien escribía su nombre en un XV seguía viendo «nombres» pendiente.

Pendiente de la pieza común: la **paleta** (se construye con la demo de la landing, fase 4, que es donde se elige).
