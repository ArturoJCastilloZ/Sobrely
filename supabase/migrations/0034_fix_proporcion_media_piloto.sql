-- ============================================================================
-- 0034 — La proporción del slot de media no coincidía con la fuente
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano.
--
-- Corrige un error MÍO en la `0033`, que ya está aplicada y por eso no se toca.
--
-- ----------------------------------------------------------------------------
-- Qué pasó, medido
-- ----------------------------------------------------------------------------
-- Las dos fotografías que van en el slot de media son **apaisadas 3/2**
-- (1600×1067 y 1600×1068). Les declaré proporciones que no les corresponden, y
-- como el slot pinta con `object-fit: cover`, la diferencia se paga recortando
-- LOS LADOS:
--
--   baby-punto-y-flor   · slot 3/4 (0.75) vs fuente 1.50 → se perdía el **50%**
--   graduacion-diploma  · slot 4/3 (1.33) vs fuente 1.50 → se perdía el **11%**
--
-- En la de baby el daño era total y sólo se vio MIRANDO la miniatura: el sujeto
-- —los patucos sobre el taburete— está a la IZQUIERDA y el jarrón a la DERECHA,
-- así que el recorte central de `object-position: 50% 50%` se quedaba
-- exactamente con la pared vacía de en medio. La plantilla se anunciaba con una
-- franja gris.
--
-- Medido en el navegador antes de escribir esto:
--   caja 388×517 (0.75) · fuente 1600×1067 (1.50) · «LATERAL: se pierde el 50%»
--
-- ----------------------------------------------------------------------------
-- Por qué el arreglo es la PROPORCIÓN y no el `focal`
-- ----------------------------------------------------------------------------
-- Lo natural sería mover el encuadre hacia la izquierda. **No se puede**:
-- `MEDIA_FOCALS` sólo tiene `top | center | bottom`, o sea un eje VERTICAL, y
-- aquí el recorte es horizontal. Es un hueco real de la primitiva P2, que sólo
-- apareció al usarla, y queda anotado en el roadmap — pero para estas dos la
-- solución correcta no es recortar mejor sino **no recortar**: igualar la
-- proporción del slot a la de la fuente.
-- ============================================================================

update public.templates
   set modules_config = jsonb_set(
         modules_config,
         '{1,config,media,ratio}',
         '"3/2"'::jsonb,
         false  -- `false` = NO crear la clave si no existe: si la forma no es
                -- la que creo, prefiero 0 filas tocadas a un jsonb inventado.
       )
 where slug in ('baby-punto-y-flor', 'graduacion-diploma')
   -- Guardas de forma: el índice 1 va escrito, así que se comprueba que ahí
   -- viva de verdad el módulo con el slot. Si la plantilla cambia de orden en
   -- el futuro, esto no toca nada en vez de corromper el módulo equivocado.
   and modules_config -> 1 ->> 'module_type' = 'welcome'
   and modules_config #> '{1,config,media,url}' is not null;

-- ============================================================================
-- Verificación (debe dar 2, y ambas en 3/2)
-- ============================================================================
--
--   select slug, modules_config #>> '{1,config,media,ratio}' as proporcion
--     from public.templates
--    where slug in ('baby-punto-y-flor','graduacion-diploma');
--     -- baby-punto-y-flor   | 3/2
--     -- graduacion-diploma  | 3/2
--
-- Si alguna sale distinta de `3/2`, la guarda de forma falló y hay que mirar
-- el `modules_config` antes de volver a correr nada.
--
-- ============================================================================
-- Después: recapturar SÓLO esas dos y commitearlas con el bump de revisión.
-- ============================================================================
--   node scripts/capturar-miniaturas.mts baby-punto-y-flor graduacion-diploma
-- ============================================================================
