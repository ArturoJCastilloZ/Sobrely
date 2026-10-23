/**
 * ¿Ya se lanzó la creación automática de esta plantilla hace un momento?
 *
 * Existe porque un `useRef` NO basta, y se midió que no basta. Al volver de
 * iniciar sesión, la página se monta con `?usar=1`; el componente quita el
 * parámetro con `history.replaceState` y crea la invitación. Next, al terminar
 * la acción, reconstruye el árbol desde su caché de la navegación ORIGINAL —que
 * todavía contenía el componente— y monta una INSTANCIA NUEVA, con su propio
 * `ref` en `false`. Resultado medido en el navegador: dos `createFromTemplate`
 * con 0.1 s de diferencia y dos invitaciones iguales, aunque StrictMode sí
 * quedaba frenado por el `ref` (el segundo efecto de la MISMA instancia veía
 * `iniciado: true`; la instancia nueva no).
 *
 * La memoria tiene que vivir FUERA del componente:
 *   - `memoria` (un `Map` del módulo) sobrevive a un remonte dentro de la misma
 *     carga de la página.
 *   - `almacen` (`sessionStorage`) sobrevive también a una recarga completa de la
 *     pestaña. Puede no existir o lanzar (modo privado, almacenamiento
 *     bloqueado): entonces queda solo la memoria del módulo, que cubre el caso
 *     medido.
 *
 * Caduca (`ventanaMs`) para no bloquear de por vida: quien más tarde repita el
 * recorrido con la misma plantilla debe poder crear otra invitación.
 *
 * Es síncrona a propósito: consultar y marcar en el mismo turno es lo que impide
 * que dos instancias que arrancan juntas pasen las dos.
 */
export const VENTANA_LANZAMIENTO_MS = 60 * 1000;

type Almacen = Pick<Storage, "getItem" | "setItem">;

export function reclamarLanzamiento(
  clave: string,
  memoria: Map<string, number>,
  almacen: Almacen | null,
  ahora: number = Date.now(),
  ventanaMs: number = VENTANA_LANZAMIENTO_MS,
): boolean {
  const reciente = (t: number | undefined) =>
    typeof t === "number" && Number.isFinite(t) && ahora - t >= 0 && ahora - t < ventanaMs;

  if (reciente(memoria.get(clave))) return false;

  try {
    // `getItem` devuelve `null` si no hay valor, y `Number(null)` es `0`: sin
    // este chequeo «no hay marca» se leía como «marca en el instante cero».
    const guardado = almacen?.getItem(clave) ?? null;
    if (guardado !== null && guardado !== "" && reciente(Number(guardado))) return false;
  } catch {
    // Almacenamiento bloqueado: se sigue con la memoria del módulo.
  }

  memoria.set(clave, ahora);
  try {
    almacen?.setItem(clave, String(ahora));
  } catch {
    // Ídem: no se puede escribir, pero la memoria del módulo ya quedó marcada.
  }
  return true;
}
