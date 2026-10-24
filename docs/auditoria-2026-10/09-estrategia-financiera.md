# 09 · Estrategia financiera y de precios

**Qué es medido, qué es supuesto.** Los precios de Sobrely salen de `plans.ts` y `services.ts` [CÓDIGO]. Los de la competencia son los leídos en sus páginas oficiales el 23 oct 2026 (ver `03`). **No tengo** tu tarifa de Mercado Pago, el plan de Vercel y Supabase, ni tu costo de tiempo. Esas cifras son **supuestos marcados** y los números de abajo se recalculan cambiando un parámetro. Nada aquí es una promesa de resultado.

## 1. Precios actuales y posición

| Plan de Sobrely | Lanzamiento | Regular | Invitados | Qué suma |
|---|---|---|---|---|
| Free | $0 | $0 | 25 | Borradores ilimitados y vista previa; no publica |
| Esencial | $199 | $299 | 100 | Portada, cuenta regresiva, mapa, regalos, RSVP |
| Celebración | $399 | $499 | 250 | Galería, itinerario, dress code, música, sin marca, arte propio |
| Premium | $699 | $899 | Ilimitados | Video, soporte prioritario, revisión visual |

Servicios asistidos existentes (solo dentro del panel, pago manual): configuración por WhatsApp $299, carga de fotos y textos $299, renovación desde $199, portada a la medida desde $499, invitación express creada por el equipo desde $1,499.

Frente al mercado verificado: Evently desde $149; Festea $179 y $399; Convite $199, $299 y $399; Invitto gratis y $349; Olivia $499, $1,290 y $3,490; Casa Convite (a mano) $390, $990 y $1,790. **El precio de entrada de $199 es competitivo, no es una ventaja decisiva.** Lo que cobra más sentido defender es el valor: catálogo, QR y edición sin cuenta.

**Cuidado con el precio tachado.** La campaña de lanzamiento tacha $299, $499 y $899. Si esos precios «regulares» no se cobran de verdad después de una fecha publicada, el tachado puede percibirse como engañoso [no revisé la normativa del consumidor; consultar a un abogado]. Fijar la fecha de cierre en `NEXT_PUBLIC_LAUNCH_CAMPAIGN_END_DATE`, comunicarla, y no usar descuentos permanentes como ventaja.

## 2. Rentabilidad por plan (modelo)

Supuesto: **tarifa efectiva de Mercado Pago del 4.5 %** [NO VERIFICADO: revisar tu tarifa real, comisión más IVA y costo fijo por operación].

| Plan | Precio | Tarifa | Contribución |
|---|---|---|---|
| Esencial | $199 | $9.0 | $190.0 |
| Esencial regular | $299 | $13.5 | $285.5 |
| Celebración | $399 | $18.0 | $381.0 |
| Celebración regular | $499 | $22.5 | $476.5 |
| Premium | $699 | $31.5 | $667.5 |
| Premium regular | $899 | $40.5 | $858.5 |

Costo marginal de una venta de autoservicio: cercano a cero (almacenamiento y correo son mínimos) [ESTIMACIÓN]; la contribución es, en la práctica, el precio menos la tarifa de pago, más el tiempo de soporte.

Mezcla de ejemplo (60 % Esencial, 30 % Celebración, 10 % Premium, **hipótesis**): ticket promedio de $309 en lanzamiento y $419 a precio regular; contribución de $295.1 y $400.1.

## 3. Punto de equilibrio

Fórmula: ventas por mes = costos fijos mensuales ÷ contribución promedio.

| Costos fijos mensuales (escenarios) | Ventas/mes a precio de lanzamiento | Ventas/mes a precio regular |
|---|---|---|
| $1,500 | 5.1 | 3.7 |
| $3,000 | 10.2 | 7.5 |
| $6,000 | 20.3 | 15.0 |

Los costos fijos reales (infraestructura, dominio, correo, herramientas, tu tiempo) **hay que reunirlos**; sin ellos el punto de equilibrio no es una cifra, es una tabla.

## 4. Costo de adquisición

Una venta no pierde dinero si el costo por venta es menor que la contribución. Con $295 de contribución:

| Costo por clic [SUPUESTO] | Conversión visita → compra necesaria |
|---|---|
| $3 | 1.02 % |
| $5 | 1.69 % |
| $8 | 2.71 % |

Hoy no se conoce esa conversión. Por eso la inversión pagada espera a que haya medición (ver `07` y `08`).

**Comisión a aliados** (planners, salones, fotógrafos): 15 % del ticket promedio son $46.4; la contribución baja a $248.7. Olivia Estudio paga $200 por un Premium referido (verificado en su página): sirve de referencia, no de regla.

## 5. Servicio asistido: ¿$999?

La hipótesis de $999 tiene sentido frente a Casa Convite ($390 a $1,790) y Olivia Signature ($3,490), pero **depende por completo de cuántas horas consume cada cliente**. Supuesto: costo interno de $250 por hora.

Tres formas de empaquetarlo (contribución por venta, incluida la tarifa del 4.5 %):

| Paquete | 1 h | 2 h | 3 h |
|---|---|---|---|
| A · $999 de servicio, el cliente paga además su plan (Celebración $399) | $1,085 | $835 | $585 |
| B · $999 con el plan incluido | $704 | $454 | $204 |
| C · $1,299 con el plan incluido | $990.5 | $740.5 | $490.5 |

Lectura: con 3 horas por cliente, el paquete B casi no deja margen; el A y el C son más sanos. Para que el servicio escale se necesita límite explícito: **una plantilla, hasta 8 secciones, 2 rondas de revisión y entrega en 48 horas**, con los textos y fotos entregados por el cliente. Hoy existe «invitación express por el equipo» desde $1,499 y «carga de fotos y textos» a $299, ambos solo dentro del panel.

**Piloto antes de publicar precio:** 5 clientes reales, registrando las horas por cliente. Con ese dato se decide entre A, B y C. No fijar el precio público antes.

## 6. Otras fuentes de ingreso (evaluadas, sin construir)

| Idea | Evidencia | Comentario |
|---|---|---|
| Renovación de vigencia | Existe desde $199 | Revisar que sea visible para quien tiene un evento recurrente |
| Complemento de QR y check-in | Convite lo cobra desde $299; Casa Convite desde $990 | Primero decidir en qué plan va (`01` §5) |
| Meses sin intereses | Olivia los anuncia | [NO VERIFICADO] si tu cuenta de Mercado Pago los permite y a qué costo |
| Paquete para planners | Olivia tiene referidos | Panel con varias invitaciones y precio por volumen; depende de validar interés |
| Álbum colaborativo | Convite y Olivia lo ofrecen | Decisión del dueño: dormido |

## 7. Qué reunir para cerrar el modelo

1. Tarifa real de Mercado Pago (comisión, IVA, costo fijo, meses sin intereses).
2. Plan y costo mensual de Vercel, Supabase, dominio, correo (Resend) y herramientas.
3. Horas reales por cliente del piloto asistido.
4. Costo mensual de tu tiempo si se quiere incluir.
5. Tasa visita → compra medida (cuando haya tráfico).

Con eso, `estimate-budget` y `estimate-duration` pueden convertir esta tabla en un modelo con escenarios optimista, base y conservador.
