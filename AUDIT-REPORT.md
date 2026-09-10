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
> **Lo que NO se hizo en el diagnóstico estático:** ningún pago ni llamada a
> Mercado Pago, ninguna escritura en la base de datos, ninguna cuenta creada,
> ningún archivo del repo modificado.
>
> **Ampliación del 2026-09-10 — E2E ejecutado.** La §8 («no verificado») ya no
> describe el estado: el flujo autenticado completo se ejecutó contra la BD de
> producción con dos invitaciones de prueba creadas y borradas para ello, sin
> ningún pago. Ver **E2E REAL EXECUTION** al final. Sigue sin corregirse nada.

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
| Editor | Textos · autoguardado | **FAIL** | CRÍTICA | E2E N-1, `use-autosave.ts:70-80` |
| Editor | Salir con cambios | **FAIL** | CRÍTICA | E2E paso 10, `use-autosave.ts:82-92` |
| Editor | Título por palabras | **FAIL** | ALTA | E2E N-2, `text-reveal.tsx:58,62` |
| Invitación pública | RSVP idempotencia | **FAIL** | ALTA | E2E N-3, 2 filas idénticas |
| Ciclo de vida | Borrado · Storage | **FAIL** | MEDIA | E2E N-4, `actions.ts:287-303` |
| Invitación pública | Táctil en móvil | PARCIAL | BAJA | E2E N-5, 7/8 bajo 44 px |
| Dashboard usuario | Títulos de página | PARCIAL | BAJA | E2E N-6, sin `metadata` |
| E2E | Flujo completo | **EJECUTADO** | — | E2E REAL EXECUTION (22 pasos) |
| E2E | Doble submit | PASS | — | 3/3: crear, publicar, RSVP |
| E2E | Atrás / adelante | PASS | — | `?evento=Boda` restaura URL y estado |
| E2E | Borrado verificado | PASS | — | universo 18→20→18, hijas en 0 |

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

## 6-bis. ESTADO DE LAS CORRECCIONES — 2026-09-10

> Los once puntos del orden de abajo, atendidos, en `skarlette/rediseno`.
> `main` intacto en `91b6258`. `tsc`, `eslint` y **939** pruebas en verde.
> Cada bloque cerrado por EFECTO OBSERVADO salvo donde se dice lo contrario.

| §7 | Qué | Commit | Estado |
|---|---|---|---|
| 1 | Fuga de `invitations` / `invitation_modules` | `c47233f` | ✅ migración `0053` **aplicada**: de 7 y 46 filas legibles por `anon` a **0** |
| 2 | El autoguardado dejaba de guardar para siempre | `e63cb20` `ae2be99` | ✅ |
| 3 | U-2 · «Esta invitación ha caducado» + el panel dice la verdad | `1ef7915` | ✅ `0054` aplicada |
| 4 | RSVP idempotente por correo | `1ef7915` | ✅ `0055` aplicada · `0056` bloqueada |
| 5 | U-3 · el itinerario invisible | `2b88960` | ✅ |
| 6 | El título perdía todas las palabras menos la primera | `c5f0b71` `4233d7d` | ✅ |
| 7 | «`ok:true` con 0 filas» — 8 sitios + 1 nuevo | `c5f0b71` | ✅ |
| 8 | `fulfillment.ts` — dinero | `388d2af` | ⚠️ **pendiente de revisión humana** |
| 9 | Copy de editor en la pública · `meta robots` · username | `c47233f` `c5f0b71` | ✅ (5 sitios, no 3) |
| 10 | Imágenes huérfanas al borrar | `4233d7d` | ✅ |
| 11 | Títulos de `/dashboard/billing` y `/referrals` | `c47233f` | ✅ |

### Tres cosas de este informe que resultaron FALSAS al corregirlas

1. **El punto 1 del orden de abajo rompía producción.** «Retirar esas dos
   policies, porque toda la lectura pública ya pasa por las RPC» es cierto del
   código de la aplicación y falso de la base: `rsvp_insert_published_public`
   (`0001:328`) y `signatures_public_select` (`0024:86`) hacen
   `exists (select 1 from invitations …)`, y en PostgreSQL eso se evalúa con la
   RLS del invocador. Retirarlas a secas apaga el **RSVP público** y vacía el
   **muro de firmas**, las dos cosas en silencio. La `0053` mueve la
   comprobación a funciones `security definer` y sólo después retira las que
   filtran.

2. **U-3 no era el umbral del observador anidado.** Se bajó a 0, se midió, y no
   movió ni un item: con área de intersección cero no hay umbral que valga. La
   causa es que el descendiente no puede ver nada mientras el ancestro recorta,
   y cuando la cortina abre el scroll ya pasó de largo. Y **«no se recupera sin
   recargar» es falso**: volver a poner el itinerario en pantalla lo revela.
   Alcance real: `0 de 65` plantillas y `2 de 18` invitaciones.

3. **U-2 no era un cliente roto.** Las dos invitaciones caídas tienen la demo
   **Free** vencida el 2026-08-26 y sus dueños **no tienen ninguna orden**:
   nunca pagaron. El muro de pago funcionaba; lo roto era que nadie se lo dijo a
   nadie.

### Y dos defectos que las correcciones destaparon, y no estaban aquí

- **El origen de U-2**: el upsert del entitlement demo en `setPublished` no
  miraba ni el error ni las filas, y la invitación se publicaba igual dos líneas
  más abajo. Eso produce exactamente `is_published = true` + 404. Ya es
  fail-closed.
- **El duplicado de RSVP está EN PRODUCCIÓN**, no sólo en el E2E: dos respuestas
  de la misma persona, 35 segundos aparte, con 13 y 1 pases, en la invitación de
  un cliente con el evento a 16 días.

---

## 7. Orden de corrección propuesto

> **Reordenado el 2026-09-10 tras el E2E.** Lo que cambia: los dos defectos del
> editor suben al primer bloque porque ya no son hipótesis — están medidos, se
> comen el trabajo del usuario en el camino más usado del producto, y no tienen
> ninguna vía de rescate manual. La fuga de datos sigue primero porque es la
> única con consecuencia irreversible hacia fuera.

1. **Las dos policies de la `0001`** (`:244`, `:272`) — cierran U-1, los módulos
   ocultos y el puenteo del muro de pago. Sigue siendo lo primero: es la única
   con exposición de datos de terceros.
2. 🔺 **El autoguardado del editor** (E2E N-1) — `use-autosave.ts:70-80`, más el
   indicador que miente (`invitation-editor.tsx:494`), más el `beforeunload` que
   no cubre la navegación interna (`:82-92`). **Sube del puesto 4 al 2**: está
   reproducido, deja el editor atascado para siempre y destruye el trabajo sin
   un solo aviso. Los tres se arreglan juntos o el arreglo miente igual.
3. **Reconciliar `is_published` con el entitlement** y avisar al anfitrión — U-2,
   hay un cliente caído con su evento por delante.
4. 🔺 **La idempotencia del RSVP público** (E2E N-3) — **nueva**. Un invitado
   confirma cuantas veces recargue y el conteo del anfitrión se infla; en planes
   con tope, además consume cupo. Va aquí porque corrompe el dato que el
   anfitrión usa para decidir gasto.
5. **El observer anidado** — U-3, acotado por el E2E: **no** se reproduce en
   `cumpleanos-galaxia`. Antes de arreglarlo conviene delimitar de qué preset
   depende, o el arreglo será a ciegas.
6. 🔺 **El título por palabras del editor** (E2E N-2) — **nuevo**.
   `text-reveal.tsx:58,62`: el anfitrión escribe su título y se le borra todo
   menos la primera palabra. Barato de arreglar, muy visible.
7. **`ok:true` con 0 filas** — el mismo patrón en admin, dashboard, despublicar,
   borrar y facturación. `saveEditor` ya lo resuelve bien: copiar de ahí.
8. **`fulfillment.ts:80` y `:91`** — dominio dinero.
9. **Copy de editor en la vista pública** (30 plantillas), **username = correo**
   y **`meta robots`** — las tres confirmadas en vivo por el E2E, las tres son
   fuga hacia fuera y las tres son de una línea.
10. 🔺 **Las imágenes huérfanas al borrar** (E2E N-4) — contenido de clientes que
    borraron su invitación sigue descargable.
11. El resto por severidad (incluidos N-5 táctil en móvil y N-6 títulos de
    página, los dos BAJA).

## 8. No verificado, y por qué

> ⚠️ **Esta sección quedó parcialmente superada el 2026-09-10.** El primer punto
> ya se ejecutó; lo que sigue sin verificarse está actualizado abajo y, con más
> detalle, al final de **E2E REAL EXECUTION**.

- ~~**Todo el E2E autenticado**~~ → **EJECUTADO** el 2026-09-10: dashboard,
  editor, publicación, RSVP real, doble submit, refresh y atrás/adelante. Lo que
  sigue pendiente de ese bloque: **multipestaña** (conflicto de versión con dos
  editores abiertos), el **modo lista de invitados**, y el **editor en móvil**.
- **Admin en runtime**: exige sesión de admin.
- **Pagos**: no se tocó Mercado Pago. Todo el análisis de facturación es estático.
- **Peso real de página**: lo medido es `next dev`, no representa producción.
- **El 200 de `/editor/*` en build de producción**: medido contra `next dev`;
  debe reconfirmarse con `next build && next start`.
- **Las fechas de vencimiento de los entitlements**: el orquestador confirmó el
  estado activo/inactivo por RPC, pero `invitation_entitlements` está cerrada a
  `anon` (`*/0`), así que las fechas concretas vienen de una lectura con service
  key de un agente y **no están verificadas de forma independiente**.

---

## E2E REAL EXECUTION

> **Ejecutado:** 2026-09-10, 03:33–04:05 UTC · **Rama:** `skarlette/rediseno` ·
> **Superficie:** el `next-server` de desarrollo del dev en `localhost:3000`
> (PID 78112, arriba desde el 2026-09-08 00:17; compila del fuente, así que
> sirve el árbol de trabajo actual) contra la BD de **producción**.
> **Navegador:** el Chrome del dev con su sesión abierta (`Arturo Castillo`,
> cuenta **admin**).
>
> **Gate de medición aplicado en cada conclusión de UI:** `document.visibilityState`,
> `document.hasFocus()` y la llegada de un `requestAnimationFrame`. Toda medida
> tomada con la pestaña oculta se descartó y se repitió con la pestaña al frente.
>
> **Datos de la prueba, y su borrado.** Se crearon **dos** invitaciones de
> prueba, ambas del propio dev, ambas borradas al terminar:
> `invitacion-wta7oh` (en blanco) e `invitacion-l9rh0p` («ZZ PRUEBA E2E -
> BORRAR», publicada, con 2 RSVP ficticios y 1 imagen subida). **Ninguna
> invitación, usuario ni fila preexistente se modificó.**
> **Cero pagos y cero llamadas a Mercado Pago**: la cuenta del dev es admin y
> `invitation_owner_is_comped` devuelve `true`, así que el plan efectivo es
> `premium` sin comprar nada — medido antes de publicar.
> **`orders` quedó en 8 antes y después.**

### Universo contado antes y después (no el filtro)

| Tabla | Línea base 03:33 | Pico durante la prueba | Final 04:03 |
|---|---|---|---|
| `invitations` | 18 | 20 | **18** |
| `invitation_modules` | 88 | 99 | **88** |
| `rsvp_responses` | 11 | 13 | **11** |
| `invitation_entitlements` | 3 | 3 | **3** |
| `orders` | 8 | 8 | **8** |
| `invitation_guests` | 8 | 8 | **8** |

Además, tras el borrado: `invitations?title=ilike.*ZZ*` → `[]`,
`rsvp_responses?guest_name=ilike.*Ficticio*` → `[]`, y las dos filas por id →
`0 filas`. La sonda se validó con un **control negativo** (`select` de una
columna inexistente → `HTTP 400` con el nombre de la columna), así que un `0`
significa «no hay», no «no pregunté».

---

### Paso a paso

#### 1. Login — **NOT TESTED**
- **Acción:** no se ejecutó.
- **Motivo:** introducir una contraseña para autenticarse está fuera de lo que
  puedo hacer. Se trabajó sobre la sesión que el dev ya tenía abierta.
- **Lo que sí se verificó por efecto**, sin sesión (cookies vacías, `curl`):
  `/dashboard` → **307** → `/login?redirectTo=/dashboard`; `/admin` → **307** →
  `/login?redirectTo=/admin`. La puerta cierra.
- **Hallazgo de rebote (confirma §5.4):** `/dashboard/billing` sin sesión
  redirige a `/login?redirectTo=**/dashboard**`, no a `/dashboard/billing`. El
  destino se pierde: tras iniciar sesión el usuario no vuelve donde iba.
- **Hallazgo de rebote (confirma §5.2):** `/editor/<uuid-inexistente>` sin
  sesión responde **200**, no 307 ni 404.
- **Severidad:** MEDIA (las dos, ya estaban en la matriz; ahora medidas en vivo).

#### 2. Dashboard — **PASS**
- **Acción:** abrir `/dashboard` con sesión.
- **Resultado:** 8 tarjetas del usuario, estados `Publicada`/`Borrador`
  correctos, todos los `href` resuelven.
- **Consola:** 0 errores. **HTTP:** 113/113 en 200 sobre `localhost` (barrido
  completo de `/dashboard`, `/dashboard/billing`, `/dashboard/referrals`).

#### 3. Crear invitación — **PASS (con desvío de flujo)**
- **Acción:** `+ Nueva invitación` → menú con dos opciones (`Confirmación
  abierta` / `Lista de invitados`) → `Confirmación abierta`.
- **Resultado:** va **directo al editor** con una invitación en blanco
  (`invitacion-wta7oh`, `rsvp_mode=open`, `version=1`, 1 módulo `hero`).
  `invitations` 18 → 19.
- **Desvío:** este camino **no ofrece categoría ni plantilla**. Los pasos
  «seleccionar categoría» y «seleccionar plantilla» sólo existen en el otro
  camino, `Plantillas` (`/dashboard/templates`). No es un fallo, pero el flujo
  pedido no es alcanzable desde el botón principal.
- **Severidad:** — (dato de alcance).

#### 4. Seleccionar categoría — **PASS**
- **Acción:** `/dashboard/templates` → filtro `Cumpleaños`.
- **Resultado:** `12 de 65 plantillas`, URL `?evento=Cumplea%C3%B1os`.
  Las 9 categorías presentes (Boda 13 · Baby shower 12 · Cumpleaños 12 · XV 12 ·
  Corporativo 11 · Gender reveal 2 · Bautizo 1 · Primera comunión 1 ·
  Graduación 1).
- **Confirma §5.3:** el catálogo **no indica el plan** de ninguna tarjeta.

#### 5. Seleccionar plantilla — **PASS**, incluido **doble clic**
- **Acción:** **doble clic** deliberado sobre `Usar esta plantilla` de
  `Cumpleaños galaxia`, con hit-test previo (`elementFromPoint` = el botón).
- **Resultado:** `invitations` 19 → **20**. **Una sola** invitación creada,
  `invitacion-l9rh0p`, 10 módulos copiados. Sin duplicado.
- **Severidad:** — (comportamiento correcto).

#### 6. Editor · editar textos — **FAIL · CRÍTICA (pérdida de datos, reproducida)**
- **Acción medida en tres tramos:**
  1. Un cambio corto en `Título`, pausa → **guarda** (`version` 1→2, BD =
     `ZZ PRUEBA E2E Despegue`).
  2. Un segundo cambio, ya con el guardado anterior terminado → **guarda**
     (`version` 3).
  3. **El caso real:** escribir, dejar que el temporizador de 1.2 s dispare **a
     mitad de la escritura**, y seguir escribiendo.
- **Resultado del tramo 3, medido:**
  - En pantalla: `ZZ CHUNK-A-CHUNK-B` · en la BD: **`ZZ CHUNK-A`**.
    `updated_at` congelado en `03:39:02`.
  - Se tecleó **un tercer cambio** en `Subtítulo` (`ZZ TERCER CAMBIO`): tampoco
    se guardó. **100 segundos** después, `version` seguía en 4 y la BD seguía
    con el texto viejo. **El editor queda atascado, no se recupera solo.**
  - El indicador de la cabecera dijo **«Guardando…» de forma permanente**, con
    la pestaña `visible`, `hasFocus:true` y `requestAnimationFrame` vivo — no es
    estrangulamiento del navegador.
- **Causa, anclada a la línea ejecutable:** `src/lib/invitations/use-autosave.ts:70-80`.
  La dependencia del efecto es `hayCambios`, un **booleano**; una vez en `true`
  no vuelve a cambiar de identidad, el efecto no se re-ejecuta y **no se
  programa otro temporizador**. El comentario de `:78-79` («`hayCambios` cambia
  en cada edición, así que el temporizador se reinicia») es **falso**. La
  ventana mortal es lo tecleado entre que el temporizador dispara y que
  `dirty` volvería a `false`: si sigue habiendo cambios nuevos, `dirty` nunca
  baja, y la transición `false→true` que rearma el temporizador no ocurre nunca.
- **Agravante medido:** `src/components/editor/invitation-editor.tsx:494` es
  literalmente `dirty ? "Guardando…" : "Guardado"`. No existe estado de error
  **ni botón de guardar manual**: el único rescate es `Publicar`
  (`invitation-editor.tsx:189`, `if (dirty) await guardarAhora()`).
- **Consola:** 0 errores. **HTTP:** 0 peticiones fallidas — el guardado **ni se
  intenta**; no hay nada que falle.
- **Impacto:** el anfitrión escribe su invitación, el indicador le dice
  «Guardando…», y el trabajo no existe. Es pérdida silenciosa de datos en el
  camino más usado del producto.
- **Severidad: CRÍTICA.**

#### 7. Editor · editar imágenes — **PASS**
- **Acción:** subir un PNG de prueba (600×600, bandas magenta/cian) en
  `Portada → Imagen de fondo`.
- **Resultado:** subido a `invitation-images/<user_id>/<invitation_id>/…jpg`
  (43 983 bytes, convertido a JPG), `hero.imageUrl` persistido, visible en la
  vista previa. Al cambiar `Diseño de la portada` de `plain` a
  `Texto centrado sobre la foto`, la imagen se pinta.
- **Nota de UI correcta:** con `plain` el panel avisa «Esta composición es sólo
  tipografía: ignora la imagen de fondo a propósito».
- **Consola:** 0 errores. **HTTP:** sin fallos.

#### 8. Editor · configurar módulos — **PASS**
- **Acción:** apagar la visibilidad de `Música`.
- **Resultado:** `invitation_modules` → `music.is_visible = false` en la BD, y
  el módulo **ausente** de la invitación publicada. Los otros 9 intactos y en
  orden.

#### 9. Guardar — **FAIL · CRÍTICA** (mismo defecto del paso 6)
- Los cambios «cortos con pausa» sí guardan (`version` llegó a 12). Los que caen
  en la ventana descrita, no. No hay guardado manual con el que forzarlo.

#### 10. Salir — **FAIL · CRÍTICA (sale sin avisar y pierde el trabajo)**
- **Acción:** con dos ediciones sin guardar, pulsar `Volver al panel`.
- **Resultado:** navega a `/dashboard` **sin ningún diálogo**
  (`document.querySelector('[role=dialog],[role=alertdialog]')` → `null`).
- **Causa:** la guarda es `beforeunload` (`use-autosave.ts:82-92`), que **no se
  dispara en la navegación interna** de Next. El aviso existe sólo para cerrar
  la pestaña.
- **Severidad: CRÍTICA** (es la mitad que convierte el defecto anterior en
  pérdida definitiva).

#### 11. Volver a entrar / verificar persistencia — **FAIL · CRÍTICA**
- **Acción:** reabrir `/editor/<id>`.
- **Resultado medido:** `Título` = `ZZ CHUNK-A` (perdido `-CHUNK-B`),
  `Subtítulo` = `Segundo cambio ZZ` (perdido `ZZ TERCER CAMBIO`). El indicador
  pasa a «Guardado» — **afirmando que está a salvo lo que acaba de destruir.**
- **Evidencia:** lectura del DOM del editor y de `invitation_modules.config`,
  coincidentes.

#### 12. Preview — **PASS**
- **Acción:** alternar `Móvil` / `Escritorio` en el lienzo.
- **Resultado:** el texto de la vista previa coincide **campo por campo** con lo
  que sirve la BD. No existe ruta de preview aparte (`/editor/[invitationId]`
  es la única); el lienzo es la vista previa.

#### 13. Publicar — **PASS**, incluido **doble clic**
- **Acción:** **doble clic** en `Publicar`.
- **Resultado:** `is_published=true`, `status=published`. La cabecera cambia a
  `Ver | Despublicar`. **`invitations` siguió en 20**, `orders` en 8,
  `invitation_entitlements` en 3 — sin duplicados y **sin pago**.

#### 14. Abrir URL pública — **PASS**
- **URL:** `/arturodejesuscz-d0bd4f/invitacion-l9rh0p`, HTTP 200.
- **Consola:** 0 errores. **HTTP:** sin fallos.

#### 15. Verificar contenido público — **PASS con dos fugas confirmadas en vivo**
- **Paridad:** título, subtítulo, cuenta regresiva, itinerario y código de
  vestimenta idénticos a editor y BD. `Música` correctamente ausente.
- **✓ Confirma §5.3 (copy de editor filtrado):** la página **publicada** sirve
  literalmente **«Agrega fotos a tu galería.»**. En cambio el mapa **sí** está
  protegido y su pista no aparece — o sea la omisión es por módulo, no general.
  **Severidad: ALTA.**
- **✓ Confirma §5.8 (indexable):** `document.querySelector('meta[name=robots]')`
  → **null** en la invitación publicada. **Severidad: ALTA.**
- **✓ Confirma §5.8 (username = correo):** la URL pública es
  `/arturodejesuscz-d0bd4f/…` — la parte local del correo del anfitrión.
  **Severidad: ALTA.**

#### 16. Animaciones de la invitación publicada — **PASS (U-3 NO reproducido aquí)**
- **Acción:** dos pasadas con el gate puesto (`visible`, `raf:true`): scroll de
  lectura (600 px / 350 ms) y scroll rápido de móvil (1500 px / 80 ms).
- **Resultado en las dos:** **0 nodos con texto sin pintar**, y las 5 filas del
  itinerario con `opacity:1`, `transform:none`. Confirmado además por píxeles
  (captura del bloque «Plan de vuelo» completo).
- **Honestidad sobre el instrumento:** mi primera sonda reportó «6 recortados
  sin revelar». Era **falso**: comparaba contra `inset(0px 0px 0px 0px)` y el
  valor computado real es `inset(0px)`, así que contaba como rotos los que sí
  estaban revelados. Corregida y re-medida.
- **Conclusión:** **U-3 no se reproduce en esta plantilla**
  (`cumpleanos-galaxia`, preset `anim--soft-scale`). Esto **no desmiente** la
  §3 U-3, que se midió sobre otras dos invitaciones publicadas; sugiere que el
  defecto **depende del preset** que recorta, y esa acotación no está en el
  informe original. **Pendiente:** reproducirlo eligiendo explícitamente un
  preset de la familia que recorta.

#### 17. RSVP — **PASS**, incluido **doble submit**
- **Acción:** formulario con datos ficticios (`Invitado Ficticio ZZ`,
  `zz-prueba-e2e@example.invalid`, «Sí, asistiré», 1 invitado, mensaje de
  prueba) y **doble clic** en `Confirmar`.
- **Resultado:** `rsvp_responses` 11 → **12**. **Una sola fila**, con todos los
  campos correctos. El doble submit está protegido.
- **Consola:** 0 errores. **HTTP:** sin fallos.

#### 18. Verificar RSVP en el dashboard — **PASS**
- `/dashboard/invitations/<id>`: `RESPUESTAS RECIBIDAS 1`,
  `CONFIRMACIONES 1 (100%)`, `ASISTENTES CONFIRMADOS 1`. Coherente con la BD.

#### 19. Editar de nuevo y guardar — **PASS**
- **Acción:** con la invitación ya publicada, cambiar `Subtítulo` a
  `EDICION POSTERIOR ZZ`, pausa.
- **Resultado:** BD actualizada a las `03:55:53`; la RPC pública
  `get_public_invitation` ya servía el valor nuevo al consultarla.
- **Nota de instrumento:** un intento anterior «no escribió nada». No era un
  fallo del producto: **la pestaña del editor estaba en segundo plano** y el
  clic no daba foco (`document.activeElement` = `BODY`, aunque
  `elementFromPoint` devolvía el propio `input`). Con la pestaña al frente
  funcionó a la primera. Se anota para que no se lea como defecto.

#### 20. Verificar actualización en la URL pública — **PASS**
- Recarga a las `03:56:25` (posterior al guardado): la página sirve
  `EDICION POSTERIOR ZZ`. El cambio llega al invitado sin republicar.

#### 21. Eliminar la invitación de prueba — **PASS**
- **Acción:** `⋯ → Eliminar` en la tarjeta del dashboard. Antes de confirmar se
  comprobó que los `href` de la tarjeta apuntaban **sólo** al id de prueba.
- **Diálogo:** correcto y específico — «¿Eliminar «ZZ PRUEBA E2E - BORRAR»? Está
  publicada: su enlace dejará de funcionar para quien ya lo tenga, y se borran
  sus confirmaciones. No se puede deshacer.»

#### 22. Confirmar eliminación — **PASS en BD, FAIL en Storage**
- **Por efecto, contando el universo:** `invitations` 20→**19** (−1),
  `invitation_modules` 99→**89** (−10), `rsvp_responses` 13→**11** (−2);
  `invitation_guests`, `invitation_entitlements`, `orders` sin cambio. Por id,
  **0 filas** en las 7 tablas hijas. La URL pública pasó a **HTTP 404**.
- **FAIL:** la imagen subida **sobrevive al borrado** y siguió sirviéndose
  públicamente: `HTTP 200`, 43 983 bytes, en un bucket público.
  `deleteInvitation` (`src/lib/invitations/actions.ts:287-303`) sólo borra la
  fila; no existe ninguna llamada `.remove()` contra Storage en todo `src/`.
- **Limpieza:** el objeto huérfano se borró a mano por la API de Storage y se
  verificó por efecto — con `cache-buster`, `HTTP 400`; la carpeta del usuario
  volvió a sus 5 subcarpetas originales. (El primer `GET` devolvió 200 por caché
  de borde; se distinguió caché de objeto vivo antes de concluir.)
- **Severidad: MEDIA** (fuga de contenido de invitaciones borradas + consumo de
  cuota que nadie libera).

---

### Comprobaciones transversales pedidas

| # | Comprobación | Resultado |
|---|---|---|
| 1 | Flujo completo en escritorio | **PASS** (con los FAIL del editor) |
| 2 | Partes críticas en móvil | **PARCIAL** — ver abajo |
| 3 | Errores de consola relevantes | **PASS** — 0 errores en dashboard, editor, plantillas, billing, referidos e invitación pública. Único mensaje de error en toda la sesión: un aviso de React en desarrollo («Encountered a script tag while rendering React component»), sin efecto observable |
| 4 | Peticiones HTTP fallidas | **PASS** — 113/113 en 200 sobre `localhost` en el barrido completo; 0 respuestas ≥400 salvo los 404 esperados de rutas inexistentes |
| 5 | Errores de JavaScript | **PASS** — 0 excepciones |
| 6 | Persistencia real en Supabase | **PASS parcial** — todo lo guardado se verificó contra la BD; y es justo así como se demostró la **pérdida** del paso 6 |
| 7 | Paridad preview / editor / URL pública | **PASS** — coinciden campo por campo; la única diferencia es la pista de editor que **sí** se filtra al público (hallazgo, no desincronía) |
| 8 | Comportamiento tras refresh | **PASS** — la invitación pública se rehidrata igual; el editor recarga exactamente lo que hay en BD |
| 9 | Atrás / adelante | **PASS** — el filtro escribe `?evento=Boda`; `atrás` sale de la página y `adelante` restaura URL **y** estado (`Boda 13`, `13 de 65`). Nota: el filtro usa `replace`, así que `atrás` no deshace el filtro — decisión de diseño, no fallo |
| 10 | Doble clic / doble submit en acciones críticas | **PASS 3/3** — crear desde plantilla (1 fila), publicar (sin duplicar), RSVP (1 fila) |

**Sobre el punto 2 (móvil).** A **375×812 real** (viewport emulado) la invitación
pública mide **0 desbordes horizontales**: `scrollWidth = 375`, 0 de 9 secciones
y 0 de 8 controles fuera de la ventana. Eso confirma el PASS de responsive de la
§5.8. Lo que **no** pude juzgar a 375 es el contenido animado: el panel del
navegador embebido estaba **oculto** (`visibilityState:hidden`, `raf:false`), y
con la pestaña oculta lo que se mide es el estrangulamiento de Chrome, no la
aplicación — así que esa parte queda **NOT TESTED** en vez de reportada. El
editor en móvil tampoco se probó: exige la sesión, que vive en la ventana del
dev, y el ancho mínimo real de esa ventana fue 530 px.


### Defectos NUEVOS encontrados por el E2E

Los que no estaban en el diagnóstico estático, o que estaban pero **cambian de
gravedad** al verlos ocurrir.

#### N-1 · El autoguardado se atasca y el editor no vuelve a guardar nunca — **CRÍTICA**
Ya estaba como hipótesis en §5.1 (`use-autosave.ts:71-80`). **Reproducido, y es
peor que lo escrito:** no se pierde «lo tecleado después de 1.2 s», se pierde
**todo lo que venga después**, porque el temporizador no se rearma jamás
mientras siga habiendo cambios. Sumado a `invitation-editor.tsx:494`
(«Guardando…» permanente), a que **no hay botón de guardar** y a que salir por
la navegación interna no avisa, el resultado es pérdida de trabajo silenciosa y
definitiva. Sube de «hipótesis de alta confianza» a **medida**.
· Anclas: `use-autosave.ts:70-80` · `:82-92` · `invitation-editor.tsx:189`, `:494`.

#### N-2 · Las palabras que se añaden a un título después del montaje no se pintan nunca — **ALTA**
**Medido con evidencia de píxel.** Al escribir `Uno Dos Tres Cuatro` en el
título, la vista previa pinta **sólo «Uno»**. Las demás palabras existen en el
DOM, con caja y posición correctas, pero en `opacity: 0` y
`transform: translateY(18px)` **para siempre** (pestaña visible, `raf` vivo, 6+
segundos). Al recargar se ven las cuatro.
· Causa anclada: `src/components/animation/text-reveal.tsx:47` parte por palabra;
`:62` usa `key={i}`; `:56-58` monta con `initial="hidden"` y `whileInView` con
`once: true` (`:33`); el estado oculto es `:15` (`y:"0.6em", opacity:0` — y
`0.6em × 30px = 18px`, exactamente lo medido). El hero lo monta **sin `key`**
(`src/components/modules/previews.tsx:484`), así que el contenedor no se remonta
al editar y su observador ya no vuelve a disparar: las palabras nuevas se montan
en `hidden` y nadie las promueve.
· **Alcance:** el mismo componente vive en la página pública
(`public-invitation.tsx:116`), pero allí el título **no cambia después del
montaje**, así que el defecto no se manifiesta. Es, en la práctica, un defecto
del **editor** — y el editor es justo donde el anfitrión escribe su título.
· **Ninguna prueba lo cubre:** cero menciones a `TextReveal` / `whileInView` en
la suite. `recorte-y-umbral.test.ts` suena cercana y no lo caza: sus cuatro
aserciones (`:41`, `:47`, `:52-53`, `:58-59`) comparan la lista de presets
contra el texto de `animations.css` — otro mecanismo, cero solapamiento.

#### N-3 · El RSVP público no tiene idempotencia: el mismo invitado confirma cuantas veces quiera — **ALTA**
**Medido.** Tras un refresh, el formulario se ofrece de nuevo sin memoria de la
confirmación previa. Se envió **el mismo nombre y el mismo correo** una segunda
vez y quedaron **dos filas idénticas** en `rsvp_responses`. El panel del evento
pasó a decir **«RESPUESTAS RECIBIDAS 2 · ASISTENTES CONFIRMADOS 2 · 2 personas
en total»** por **una sola persona**.
· **Impacto:** el anfitrión planea comida y lugares para gente que no existe; y
en los planes con tope de invitados, cada reenvío consume cupo. Cualquiera con
el enlace puede inflar la lista, y no hay rate limit (§5.8 ya lo anotaba).
· El doble clic **sí** está protegido; lo que no está protegido es el **reenvío**.

#### N-4 · Borrar una invitación deja sus imágenes servidas al público — **MEDIA**
**Verificado por efecto, no sólo por `grep`.** Tras borrar la invitación, su
imagen seguía en `HTTP 200`, 43 983 bytes, en un bucket público. Las 10 filas de
módulos y las 2 de RSVP sí cayeron por `CASCADE`. `deleteInvitation`
(`actions.ts:287-303`) no toca Storage y **no existe ninguna llamada `.remove()`
en todo `src/`**. La foto de la boda de un cliente que borró su invitación sigue
descargable por quien tenga la URL.

#### N-5 · Los controles del RSVP quedan por debajo del mínimo táctil en móvil — **BAJA**
A 375 px, **7 de 8** controles miden menos de 44 px de alto: los campos de texto
**30 px** y los botones **41 px** (mínimo recomendado 44 pt / 48 dp). No hay
desbordes, pero el formulario que decide la conversión del producto es el más
difícil de tocar.

#### N-6 · Dos páginas del panel heredan el título de la portada — **BAJA**
`/dashboard/billing` y `/dashboard/referrals` no declaran `export const
metadata`, así que su `<title>` es **«Sobrely — Invitaciones digitales
dinámicas»**. Medido en el HTML servido y en el fuente (`grep -c` = 0 en los dos
archivos, = 1 en `dashboard`, `templates` y `animations`). Afecta a pestañas y
marcadores.

#### N-7 · El botón principal de crear no pasa por categoría ni plantilla — **dato de alcance**
`+ Nueva invitación` crea una invitación **en blanco** y salta al editor. El
flujo «categoría → plantilla» sólo existe entrando por `Plantillas`. No es un
fallo, pero conviene saberlo antes de diseñar el onboarding.

---

### Lo que el E2E **confirmó en vivo** del diagnóstico estático

| Hallazgo del informe | Cómo se confirmó |
|---|---|
| §5.3 copy de editor en la vista pública | «Agrega fotos a tu galería.» servido en la invitación **publicada** |
| §5.8 invitaciones indexables | `meta[name=robots]` → `null` en la página publicada |
| §5.8 username = parte local del correo | URL pública `/arturodejesuscz-d0bd4f/…` |
| §5.4 `redirectTo` pierde el destino | `/dashboard/billing` sin sesión → `?redirectTo=/dashboard` |
| §5.2 `/editor/*` responde 200 | `/editor/<uuid inexistente>` sin sesión → **200** |
| §5.1 autoguardado y indicador que miente | N-1, reproducido y agravado |
| §5.2 borrar no comprueba filas | El borrado funcionó; el defecto sigue latente (`actions.ts:301` no mira filas afectadas) |
| §5.3 el catálogo no dice el plan | Ninguna de las 12 tarjetas de Cumpleaños indica plan |

### Lo que el E2E **no** pudo confirmar

- **U-3 (itinerario invisible).** No se reproduce en `cumpleanos-galaxia`, ni
  con scroll lento ni rápido. La §3 sigue en pie —se midió sobre otras dos
  publicadas— pero el defecto parece **depender del preset de animación**, y esa
  acotación falta en el informe.
- **Todo el muro de pago.** La cuenta del dev es admin y está *comped*
  (`invitation_owner_is_comped` → `true`, plan efectivo `premium`), así que
  `canPublishInvitation` nunca llegó a negar nada. **Los gates de plan siguen
  sin ejercitarse en runtime**, y hacerlo exigiría una cuenta no admin.
- **Modo «lista de invitados».** La invitación de prueba se creó en
  `Confirmación abierta`. El puenteo descrito en §5.8 no se volvió a probar.
- **Admin en runtime**, **Mercado Pago**, y el **build de producción**: igual que
  antes, sin ejecutar.
- **Móvil real a 375 px con animación**, y **el editor en móvil**: ver el punto 2
  de la tabla transversal.
