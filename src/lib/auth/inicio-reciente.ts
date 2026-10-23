/**
 * ¿La persona acaba de iniciar sesión?
 *
 * Existe para una sola decisión: si volver a `/plantillas/<slug>?usar=1`
 * CREA la invitación sola o solo muestra la plantilla. Crear algo porque una
 * URL lo pide es un cambio de estado disparado por navegación: sin esta
 * ventana, un enlace ajeno a `…?usar=1` crearía un borrador en la cuenta de
 * cualquiera que lo abriera ya con sesión. El daño sería pequeño (un borrador
 * en su propia cuenta) pero es el patrón equivocado, y arreglarlo es barato:
 * solo se crea cuando el inicio de sesión es de hace segundos, que es lo que
 * ocurre cuando la persona viene de registrarse, confirmar su correo o entrar.
 *
 * Pura y con el reloj inyectable para poder probarla.
 */
export const VENTANA_INICIO_RECIENTE_MS = 2 * 60 * 1000;

/** Tolerancia por si el reloj del servidor de auth va unos segundos por delante. */
const HOLGURA_RELOJ_MS = 10 * 1000;

export function esInicioReciente(
  ultimoInicio: string | null | undefined,
  ahora: Date = new Date(),
  ventanaMs: number = VENTANA_INICIO_RECIENTE_MS,
): boolean {
  if (!ultimoInicio) return false;
  // Una fecha rota da `NaN`, y toda comparación con `NaN` es falsa: devuelve
  // `false` sin un chequeo aparte (una versión previa lo tenía y era código
  // muerto: quitarlo no cambiaba ningún resultado, verificado por mutación).
  const t = new Date(ultimoInicio).getTime();
  const antiguedad = ahora.getTime() - t;
  return antiguedad >= -HOLGURA_RELOJ_MS && antiguedad <= ventanaMs;
}
