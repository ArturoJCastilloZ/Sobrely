# 13 · Lista para la revisión humana (T08)

Fecha: 24 oct 2026. Es la guía para quien revise el código de **autenticación, pagos y datos** que ya está en producción. Prepararla no sustituye la revisión: es lo que se puede adelantar para que el revisor gaste su tiempo en decidir y no en buscar. Tiempo estimado del revisor: 0.5 a 1 día (`10`, T08).

## 0. Cómo leer esto

- **Verificado** = lo corrí yo contra la base o el almacenamiento locales (mismo código y mismo esquema que producción) y el resultado está al lado. **Sin verificar** = hipótesis a comprobar.
- Los números de línea son del commit `34b5c3f` (`main` a esta fecha).
- Todo lo que sigue ya está desplegado salvo lo marcado «commit pendiente».

## 1. Hallazgos de la preparación

| # | Hallazgo | Estado | Gravedad |
|---|---|---|---|
| H1 | Un invitado puede **insertar** una invitación ya publicada (`is_published = true`, `status = 'published'`) llamando a la API directo: el disparador `impedir_publicar_anonimo` solo corre en `UPDATE`. | **Verificado**, abierto | Baja |
| H2 | La limpieza de invitados **no borraba los archivos** del almacenamiento. | **Verificado y corregido** (commit pendiente) | Media, sin daño aún: el cron está apagado |
| H3 | La limpieza mide «actividad» con `last_sign_in_at`, no con ediciones. | Lectura de código, **decisión tuya** | Media si se enciende tal cual |
| H4 | El traspaso de borradores mueve las invitaciones, pero no los archivos subidos mientras eran invitado. | **Sin verificar** | Baja |
| H5 | Sin CAPTCHA, cada visita puede abrir sesiones anónimas con 3 borradores y 20 archivos de hasta 10 MiB cada una. | Riesgo conocido | Media si hay abuso |

### H1 · Insertar publicada
- **Prueba** (transacción con JWT anónimo, revertida): `INSERT ... is_published = true, status = 'published'` → aceptado. `UPDATE ... is_published = true` → `ANONIMO_NO_PUBLICA`. El cuarto `INSERT` → `LIMITE_ANONIMO_INVITACIONES`.
- **Por qué importa poco:** la RPC pública exige `is_published` **y** `is_entitlement_active(...)`, y `invitation_entitlements` solo tiene política de lectura para `authenticated` (sin política de escritura: la escritura es del servicio). Sin acceso pagado no se sirve. Lo que sí pasa es que su propio panel la marcaría «publicada».
- **Arreglo propuesto:** extender el disparador a `before insert or update` (una migración `0065`). **No se aplicó**: tocar producción requiere tu visto bueno.

### H2 · Limpieza sin borrar archivos
- **Causa:** los archivos viven en `<usuario>/<invitación>/<archivo>`. `list('<usuario>')` devuelve **carpetas** (sin `id`); `remove(['<usuario>/<invitación>'])` responde `[]` y el archivo sigue ahí.
- **Prueba:** subí un archivo con esa ruta, repetí lo que hacía el adaptador y el archivo seguía existiendo.
- **Arreglo:** `src/lib/auth/limpiar-invitados-almacen.ts` recorre las carpetas y devuelve la ruta de cada archivo; el adaptador compara lo borrado con lo pedido. **Verificado** contra el almacenamiento local: 3 rutas, 3 borradas, 0 restantes. Prueba unitaria incluida.
- **Para el revisor:** confirmar que el adaptador (`limpiar-invitados-adaptadores.ts`) solo borra bajo `<usuario>/` del invitado y nunca con un prefijo vacío.

### H3 · Qué cuenta como «inactivo»
`candidatos()` usa `last_sign_in_at ?? created_at`. Un invitado que sigue editando con su sesión (el token se renueva sin un inicio de sesión nuevo) pasa por «inactivo» a los 30 días aunque su borrador se haya tocado ayer. `tieneAlgoQueProteger` solo protege publicaciones y órdenes. **Decisión:** medir también `invitations.updated_at` antes de encender `CLEANUP_INVITADOS_ENABLED`. Mientras esté apagado no hay riesgo.

### H4 · Archivos tras el traspaso
`moverInvitaciones` cambia `user_id` de las invitaciones; las imágenes quedan en `<anónimo>/…`. Verificar: (a) que la invitación trasladada sigue mostrando sus imágenes (las URL son públicas, debería); (b) si «Vaciar» o el borrado de la invitación buscan en `<nuevo usuario>/<invitación>/` y por eso dejan huérfanas las anteriores; (c) si la política de borrado de `storage.objects` permite al nuevo dueño quitarlas. No lo comprobé.

### H5 · Abuso de sesiones anónimas
Los topes (3 invitaciones, 20 archivos por sesión) acotan cada sesión, no el número de sesiones. Lo acota la configuración de Supabase para inicios de sesión anónimos (verificar el valor en el panel). El plan lo deja a CAPTCHA «si hay abuso» (T32). Decisión: si se acepta ese riesgo hasta ver tráfico.

## 2. Bloque A · Edición sin cuenta (en producción desde el 23 oct)

Migración y 28 archivos de código. Orden sugerido, de más a menos riesgo:

| Archivo | Líneas | Qué es | Qué verificar |
|---|---|---|---|
| `supabase/migrations/0062_edicion_anonima.sql` | 147 | Disparadores de tope de invitaciones y de no publicar, política restrictiva de almacenamiento, límites del bucket | H1. `es_sesion_anonima()` es `false` sin JWT (el cron y el servicio no quedan frenados). Que el tope se cuente solo sobre filas visibles al propio usuario. Condición de carrera: dos `INSERT` simultáneos podrían pasar de 3 (no hay bloqueo); aceptable o no. Que el límite de 10 MiB y los MIME no rompen cargas existentes (se midió: 59 archivos, todos JPEG, máx. 780 KB). |
| `src/lib/auth/traspaso-regla.ts` + `traspaso-ejecucion.ts` + `traspaso.ts` | 52 + 74 + 78 | Cuándo y cómo se mueven borradores de una sesión anónima a una cuenta, y se borra al anónimo | Que el origen **solo** puede ser anónimo y el destino real. Que `origenId` sale de `getUser()` en servidor, nunca del cliente. Que el anónimo se borra solo si `movidas === antes` (la cascada de `auth.users` arrastraría lo no movido). H4. |
| `src/lib/auth/invitado.ts` | 115 | `empezarComoInvitado`, `convertirConCorreo` | Que `convertirConCorreo` exige sesión anónima. Que el enlace del correo usa `NEXT_PUBLIC_SITE_URL` y no cabeceras. Los errores no filtran si un correo existe (`email_exists` sí lo dice: valorar enumeración de cuentas). |
| `src/lib/supabase/middleware.ts` | +17 | Invitado: puede `/login`, no `/register` ni `/admin` | Que `/admin` sigue protegido en servidor (`requireAdmin`) y esto es solo el primer filtro. |
| `src/app/auth/callback/route.ts`, `src/lib/auth/actions.ts` | +7, +9 | Traspaso al iniciar sesión (Google y contraseña); `signOut` → landing | Que se lee la sesión anónima **antes** de reemplazarla. Que un fallo del traspaso nunca impide iniciar sesión. |
| `src/components/editor/crear-cuenta-dialog.tsx` | 132 | Modal de cuenta al publicar; Google usa `signInWithOAuth` | Que `destino` pasa por `rutaInternaSegura`. |
| `src/lib/auth/limpiar-invitados*.ts`, `src/app/api/cron/limpiar-invitados/route.ts` | 79 + 60 + 45 | Cron de limpieza (apagado de fábrica) | H2 y H3. Puertas: `CRON_SECRET` → 401 en tiempo constante → `CLEANUP_INVITADOS_ENABLED` → corrida. Antes de encenderlo: correr con `?dry=1` y revisar los ids. |
| `src/lib/invitations/actions.ts` (+13), `src/lib/billing/actions.ts` (+3), `src/lib/recordatorios/acciones.ts` (+4), `src/app/billing/checkout/page.tsx` | pequeños | Invitado no publica, no paga, no recibe recordatorios | Que `setPublished`, `createPlanCheckout` y los recordatorios rechazan `is_anonymous` también en el servidor. |

**Pruebas que ya existen:** `npx vitest run src/lib/auth` (68 tests: traspaso, limpieza, intención, ruta segura, inicio reciente).
**Probar la migración a mano** (local, dentro de una transacción con `rollback`): fijar `request.jwt.claims` con `"is_anonymous": true` y repetir los tres intentos de H1.

## 3. Bloque B · Eventos del embudo (T05) — toca pagos y auth

Migración `0063_funnel_events.sql` (aplicada; RLS activada, sin políticas, `anon` y `authenticated` sin permisos: verificado en producción).

| Archivo | Líneas tocadas | Qué verificar |
|---|---|---|
| `src/lib/billing/fulfillment.ts` | 192–200 (`payment_failed`), 460–468 (`purchase`) | Que `purchase` se emite solo con orden `paid`, entitlement activo y monto desde `order.amount`. Que la reentrada (orden ya `paid` sin acceso) también llega ahí. Que `registrarEvento` es `await`: añade una escritura de latencia antes de responder al webhook; no lanza, pero comprobar que no acerca la respuesta al tiempo límite de Mercado Pago. |
| `src/lib/billing/actions.ts` | 179–185 (`begin_checkout`); 172–177 y 253–259 (`registrarError`) | `begin_checkout` tras crear la orden; el valor sale del plan en servidor, no del cliente. |
| `src/lib/invitations/actions.ts` | 214–221 (`start_customization`), 628–640 (`complete_draft`), 355–361 (error al publicar) | Que se evalúa tras guardar y sin añadir consultas en el camino común. |
| `src/app/auth/callback/route.ts`, `src/app/auth/confirm/actions.ts` | 29–40 y 56–65 | `sign_up`: la regla pura `decidirRegistro` separa registro de inicio de sesión. Un enlace mágico de alguien nunca contado se cuenta una vez (documentado). |
| `src/app/api/embudo/route.ts`, `src/lib/analytics/visita-regla.ts` | 93 + 61 | Entrada hostil del navegador: mismo origen obligatorio, 1 KB, forma validada, bots descartados, tope de 300 por minuto, parámetros derivados de la base. Se puede falsificar una visita desde un script que copie `Origin` y un agente de navegador; no una compra. |
| `src/lib/analytics/embudo-regla.ts` | 90 | Lista permitida de parámetros: ningún dato personal puede entrar. La clave de idempotencia se guarda con sha256. |

**Pruebas:** `npx vitest run src/lib/analytics` (45 tests).

## 4. Bloque C · Registro de errores (T04) — toca pagos y auth

Migración `0064_error_events.sql` (aplicada; mismas comprobaciones).

| Archivo | Qué verificar |
|---|---|
| `src/lib/errores/regla.ts` | `limpiarMensaje` es defensa en profundidad, no garantía. Probar con mensajes reales de Supabase y Mercado Pago que se vean en producción. No se guarda el stack ni el cuerpo de peticiones. |
| `src/lib/errores/registrar.ts` | Alerta por correo: falla cerrado (`ALERTAS_ENABLED=1`, `ALERTAS_EMAIL`, `RESEND_API_KEY`, `REMINDER_FROM`). Un correo por hora y causa, tope de 10 por hora. El correo no lleva datos personales. |
| `src/instrumentation.ts` | `onRequestError` usa `context.routePath` (el patrón) y nunca `request.path`: la URL puede llevar un token de invitado. Filtro de cortes de conexión del cliente. |
| `src/app/api/webhooks/mercadopago/route.ts` | 23–31, 62–64, 115 y 124–126: los avisos de error se hacen **antes** de responder. Comprobar que no cambian ningún código de respuesta (la prueba `fulfillment-dinero.test.ts` exige que el 500 siga junto a `if (!result.ok)`). |
| `src/app/api/cron/reconciliar-pagos/route.ts` | 56–58. |

**Pruebas:** `npx vitest run src/lib/errores` (31 tests).

## 5. Bloque D · Editor (T13) — toca el flujo de publicar

| Archivo | Qué verificar |
|---|---|
| `src/app/editor/[invitationId]/page.tsx` líneas 93–129 | `reanudarPublicacion` exige las cuatro condiciones (`?publicar=1`, cuenta real, invitación sin publicar, inicio de sesión o cambio de cuenta de hace menos de 2 minutos). Una prueba lee el fuente y las exige (`reanudar-publicacion.test.ts`). **Sin verificar:** que `updated_at` cambie al confirmar el correo de conversión; si no, la reanudación solo falla a pulsar Publicar de nuevo, sin pérdida. |
| `src/components/editor/invitation-editor.tsx` líneas 158–163, 377–400, 505–510 | La publicación reanudada pasa por `ejecutarPublicacion`, así que `setPublished` sigue decidiendo (sin plan pagado: aviso de pago, no publica). La lista previa no se repite en la sesión (`preflightConfirmado`). |
| `src/components/editor/shell/progreso-esencial.tsx` | Informativa: una prueba exige que no toque `publicando` ni `disabled`. |

## 6. Lo que esta lista NO cubre

- Mercado Pago de punta a punta con dinero real (T01).
- La configuración de Supabase en el panel (inicios anónimos, límites de frecuencia, plantilla del correo de cambio de dirección, URLs de redirección).
- Las variables de entorno de producción (`CRON_SECRET`, `ALERTAS_*`, `CLEANUP_INVITADOS_ENABLED`).
- Revisión legal de términos y aviso de privacidad (que además debería mencionar el conteo interno del embudo).
- Contenido de las 65 plantillas y de sus estilos.
