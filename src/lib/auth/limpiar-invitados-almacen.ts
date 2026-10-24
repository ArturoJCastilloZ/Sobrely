/**
 * Recorre `invitation-images/<usuario>/…` y devuelve la ruta de CADA archivo.
 *
 * Existe porque la limpieza listaba solo `<usuario>/`, y ahí Supabase devuelve las CARPETAS
 * (`<usuario>/<invitación>/`, sin `id`), no los archivos. Borrar esas «rutas» no borra nada
 * (`remove` responde `[]`) y el usuario se eliminaba dejando sus imágenes en el bucket público.
 * Medido contra el almacenamiento local el 24 oct 2026 al preparar la revisión T08.
 *
 * Sin `server-only` y con `listar` inyectada para poder probarla; el adaptador la conecta.
 */
export type EntradaDeLista = { name: string; id: string | null };
export type Listar = (prefijo: string) => Promise<EntradaDeLista[] | null>;

const PROFUNDIDAD_MAXIMA = 4;

/** `null` si alguna lista falla: borrar a medias dejaría archivos huérfanos sin aviso. */
export async function recopilarRutas(
  listar: Listar,
  prefijo: string,
  profundidad = 0,
): Promise<string[] | null> {
  if (profundidad > PROFUNDIDAD_MAXIMA) return null;
  const entradas = await listar(prefijo);
  if (entradas === null) return null;
  const rutas: string[] = [];
  for (const e of entradas) {
    const ruta = `${prefijo}/${e.name}`;
    if (e.id === null) {
      const dentro = await recopilarRutas(listar, ruta, profundidad + 1);
      if (dentro === null) return null;
      rutas.push(...dentro);
    } else {
      rutas.push(ruta);
    }
  }
  return rutas;
}
