# Recordatorios por correo (Fase 5) — operación

Estado de fábrica: **APAGADO**. Desplegar el código no envía un solo correo.

## Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Para qué | Notas |
|---|---|---|
| `REMINDERS_ENABLED` | Interruptor general | Solo el valor exacto `1` enciende. Quitarla apaga. |
| `REMINDERS_DRY_RUN` | Corrida en seco | `1` = cuenta a quién se escribiría y NO reclama ni envía. No exige llave ni remitente. |
| `CRON_SECRET` | Credencial del cron | Vercel la manda como `Authorization: Bearer`. Sin ella la ruta responde 503. |
| `REMINDER_SECRET` | Firma los enlaces de baja | ≥ 32 caracteres. **Rotarla invalida los enlaces de correos ya enviados** (la baja del panel sigue sirviendo). |
| `REMINDER_FROM` | Remitente | p. ej. `Sobrely <hola@sobrely.com>`; el dominio debe estar verificado en Resend. |
| `RESEND_API_KEY` | Llave de Resend | Nunca en una variable `NEXT_PUBLIC_*`. |
| `NEXT_PUBLIC_SITE_URL` | Origen de los enlaces | Debe estar definida; sin ella no se envía. |

## Orden para encenderlo

1. Aplicar `supabase/migrations/0061_recordatorios.sql` (a mano, como las demás). Sin ella el panel oculta la opción y el cron no encuentra tablas.
2. Definir las variables **con `REMINDERS_DRY_RUN=1`** y `REMINDERS_ENABLED=1`.
3. Llamar al cron a mano y leer el resumen (`habriaEnviado`):
   `curl -H "Authorization: Bearer $CRON_SECRET" https://sobrely.com/api/cron/recordatorios`
4. Quitar `REMINDERS_DRY_RUN`. El cron (`vercel.json`, 15:00 UTC ≈ 9:00 CDMX) corre una vez al día.

## Apagar

Quitar `REMINDERS_ENABLED` (o ponerlo distinto de `1`). La ruta responde 200 `{desactivado:true}` sin tocar nada.

## Qué garantiza el sistema

- Solo recibe quien activó el interruptor en su panel. Sin fila = sin consentimiento.
- Como máximo un correo por persona por día; cada (invitación, tipo) sale una sola vez.
- Ventanas acotadas: un borrador con más de 7 días sin tocar (y sin evento cercano) no recibe nada.
- Cada correo lleva baja (enlace + `List-Unsubscribe` de un clic, RFC 8058).
- Máximo 50 correos por corrida.

## Límites conocidos

- La corrida lee hasta 1,000 personas con consentimiento y 500 borradores (`almacen.ts`).
- El tope es **por día**, no por semana: una persona con varios borradores recibe uno por día, cada uno una sola vez.
- Los registros de `reminder_log` no se limpian (una fila por correo enviado).
