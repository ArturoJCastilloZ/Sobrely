# 04 · Auditoría UI/UX

Fecha: 23–24 oct 2026. Alcance real: **viewport de escritorio (1024 y 800 px de captura) y móvil emulado de 375 px**, en el navegador integrado, sobre producción y sobre el entorno local (el mismo código). **No se probó en iPhone ni Android reales, ni en tablet, ni con lector de pantalla, ni con herramienta de contraste.** Por eso los hallazgos de esas áreas son preguntas abiertas, no conclusiones.

Método: heurísticas de Nielsen y principios de Krug, con la severidad de 0 a 4. Cada hallazgo cita lo que medí.

## 1. Lo que funciona (conservar)

- **Identidad coherente:** negro mate, beige, dorado, serif en titulares y sans en lo secundario; tema claro y oscuro, ahora con interruptor en todas las páginas públicas.
- **Precio a la vista en cada plantilla** de la galería («$199 ~~$299~~ para publicar»). Es raro en el sector y reduce sorpresas.
- **Editor móvil usable:** barra inferior con Secciones, Portada, Diseño global y Ajustes; vista previa Móvil o Escritorio; deshacer y rehacer; **plantillas con contenido de ejemplo** («Mis XV años», «Nuestra boda»), no lienzos vacíos.
- **Lista previa a publicar** con 5 puntos (fecha, ubicación, RSVP, música, código de vestimenta): previene errores sin bloquear.
- **Edición sin cuenta** y modal de cuenta solo al publicar, con el mensaje «Tu invitación se queda como la diseñaste».
- **Sin desborde horizontal** a 375 px en las seis páginas públicas revisadas.

## 2. Hallazgos

| ID | Sev. | Hallazgo | Evidencia | Corrección |
|---|---|---|---|---|
| U1 | 3 | La landing no mostraba el producto: solo texto y chips | Captura previa al hero nuevo; 0 imágenes, 321 palabras | Hero con plantillas reales (ya en producción, falta validar); considerar la demostración interactiva |
| U2 | 3 | El QR no se explica ni se vincula a un plan; `/pricing` no lo menciona | `grep` y respuesta HTML de `/pricing` | Resolver la decisión de plan y comunicarla (ver `01`) |
| U3 | 3 | Vista previa social rota (sin `og:image`) en `/pricing` y 5 landings | 2 etiquetas OG en vez de 11 | Agregar imagen en la metadata propia |
| U4 | 2 | Galería muy larga en móvil y un solo filtro | 14 900 px de alto, 65 tarjetas, filtro por evento | Filtros de estilo y precio; colecciones; paginar o cargar por tramos |
| U5 | 2 | Botones táctiles pequeños en el encabezado público y en la barra superior del editor móvil | 28 px (encabezado), 32 px (tema), 28 px (Volver, Deshacer, Rehacer, Publicar) | Subir a 44 px el área táctil, sin cambiar el aspecto; Publicar es la acción principal |
| U6 | 2 | 409 KB de fuentes en cada página, la mayoría decorativas para el editor | 14 archivos woff2, 409 KB, medidos en la home | Cargarlas solo donde se usan |
| U7 | 2 | Creación de cuenta con verificación de correo en mitad del embudo | Flujo de conversión por correo: abrir el correo y volver | Priorizar Google; avisar «revisa tu correo, te esperamos»; mantener el borrador (ya se mantiene) |
| U8 | 2 | Tres planes con diferencias técnicas (módulos, invitados) difíciles de traducir a necesidades | `plans.ts`, `/pricing` | Plan recomendado visible; selector de 2 preguntas (ver propuesta de precios B) |
| U9 | 1 | Texto «borradores ilimitados» vs. tope de 3 sin cuenta | Copy y migración 0062 | Matizar: «Sin cuenta, hasta 3 borradores» |
| U10 | 1 | Ficha de plantilla sin resumen de qué incluye | Ficha `/plantillas/[slug]` | Resumen de módulos, invitados y qué pasa al pulsar |
| U11 | — | **No evaluado:** tablet, dispositivos reales, lector de pantalla, contraste, teclado completo, rendimiento percibido en 3G | Sin herramienta o dispositivo | Plan en `11` y en el roadmap: sesión con 3 dispositivos y una pasada con VoiceOver y TalkBack |

## 3. Estados, formularios, modales y tablas

- **Estados de carga:** el editor muestra «Cargando editor…»; la creación de borrador usa «Abriendo el editor…». Aceptable.
- **Errores:** mensajes en español, con la acción a seguir («Ese correo ya tiene cuenta. Inicia sesión y conservamos tu invitación»). Mantener ese tono.
- **Modal de cuenta:** tiene etiqueta, foco y botón de cerrar; nombre accesible por `aria-label` en el botón de tema. No se probó con lector de pantalla.
- **Tablas:** el panel de administración y el de facturación usan tablas; no se auditaron en móvil.
- **Estados vacíos:** el panel de usuario sin invitaciones y la galería sin resultados existen; no se revisaron todos.

## 4. Mobile-first

El tráfico esperado de invitaciones y de campañas en redes es mayoritariamente móvil [ESTIMACIÓN: sin datos propios; con Vercel Analytics se puede ver el reparto por dispositivo]. Lo medido: la landing y la galería no desbordan a 375 px, el hero apila el texto y las tarjetas, el editor ofrece barra inferior. Falta: áreas táctiles de 44 px en cabeceras, y el peso de las fuentes.

## 5. Accesibilidad (WCAG 2.2)

- Cumple el mínimo de tamaño de objetivo de 24 px en lo medido (AA 2.5.8).
- Todas las imágenes con atributo `alt`; las decorativas con `alt=""` a propósito.
- Un `h1` por página indexable; jerarquía de encabezados correcta en las landings.
- **Sin comprobar:** contraste de los textos secundarios (`text-muted-foreground` sobre beige y sobre negro), orden de tabulación en el editor, anuncio de errores del formulario de cuenta, movimiento reducido en las animaciones de las invitaciones. Son pruebas baratas con una herramienta, y no las hice.
