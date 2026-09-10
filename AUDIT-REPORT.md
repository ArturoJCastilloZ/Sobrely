# Auditoría funcional de Sobrely

> **Fecha:** 2026-09-09 · **Rama:** `skarlette/rediseno` · **Commit auditado:** `713d59a`
> **`main`:** intacto en `91b6258` · **NADA se corrigió**: esto es sólo el diagnóstico.
>
> **Cómo se hizo.** Ocho auditorías en paralelo, todas en SOLO LECTURA, cada una
> obligada a anclar sus hallazgos a la línea EJECUTABLE (`archivo:línea`), a
> separar MEDIDO de HIPÓTESIS, y a no reportar refactors ni estética. Sobre eso,
> el orquestador reprodujo por su cuenta los hallazgos más graves — marcados
> abajo con **✓ verificado por el orquestador**.
>
> **Lo que NO se hizo:** ningún pago ni llamada a Mercado Pago, ninguna escritura
> en la base de datos, ninguna cuenta creada, ningún archivo del repo modificado.

---

## 1. Estado medido del proyecto

| | |
|---|---|
| Plantillas activas | **65** en 9 categorías |
| Fondos repetidos dentro de categoría | **0** |
| Composiciones repetidas dentro de categoría | **0** |
| Invitaciones publicadas | **7** |
| Migraciones en el árbol | 52 (`0001`–`0052`) |
| Suite | 841 en 52 archivos, verde |
| `tsc` · `eslint` · gate de contraste | limpios |

---

## 2. Veredicto

El núcleo está mejor construido de lo que sugiere la longitud de esta lista. La
autorización de admin, la verificación de firma del webhook de pagos y la
integridad de las 65 plantillas son **sólidas y están bien pensadas**.

Pero hay **tres defectos rompiendo a clientes en este momento** y un patrón de
fallo silencioso —«éxito reportado sin haber hecho nada»— repetido en cinco
módulos distintos.

---

## 3. Lo urgente

### U-1 · Fuga de datos en producción ✓ verificado por el orquestador

`invitations` se lee entera con la llave publicable, la misma que viaja al
navegador de cualquier visitante.

```
invitations                          HTTP 200 · content-range 0-6/7
  columnas: id, user_id, title, theme_config, version, status
  anfitriones distintos correlacionables: 4
invitation_modules is_visible=false  HTTP 200 · 0-3/4

CONTROL borradores (is_published=false)  */0   <- RLS SI esta activa
CONTROL profiles                          */0   <- la sonda discrimina
```

**Causa:** `invitations_select_published_public`
(`supabase/migrations/0001_initial_schema.sql:244-247`) y su gemela para módulos
(`:272-281`) sobrevivieron a la Fase 1. Son *permissive*, así que se **OR-ean**
con todo lo demás y **puentean** las RPC `SECURITY DEFINER` (`0004`, `0007`,
`0012`) que sí acotan columnas, filtran `is_visible` y aplican el muro de pago.
Ninguna migración posterior las dropea.

**Qué añade sobre «la invitación ya era pública»:**

1. Enumeración sin conocer ningún link.
2. Correlación por `user_id` — que además es la carpeta de Storage
   `<user_id>/<invitation_id>/`.
3. **Módulos que el anfitrión OCULTÓ**, con su `config` (p. ej. la dirección del
   salón que creyó retirar).
4. Contenido de invitaciones cuyo entitlement venció: la página da 404 y el REST
   las sirve enteras.

**Severidad: CRÍTICA.** Un solo arreglo cierra U-1, los módulos ocultos y el
puenteo del muro de pago: retirar esas dos policies, porque toda la lectura
pública ya pasa por las RPC.

### U-2 · Dos invitaciones publicadas devuelven 404 a sus invitados ✓ verificado

```
invitacion-i7t0nb   entitlement=false   evento 2026-08-15   (ya paso)
invitacion-ol3b6q   entitlement=false   evento 2027-08-01   <- el evento NO ha pasado
```

`invitations.is_published` sigue en `true`, así que el anfitrión la ve
publicada; `get_public_invitation` exige `is_entitlement_active` (`0012:61`), así
que el invitado lee «esta invitación no existe». **Las dos verdades nunca se
reconcilian y nadie avisa a nadie.**

**Severidad: CRÍTICA (cliente activo afectado).**

### U-3 · El itinerario es invisible en invitaciones publicadas ✓ verificado

Medido con el gate de medición puesto (pestaña visible + `requestAnimationFrame`
confirmado), tras un scroll de lectura normal:

```
HTTP 200 · gate {"vis":"visible","raf":true}
{"filas":6,"invisibles":6,"anim":11,"recortadosSinRevelar":0}
```

`recortadosSinRevelar: 0` es la clave: **los módulos sí revelan** —el arreglo del
§23 funciona—, pero los **descendientes que corren su propio observer** no.
Chrome aplica el `clip-path` de un ANCESTRO al calcular la intersección del
descendiente; `StaggerGroup` observa su raíz con umbral 0.15
(`src/hooks/use-reveal.ts:29`; `src/components/animation/stagger-group.tsx:32`
no pasa `threshold`) y con `once:true` (`use-reveal.ts:56`) no hay segunda
oportunidad.

Reproducido en 2 invitaciones publicadas × 3 viewports × 3 velocidades. Con
`paso=1200 ms` sí revela: es una carrera contra la duración de la cortina, no un
bloqueo absoluto — pero con scroll humano el contenido se pierde y **no se
recupera sin recargar**.

`src/lib/animation/recorte-y-umbral.test.ts` está verde y **no lo caza**: vigila
que los presets que recortan estén registrados, no que los observadores anidados
sean inmunes.

**Severidad: ALTA.**

---

## 4. Matriz

| Área | Funcionalidad | Resultado | Severidad | Evidencia |
|---|---|---|---|---|
| Editor | Crear invitación | PASS | — | rollback atómico, `invitations/actions.ts:91-96` |
| Editor | Editar textos | **FAIL** | CRÍTICA | `use-autosave.ts:71-80` |
| Editor | Editar imágenes | **FAIL** | MEDIA | `image-uploader.tsx:110` |
| Editor | Módulos | PARCIAL | ALTA | `schemas.ts:58-66` |
| Editor | Guardado | **FAIL** | CRÍTICA | `invitation-editor.tsx:289` |
| Editor | Preview | PASS | — | tres caminos, un solo `ModulePreview` |
| Plantillas | Selección | PARCIAL | MEDIA | 40/65 no publicables en Free, sin avisar |
| Plantillas | Aplicación | PASS | — | 65/65 sin pérdida al parsear |
| Dashboard usuario | Invitaciones | PARCIAL | ALTA | `rsvp-table.tsx:227-233` |
| Dashboard admin | Gestión | PARCIAL | ALTA | `lib/admin/actions.ts:43-53` |
| Facturación | Checkout | PASS | — | `mp-signature.ts:39-48` |
| Facturación | Estado de pago | **FAIL** | ALTA | `fulfillment.ts:80` |
| Animaciones | UI | **FAIL** | ALTA | U-3, confirmado |
| Invitación pública | Responsive | PASS | — | 21 mediciones, 0 desbordes |
| Invitación pública | RSVP | **FAIL** | ALTA | `public-invitation.tsx:90-104` |
| E2E | Flujo completo | **NO EJECUTADO** | — | requiere sesión y escrituras |

---

## 5. Hallazgos por área

### 5.1 Editor

- **CRÍTICA — el autoguardado deja de reprogramarse mientras escribes.**
  `use-autosave.ts:71-80`: la dep del efecto es `hayCambios`, un **booleano**;
  una vez en `true` no cambia por identidad y el efecto no vuelve a correr. Se
  guarda lo que hubiera a los 1.2 s y lo tecleado después no dispara nada. El
  comentario `:78-79` afirma lo contrario. *(hipótesis de alta confianza)*
- **CRÍTICA — un fallo de red al guardar es silencioso.**
  `invitation-editor.tsx:289` no está en ningún `try`. Además `use-autosave.ts:63`
  encadena sobre una promesa rechazada, así que **el siguiente guardado ni se
  intenta**, y el indicador sigue diciendo «Guardando…».
- **ALTA — un campo inválido bloquea el documento ENTERO.** MEDIDO:
  `hero.imageUrl = "example.com/foto.jpg"` (tecleable) produce «Configuración
  inválida en el módulo hero» y el módulo `welcome` recién escrito tampoco se
  guarda. `schemas.ts:58-66`.
- **ALTA — falso conflicto de pestañas.** `editor/[invitationId]/page.tsx:46-51`
  descarta el `error` al leer `version`; un fallo transitorio deja
  `initialVersion = 1`, el guardado afecta 0 filas y el editor queda bloqueado
  con un diagnóstico falso.
- **ALTA — guardado no atómico.** `actions.ts:380` bumpea la versión antes de
  tocar módulos; si fallan, quedan ajustes guardados, módulos a medias y
  **conflicto permanente**.
- **ALTA — cambiar de temática NO cambia las tipografías.** MEDIDO:
  `theme-panel.tsx:189-197` omite `typography`. El comentario de
  `theme-packs.ts:542-548` afirma que está cerrado; la prueba cubre
  `applyThemePack`, no el panel, que es el único camino de usuario.
- **ALTA — `parseTheme` descarta el TEMA ENTERO** ante un campo malo
  (`theme.ts:136`), a diferencia de `parseConfig` que degrada por campo. MEDIDO:
  un `primary` inválido tira font, spacing, mode, stickers y themePack.
- **ALTA — el indicador de guardado miente.** `invitation-editor.tsx:494`: no
  existe estado «error al guardar».
- **MEDIA** — publicar ignora si el guardado previo falló (`:189`); imágenes
  huérfanas en Storage (`image-uploader.tsx:110`); cambiar temática borra el arte
  propio de la decoración (`theme-packs.ts:551`); `parseConfig` tiene
  `onDescartado` **sin ningún llamador** (`types.ts:996`); Cmd+Z desincroniza el
  modo RSVP; el guardado hace un round-trip por módulo (`actions.ts:429-443`).
- **Dato de alcance:** **no existe «cambiar de plantilla»** sobre una invitación
  ya creada. La plantilla sólo se aplica al crear.

### 5.2 Ciclo de vida de la invitación

- **CRÍTICA** — U-1 y U-2 (arriba).
- **ALTA — un usuario logueado abre el editor de la invitación publicada de
  otro.** `editor/[invitationId]/page.tsx:32-34` no filtra por `user_id`, y la
  policy pública está declarada `to anon, authenticated`. El comentario `:27`
  dice que RLS lo restringe al dueño: **es falso**. La escritura sí está
  bloqueada. Mismo patrón en `dashboard/invitations/[invitationId]/page.tsx:61-63`.
- **ALTA — el gate de plan no sobrevive a la edición posterior.**
  `canPublishInvitation` sólo se invoca al publicar (`actions.ts:230`) y tras el
  pago (`fulfillment.ts:180`). `saveEditor` no lo llama: se publica gratis, se
  añaden módulos de pago, se guarda, y salen en vivo.
- **MEDIA** — `/editor/*` responde **200** en los tres desenlaces (sin sesión, id
  inexistente, ajena) con el 307 y el 404 viajando dentro del stream RSC;
  despublicar y borrar reportan éxito con 0 filas; el dueño puede publicar por
  REST saltándose el gate; cambiar el slug de una publicada mata los links
  repartidos; borrar una invitación pagada **destruye el entitlement**
  (`0006:101` cascade) mientras la orden queda huérfana (`0006:64` set null).
- **BIEN** — el patrón `invitation_id = invitation_id` está erradicado en las 52
  migraciones; unicidad de slug y vanity correcta con captura del `23505`;
  plantilla→invitación se **copia**, no se liga (cambiar una plantilla no afecta
  a invitaciones existentes); escritura anónima denegada; borradores invisibles.

### 5.3 Plantillas

- **ALTA — copy de editor filtrado a la vista pública en 30 de 65.**
  `previews.tsx:773`, `:1076`, `:840` no usan el guard `editorHint` que sí
  protege a `MapPreview` (`:701`) y `CountdownPreview`. Medido en el HTML
  servido: «Agrega fotos a tu galería.», «Pega un enlace de Spotify o YouTube.».
  No se ve en la miniatura (queda bajo el pliegue de 420×560), sí al abrirla en
  grande.
- **MEDIA — 40 de 65 no son publicables en Free y el catálogo no lo dice.**
  free 25 · esencial 10 · celebración 20 · premium 10. El usuario se entera al
  publicar. Agravante: las 10 «premium» lo son **sólo** por un módulo `video`
  cuyo `url` está vacío en las 10.
- **BAJA** — `overlay` guardado distinto del declarado en `arte.ts` en 2
  plantillas; `arte.ts` usa «Revelación de género» y la BD «Gender reveal».
- **BIEN** — integridad impecable: 65/65 pasan `parseTheme` sin perder un campo,
  555/555 módulos pasan `parseConfig` sin descartes, 129/129 URLs de imagen
  existen en disco y 62/62 están registradas, 65/65 renderizan HTTP 200, 0
  módulos desconocidos, 65/65 miniaturas presentes. **Cero colores sueltos en la
  raíz** (el defecto de la `0046` no reaparece).

### 5.4 Dashboard de usuario

- **ALTA — el proxy de autenticación no se ejecuta nunca.** ✓ verificado por el
  orquestador con tres evidencias: la doc de Next instalada
  (`01-getting-started/16-proxy.md:35` — debe estar «al mismo nivel que `app`»),
  el archivo está en la **raíz** y la app en `src/app`, y el manifiesto compilado
  es `{"middleware":{},"sortedMiddleware":[]}`. Consecuencias: no hay refresco de
  cookie de sesión, y `redirectTo` pierde el destino. El dashboard no queda
  expuesto porque cada layout revalida en servidor. El comentario de
  `dashboard/layout.tsx:16` («proxy already guards /dashboard») es falso.
- **ALTA — borrar una respuesta RSVP: sin confirmación y con éxito falso.**
  `rsvp-table.tsx:227-233` y `lib/rsvp/actions.ts:118`.
- **MEDIA** — fecha de respuesta contaminada por `updated_at` (`metrics.ts:272`);
  «Ya ingresaron 3 de 40» mezcla filas con personas (`metrics.ts:106` vs
  `funnel-kpis.tsx:111`); «N respuestas nuevas» cuenta cualquier cambio
  (`live-indicator.tsx:44`, `event:"*"`); el escáner muestra el cupo y no lo
  confirmado (`checkin-scanner.tsx:45`); dos fuentes de verdad en la página del
  evento; **fallo de carga = estado vacío** en dashboard, billing e invitados;
  `reload()` sin `finally` deja «Cargando…» eterno.
- **BIEN** — ownership verificada en servidor en todas las páginas y acciones;
  `unstable_rethrow` correctamente colocado (el defecto de `NEXT_REDIRECT` está
  resuelto); borrado de invitación y de firma sí confirman; todos los `href`
  resuelven a rutas reales.

### 5.5 Dashboard de admin

- **AUTORIZACIÓN: sin hallazgos explotables.** Tres capas — ruta
  (`admin/layout.tsx:20`, `page.tsx:48`), cada server action
  (`lib/admin/actions.ts:36,58,94`) y la BD: las 4 funciones `security definer`
  validan al llamante en su primera línea (`0009_admin.sql:61,118,152,179`), que
  es el sitio clásico de escalada. `admin_users` sin policies de escritura.
  Anti auto-lockout presente.
- **BAJA — `public.is_admin` es un oráculo público.** ✓ verificado por el
  orquestador con control positivo: `anon` → `false` con un uuid inventado,
  `true` con el uuid del dueño. Falta un `revoke execute`, que el propio repo sí
  hace en `0021`. Enumeración, no escalada.
- **ALTA — métricas y listas fabrican ceros cuando la RPC falla.**
  `admin/page.tsx:52` descarta los tres `error`; un fallo pinta «Usuarios 0 /
  Ingresos $0.00» indistinguible del dato real, y `admin/error.tsx` nunca se
  dispara.
- **ALTA — las tres escrituras reportan éxito sin verificar filas afectadas**
  (`lib/admin/actions.ts:43-53`, `:80-89`, `:101-111`).
- **ALTA — revocar admin es destructivo, sin confirmación y sin rastro**
  (`admin-manager.tsx:106`; el `.delete()` borra la fila).
- **MEDIA** — solicitudes de servicio sin paginación ni filtro, truncadas a 50
  **sin aviso**, mientras el desglose por estado agrega sobre toda la tabla.
- **BIEN** — `revalidatePath` presente en las tres escrituras; validación de
  entrada contra lista blanca en el servidor, redundada por CHECK en BD.

### 5.6 Facturación y pagos

- **La pregunta número uno tiene buena respuesta:** la firma HMAC **se verifica**
  (`mp-signature.ts:39-48`), en tiempo constante, fail-closed, con 401 antes de
  tocar la BD. MEDIDO ejecutando el módulo. No basta conocer la URL.
- **ALTA — cualquier fallo del UPDATE de la orden se reporta como éxito.**
  `fulfillment.ts:80` devuelve `ok:true` para **cualquier** `updErr`; el webhook
  responde 200, **MP deja de reintentar**, la orden queda `pending` y el
  entitlement nunca se crea: **pagado sin acceso**. El mismo archivo demuestra el
  patrón correcto 173 líneas más abajo (`:253` filtra `code !== "23505"`).
- **ALTA — el refund revoca el entitlement equivocado.** `fulfillment.ts:91-94`
  filtra sólo por `invitation_id`. Reembolsar el plan barato tumba la invitación
  pagada con el caro, y la despublica.
- **MEDIA** — el upsert de entitlement degrada un plan superior ya activo
  (`:151-161`); el demo Free de 14 días es **renovable indefinidamente**
  (`invitations/actions.ts:244`); el cupo de invitados es un contador **no
  atómico** (`entitlements.ts:326-344` lee, `rsvp/actions.ts:53` inserta) sin red
  de seguridad en BD; la cuota de almacenamiento se comprueba **desde el
  navegador** y se salta no llamando a la acción.
- **BAJA** — el `ts` de la firma nunca se compara con la hora actual (replay
  posible, mitigado porque se re-consulta el estado vivo a MP).
- **BIEN** — nunca se cree al payload (`route.ts:65` re-consulta a MP); el precio
  se calcula en servidor desde la misma función que la UI; `orders` y
  `invitation_entitlements` sin policies de escritura; el gate público vive en
  SQL `SECURITY DEFINER`; el crédito de referido es atómico e idempotente.

### 5.7 Animaciones

- **ALTA** — U-3 (arriba).
- **MEDIA — si el bundle JS no carga pero el CSS sí, la invitación queda
  invisible.** 17 nodos con `clip-path: inset(0 0 100%)` permanentes. El gate
  `@media (scripting: enabled)` (`animations.css:31`) responde «¿hay scripting?»,
  no «¿hidrató React?». Con JS totalmente deshabilitado sí sale bien.
- **BAJA** — la altura scrolleable cambia mientras revela (2710→2638 px);
  controles no clicables mientras la cortina abre, con `duration` permitida hasta
  3 s; las transiciones de `ui/*` no se apagan bajo `prefers-reduced-motion`; el
  overlay del lightbox no desactiva el puntero en su salida.
- **BIEN** — `prefers-reduced-motion` correcto: `.anim`=0, `getAnimations()`=0,
  **0 nodos con texto invisible**, 0 controles inalcanzables. **CLS 0.0000** en
  todas las corridas. Nada bloquea la interacción (hit-test real con
  `elementFromPoint`: 0 controles fallan). 6 clics encadenados y recarga a media
  animación: 0 errores, 0 módulos atascados. Sin JS: contenido visible.
- **Nota de instrumento:** `/plantilla/<slug>` fuerza `animations:false`
  (`plantilla/[slug]/page.tsx:75`) para que las miniaturas sean deterministas.
  **No sirve para medir animaciones** — da 0 nodos `.anim`.

### 5.8 Invitación pública y RSVP

- **ALTA (fuga) — la URL pública revela el correo del anfitrión.**
  `handle_new_user` construye el `username` como `split_part(email,'@',1)` + 6
  hex (`0002_fix_handle_new_user.sql:23-31`). 3 de los 4 usernames de las
  publicadas son partes locales de correos personales reconocibles.
- **ALTA (fuga) — las invitaciones son indexables.** `robots.txt` sirve
  `Allow: /` y `[username]/[invitationSlug]/page.tsx:45-58` no emite
  `robots:{index:false}` — mientras `/g/` y `/r/` sí lo hacen, así que la omisión
  es inconsistente, no deliberada. Se crawlean nombre del anfitrión, fecha,
  **dirección física** y quiénes firmaron.
- **ALTA — el modo «lista de invitados» se salta desde la URL pública.** MEDIDO
  en `zz-demo` (`rsvp_mode='guest_list'`): sirve el formulario ABIERTO con nombre
  libre y hasta 20 acompañantes. `public-invitation.tsx:90-104` cae al `else`, la
  RLS `0001:328` nunca mira `rsvp_mode`, y `get_public_invitation` ni lo expone.
  El control nominal de pases es evadible reenviando el link.
- **MEDIA** — la fecha límite de RSVP **sólo existe en el cliente**
  (`public-rsvp-form.tsx:59-65`); el invitado no puede confirmar con menos pases
  (`guest-response-panel.tsx:162` manda siempre `max_guests`) ni rectificar tras
  declinar; con **dos** libros de firmas nadie puede firmar (`.maybeSingle()` en
  `lib/signatures/actions.ts:50-59`); no hay estado post-evento (countdown en
  «00 00 00 00» y RSVP abierto).
- **BAJA** — flash de countdown absurdo en SSR (20901 días); `signGuestbook`
  inserta con **service_role** saltándose la RLS de tres migraciones; sin rate
  limit; el QR del pase codifica el token completo (la foto del pase entrega el
  control del RSVP de ese invitado).
- **BIEN** — **0 desbordes horizontales** en 21 mediciones (375/768/1200);
  **404 correcto en todas las rutas públicas** (el patrón malo de `/editor/*` no
  se repite); **sin fuga cruzada entre invitados** (0 tokens ajenos, 0 correos en
  el HTML de `/g/<token>`); el límite de pases del token es infranqueable (clamp
  en SQL); RPCs de admin cerradas a `anon`; QR generado localmente.

---

## 6. Lo que NO hay que tocar

Autorización de admin en tres capas · verificación de firma HMAC del webhook ·
bloqueo optimista del editor (compare-and-set en una sentencia) ·
`templateToDocument` como fuente única catálogo↔invitación · integridad de las
65 plantillas · aislamiento entre invitados · 404 de las rutas públicas ·
responsive de la invitación · `prefers-reduced-motion` · CLS 0.0000 · crédito de
referido.

---

## 7. Orden de corrección propuesto

1. **Las dos policies de la `0001`** (`:244`, `:272`) — cierran U-1, los módulos
   ocultos y el puenteo del muro de pago.
2. **Reconciliar `is_published` con el entitlement** y avisar al anfitrión — U-2,
   hay un cliente caído con su evento por delante.
3. **El observer anidado** — U-3, invitados que nunca ven el itinerario.
4. **Los dos del editor** (autoguardado y fallo silencioso) — pérdida de trabajo.
5. **`ok:true` con 0 filas** — el mismo patrón en admin, dashboard, despublicar,
   borrar y facturación. `saveEditor` ya lo resuelve bien: copiar de ahí.
6. **`fulfillment.ts:80` y `:91`** — dominio dinero.
7. **Copy de editor en la vista pública** (30 plantillas) y **username = correo**.
8. El resto por severidad.

---

## 8. No verificado, y por qué

- **Todo el E2E autenticado**: dashboard, editor, publicación, RSVP real, doble
  submit, refresh, atrás/adelante, multipestaña. Exige sesión y escrituras.
- **Admin en runtime**: exige sesión de admin.
- **Pagos**: no se tocó Mercado Pago. Todo el análisis de facturación es estático.
- **Peso real de página**: lo medido es `next dev`, no representa producción.
- **El 200 de `/editor/*` en build de producción**: medido contra `next dev`;
  debe reconfirmarse con `next build && next start`.
- **Las fechas de vencimiento de los entitlements**: el orquestador confirmó el
  estado activo/inactivo por RPC, pero `invitation_entitlements` está cerrada a
  `anon` (`*/0`), así que las fechas concretas vienen de una lectura con service
  key de un agente y **no están verificadas de forma independiente**.
