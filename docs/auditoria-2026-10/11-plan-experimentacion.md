# 11 · Plan de experimentación

## 0. Qué se puede y qué no se puede probar hoy

Con menos de 100 visitas en dos meses, **un A/B clásico no produce resultados estadísticos**. Regla de cálculo (aproximada, la de Lehr: 80 % de potencia y 5 % de significancia): visitantes por variante ≈ 16 · p · (1 − p) ÷ δ², donde p es la tasa base y δ la mejora absoluta que se quiere detectar.

| Tasa base p | Mejora relativa a detectar | Visitantes por variante |
|---|---|---|
| 3 % | +50 % | ≈ 2,069 |
| 3 % | +25 % | ≈ 8,277 |
| 10 % | +25 % | ≈ 2,304 |

Conclusión: **hasta tener miles de visitas por mes, se aprende con pruebas cualitativas, comparaciones antes y después y métricas de pasos tempranos** (con p más alta, como «clic a la galería»). Los A/B reales llegan en la fase de optimización, si el tráfico lo permite. Nunca declarar un ganador con unas decenas de visitas.

## 1. Experimentos

| ID | Hipótesis | Cambio | Métrica principal | Método y mínimo para decidir | Criterio |
|---|---|---|---|---|---|
| E1 | Mostrar el producto en el primer pantallazo hace que más gente entre a la galería | Hero con plantillas reales (ya en producción) | Clic a «Empezar a diseñar» ÷ visitas de la home | Antes y después con Vercel Analytics; comparar 2 semanas contra las 2 anteriores; leer como tendencia, no como prueba | Mantener si no baja; quitar solo con evidencia de daño |
| E2 | Las 5 tarjetas de evento acortan el camino | Alternativa B de la landing | De home a ver una plantilla | Antes y después | Mantener si sube; ≥ 300 visitas por periodo para fiarse |
| E3 | Aclarar QR y plan reduce la duda de quien compara | Landing C y texto de precios | Tiempo en `/pricing` y clic a registrarse | Antes y después; 5 entrevistas | Mantener si las entrevistas lo entienden sin explicación |
| E4 | Una lista de progreso aumenta los borradores completos | Editor C | `complete_draft` ÷ `start_customization` | Antes y después; si hay ≥ 100 inicios por periodo, A/B | Mejora relativa ≥ 25 % con ≥ 2,000 por variante o decisión cualitativa con 5 sesiones |
| E5 | Personalizar con tus nombres antes del editor sube el paso a editar | Ficha C | Usar ÷ vistas de ficha | Antes y después; 5 sesiones | Igual que E4 |
| E6 | Recomendar plan en el editor reduce el abandono en el pago | Precios B / recomendación en el editor | `begin_checkout` ÷ `view_pricing` | Antes y después | Mantener si no sube el abandono |
| E7 | Un servicio asistido visible genera solicitudes | Columna «Hecho por Sobrely» como piloto | Solicitudes ÷ visitas a `/pricing` | 5 clientes piloto; registrar horas y satisfacción | Seguir si el margen por cliente es positivo (ver `09`) |
| E8 | Un canal (alianzas, orgánico o Meta) trae compradores a costo razonable | Un solo canal activo por vez durante 2 semanas | Costo por inicio y por compra por canal | Comparar canales con `utm`; presupuesto de prueba acotado | Duplicar el que dé mejor costo por compra; no comparar canales con volumen distinto sin ajustar |

## 2. Reglas de higiene

1. Un cambio por vez en la misma página, con fecha de inicio y fin anotadas.
2. Excluir tráfico del equipo (IP o parámetro) y las cuentas de prueba del conteo.
3. Registrar siempre: qué se cambió, cuándo, el tráfico del periodo y cualquier evento externo (campaña, publicación, festivo).
4. No mezclar la lectura de SEO (semanas o meses) con la de conversión (días).
5. Los pagos solo cuentan cuando el backend los confirmó.

## 3. Pruebas cualitativas (las que sí caben hoy)

| Prueba | Cuántas | Qué se aprende |
|---|---|---|
| Sesiones con 5 a 8 personas que organizan un evento, sin ayudar | 5 a 8 | Dónde dudan en el editor y en el pago |
| «Prueba de 5 segundos» de la landing | 10 personas | Si entienden qué es y qué hacer |
| Revisión en 3 dispositivos reales (iPhone, Android gama media, tablet) | 3 | Lo que el emulador no muestra |
| Pasada de accesibilidad con VoiceOver y TalkBack | 1 | Anuncios, orden y etiquetas |

## 4. Seguimiento semanal (15 minutos)

Visitas, inicios de personalización, borradores completos, pagos iniciados, compras, ingresos, impresiones y clics de Search Console, y qué se cambió. Si una semana no hay datos, anotar «sin datos» y no inventar tendencia.
