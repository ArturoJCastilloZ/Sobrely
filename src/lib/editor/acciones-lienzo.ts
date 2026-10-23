/**
 * Acciones puntuales que un panel del editor solicita al lienzo.
 *
 * La selección sigue siendo estado compartido; esto no la duplica. Este
 * evento sólo resuelve el caso en el que el inspector debe pedir una acción
 * imperativa al DOM que vive dentro del lienzo, por ejemplo abrir la edición
 * directa de un texto ya seleccionado.
 */
export const SOLICITAR_EDICION_BLOQUE = "sobrely:editar-bloque";

export type SolicitudEdicionBloque = {
  moduloId: string;
  bloque: string;
};

/** Se llama exclusivamente desde un evento de interfaz, ya en el navegador. */
export function solicitarEdicionBloque(solicitud: SolicitudEdicionBloque) {
  document.dispatchEvent(
    new CustomEvent<SolicitudEdicionBloque>(SOLICITAR_EDICION_BLOQUE, {
      detail: solicitud,
    }),
  );
}
