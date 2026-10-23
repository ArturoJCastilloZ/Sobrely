# Reconciliación de pagos (red de seguridad del webhook)

Estado de fábrica: **APAGADO** (`RECONCILE_ENABLED` sin definir). Desplegar el código no activa nada.

## Por qué existe

Aplicar un pago depende de que el webhook de Mercado Pago llegue **y** de que su
firma valide. En la prueba de sandbox del 2026-10-23 las notificaciones de pagos
**reales** recibieron `401 firma inválida` con el secreto del panel (las del
simulador del panel sí validaron). Con eso, un cliente que paga se queda sin su
invitación publicada y nadie se entera: la página de éxito no activa nada a propósito.

Este job no depende de la notificación: toma las órdenes `pending` de Mercado Pago
y le pregunta a Mercado Pago, por `external_reference`, si tienen un pago aprobado.

## Qué hace y qué NO hace

- Aplica con **la misma función que el webhook** (`applyMercadoPagoPayment`), que ya
  es idempotente: si el webhook llega después, no duplica nada.
- Solo aplica un pago `approved` que apunte a esa orden **y** cuyo **monto y moneda**
  coincidan con los de la orden. Si no coinciden (o faltan) **no aplica** y lo cuenta
  en `montoNoCoincide`: significa que se cobró algo distinto de lo vendido. Revísalo.
- No toca órdenes de menos de 10 minutos (el webhook normal tiene margen) ni de más
  de 30 días (un checkout abandonado no es un pago perdido).
- Máximo 50 órdenes por corrida. Solo lee la base; escribir lo hace `applyMercadoPagoPayment`.

## Cómo encenderlo

1. Variables (Vercel): `CRON_SECRET` (sin ella la ruta responde 503) y `RECONCILE_ENABLED=1`.
2. `vercel.json` ya programa `/api/cron/reconciliar-pagos` **una vez al día** (16:00 UTC).
   En el plan Hobby un cron más frecuente hace fallar el despliegue entero. Con plan Pro
   puedes bajarlo a cada 15 minutos para que un cliente no espere hasta 24 h.
3. Prueba a mano: `curl -H "Authorization: Bearer $CRON_SECRET" https://sobrely.com/api/cron/reconciliar-pagos`
   y lee el resumen. Para apagarlo, quita `RECONCILE_ENABLED`.

## Resumen de la respuesta

`revisadas`, `aplicadas`, `sinPagoAprobado`, `montoNoCoincide`, `errores` y los ids de
las órdenes aplicadas (UUID, sin datos personales). `montoNoCoincide > 0` o
`errores > 0` de forma sostenida merecen atención.

## Resultado de la prueba (Supabase local + pagos reales del sandbox de Mercado Pago)

| Caso | Resultado medido |
|---|---|
| Sin credencial / incorrecta | 401 |
| 4 órdenes `pending` sin pago en Mercado Pago | `revisadas:4, aplicadas:0, sinPagoAprobado:4, errores:0`; ninguna cambió |
| Orden con pago real aprobado pero monto local 400 (pago de 399) | `montoNoCoincide:1`, **no se aplicó**, sin cambios en la base |
| Mismo caso con el monto correcto (webhook «perdido») | `aplicadas:1`: orden `paid` con el id de pago, entitlement `active`, invitación publicada, vigente en la función pública |
| Segunda corrida | `aplicadas:0` (ya no está pendiente); 2 órdenes `paid`, 2 entitlements |

## Lo que NO se verificó

- Una corrida en **producción** (otra base, otras credenciales).
- Que Vercel Cron la dispare (plan, hora).
- Un pago aprobado con **varios intentos** para la misma orden (cubierto por prueba de unidad, no con pagos reales).

## Hallazgos que quedan abiertos

1. **Firma de las notificaciones de pagos reales.** Con el secreto del panel (modo
   prueba) validan las del simulador y NO las reales. Hipótesis sin confirmar: el
   token de prueba es de un usuario vendedor de prueba y sus pagos se notifican
   firmados por otra aplicación. Antes de cobrar de verdad hay que confirmar con
   un pago real pequeño en producción y el secreto del **modo producción**.
2. **El webhook no compara el monto del pago con el de la orden.** `fulfillment.ts`
   marca `paid` con solo `approved` + `external_reference`. Este job sí lo compara.
   Con el checkout actual no es explotable (el monto lo fija el servidor al crear la
   preferencia), pero es una defensa barata que conviene añadir al camino del webhook.
3. La página de éxito (`/billing/success`) trae `payment_id` y `status=approved` en la
   URL. Se podría reconciliar ahí mismo, verificando contra Mercado Pago, para que el
   cliente no espere al cron. No se hizo: contradice la regla actual de que solo el
   webhook activa planes y es decisión del dev.
