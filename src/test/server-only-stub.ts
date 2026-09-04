/**
 * Stub de `server-only` para la suite unitaria.
 *
 * El paquete real solo existe para que el build de Next falle si un módulo
 * server-side se importa desde el cliente; en Node (vitest) no resuelve. El
 * alias vive en `vitest.config.mts` y NO afecta al build: ahí sigue el paquete
 * real, con su garantía intacta.
 */
export {};
