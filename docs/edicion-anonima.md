# Edición sin cuenta (sesiones anónimas)

> Estado: **en desarrollo** (`feature/edicion-anonima`). Decisión del dev (2026-10-23): el
> visitante ve las plantillas, elige una y la **edita sin cuenta**; la cuenta se pide **al
> publicar**, y no debe perder lo que diseñó. Sustituye al «camino barato» de
> `FUNNEL_PLAN.md` (correo al elegir plantilla).

## 1. Cómo funciona

```
galería → «Usar esta plantilla» → sesión anónima + borrador → editor (sin cuenta)
   → «Publicar» → «Crea tu cuenta» → correo o Google (MISMO usuario, mismo borrador)
   → plan de pago → publicada
```

La clave de «no perder la invitación»: Supabase **convierte** la sesión anónima en cuenta
permanente (`updateUser({ email })` / `linkIdentity`). Es el **mismo `user_id`**, así que
`invitations.user_id` no cambia y el borrador sigue siendo suyo. Esto se **midió** en una base
local (ver §7); la documentación oficial no lo afirma explícitamente.

Si el correo **ya tiene cuenta**, la conversión falla (la documentación lo dice). Entonces la
persona inicia sesión en su cuenta y, **en esa misma petición**, sus borradores anónimos se
**trasladan** a ella (`src/lib/auth/traspaso.ts`).

## 2. Qué se tocó

| Zona | Cambio |
|---|---|
| Migración `0062` | Tope de invitaciones por anónimo, un anónimo **no puede publicar** (a nivel de BD), tope de archivos por anónimo, y el bucket `invitation-images` limitado a imágenes ≤ 10 MiB |
| Auth | `empezarComoInvitado`, conversión por correo/Google, traslado en `login` y en el callback, `/login` y `/register` abiertos a sesiones anónimas |
| Publicar | `setPublished` devuelve `needsAccount` a un anónimo; el editor muestra «Crea tu cuenta para publicar» |
| Pagos | `createPlanCheckout` y `/billing/checkout` rechazan a un anónimo |
| Recordatorios | La tarjeta y la acción de consentimiento rechazan a un anónimo (no tiene correo) |
| Limpieza | `/api/cron/limpiar-invitados` borra anónimos inactivos sin nada publicado ni pagado |

## 3. Modelo de amenazas (STRIDE)

**Activos:** el contenido que la persona diseñó; la cuenta y los datos de quien ya está
registrado; el almacenamiento público (`invitation-images`); el cobro; la reputación del
dominio como hospedaje de archivos.

**Fronteras de confianza:** (1) navegador anónimo → servidor; (2) servidor → Supabase Auth;
(3) servidor → base con el JWT del usuario (RLS) o con `service_role`; (4) navegador →
Storage directo (la subida de imágenes no pasa por nuestro servidor).

| | Amenaza | Mitigación | Prueba |
|---|---|---|---|
| **S** | Tomar la cuenta de otro al convertir un correo ajeno | Supabase exige verificar el correo antes de que la conversión surta efecto; nuestro código no marca nada como verificado | e2e local |
| **S** | Robar los borradores anónimos de OTRO al iniciar sesión (traslado) | El traslado exige **dos pruebas en la misma petición**: la sesión anónima (validada con `getUser()` en el servidor) y la credencial de la cuenta destino. Nunca se acepta un id anónimo del cliente | `traspaso.test.ts` |
| **S** | Inicio de sesión forzado (login CSRF) que mueve borradores de la víctima a una cuenta ajena | Las Server Actions verifican `Origin`; en OAuth el verificador PKCE vive en una cookie del navegador que inició el flujo | revisión + e2e |
| **T** | Un anónimo se pone `is_published = true` llamando a la API directo | Disparador en la BD que lo impide, además del chequeo del servidor (defensa en profundidad) | e2e + SQL |
| **T** | Cookie de intención manipulada para redirigir | Ya existente: `rutaInternaSegura` al leer y al escribir | existentes |
| **R** | Un anónimo niega haber creado contenido | No aplica: sin identidad no hay repudio útil; el id anónimo queda en la base | — |
| **I** | Enumeración de correos al convertir («ya existe») | Aceptado: ya ocurre en `register`. Mitigado por el límite de tasa de Auth | — |
| **I** | Un anónimo lee datos de otros | Sin cambio: las políticas RLS ya filtran por `auth.uid()`; un anónimo solo ve lo suyo | e2e (dos anónimos) |
| **D** | Crear miles de sesiones anónimas (cada una es una fila en `auth.users`) | Límite de Auth de 30/h/IP (configurable); limpieza diaria; **CAPTCHA recomendado y NO activado** (ver §5) | — |
| **D** | Un anónimo llena el almacenamiento | Bucket limitado a imágenes ≤ 10 MiB; tope de **20 archivos** por anónimo (política restrictiva) | e2e + SQL |
| **D** | Un anónimo crea invitaciones sin fin | Tope de **3 por anónimo** (disparador) | e2e + SQL |
| **E** | Un anónimo paga, publica o pide recordatorios | Rechazo en `setPublished`, `createPlanCheckout`, `/billing/checkout` y recordatorios | tests |
| **E** | `service_role` usado con un id que viene del cliente | El traslado y la limpieza solo usan ids leídos en el servidor, de la sesión o de la base | revisión |

**Casos de abuso:** (a) un bot abre 30 sesiones por hora por IP y sube 20 imágenes de 10 MiB
cada una → 6 GB/h por IP: **por eso el límite de tamaño y de cantidad van en la BD y no en
el navegador**; (b) alguien usa el bucket público como hospedaje de archivos → la lista de
tipos permitidos excluye SVG y todo lo que no sea imagen.

## 4. Decisiones y supuestos

1. **El traslado es automático al iniciar sesión** (no pide confirmación): es lo que evita
   perder el borrador. El costo: quien tenía un borrador anónimo y entra a su cuenta lo recibe
   en ella. Es reversible (puede borrarlo).
2. **Sin contraseña al convertir.** Supabase solo deja poner contraseña **después** de
   verificar el correo. La cuenta convertida entra por «Olvidé mi contraseña» o Google.
3. **Tope de 3 invitaciones y 20 archivos por anónimo.** Números míos; cámbialos en `0062`.
4. **`username` queda como `user-xxxxxx`** (el disparador de perfiles lo deriva del correo y
   un anónimo no tiene). Es cosmético.

## 5. Riesgos aceptados (con su condición de revisión)

- **CAPTCHA no activado.** Supabase lo recomienda para sesiones anónimas, pero activarlo en el
  proyecto lo exige en **todas** las formas de autenticación (login, registro, recuperar
  contraseña), y eso obliga a poner el widget en cada una. Compensado por: límite de 30/h/IP,
  topes en la BD y limpieza. **Revisar si** aparecen más de unos cientos de anónimos al día
  o crece el almacenamiento sin explicación.
- **Enumeración de correos** al convertir. Revisar si se añade un límite de tasa propio.

## 6. Lo que el dueño del proyecto debe configurar (no lo puede hacer el código)

En el panel de Supabase del proyecto de producción, **antes** de desplegar esto:
1. **Authentication → Sign In / Providers → Allow anonymous sign-ins: ON.**
2. **Authentication → Sign In / Providers → Allow manual linking: ON** (para vincular Google).
3. Revisar el límite de «Anonymous users» por hora e IP (30 por defecto).
4. Aplicar la migración `0062`.
5. Variables en Vercel: `CLEANUP_INVITADOS_ENABLED=1` (y `CRON_SECRET`, que ya hace falta).

Sin (1) y (2) el botón «Usar esta plantilla» fallará con un aviso, sin romper el resto del sitio.

## 7. Verificación

(se completa al terminar: resultados medidos en base local y en navegador)
