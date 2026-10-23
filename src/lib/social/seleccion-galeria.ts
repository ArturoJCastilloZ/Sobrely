/**
 * Lógica pura del script `scripts/capturar-galeria-social.mts`: qué plantillas
 * salen en cada imagen y cómo comprobar la imagen que salió. Vive en `src/` para
 * que `vitest` la pruebe; el script la importa.
 *
 * Sin dependencias de Node ni del navegador: solo datos in, datos out.
 */
export type Candidata = {
  /** Nombre del archivo de la miniatura, sin extensión (p. ej. `xv-con-sesion`). */
  slug: string;
  /** Peso de la miniatura en bytes. Proxy de «cuánto detalle visual trae». */
  bytes: number;
};

/**
 * Elige las plantillas de UNA imagen.
 *
 * Orden: primero las `prioritarias` que existan, en el orden dado (es una lista
 * CURADA a mano: las que sé que traen fotos o se ven mejor); después el resto por
 * peso de miniatura descendente y, a igualdad, por nombre. El peso es un proxy
 * IMPERFECTO —sube con las fotos pero también con las texturas— y por eso solo
 * desempata: no decide por encima de la curaduría.
 *
 * `grupo` parte la lista ordenada en tandas de `cantidad`: el grupo 0 es la tanda
 * más vistosa, el 1 la siguiente. Así dos imágenes del mismo tema no repiten tarjeta.
 *
 * Determinista: mismas entradas, mismas salidas (no usa azar ni la fecha).
 */
export function elegirTarjetas(
  candidatas: readonly Candidata[],
  o: { prioritarias: readonly string[]; cantidad: number; grupo: number },
): string[] {
  if (!Number.isInteger(o.cantidad) || o.cantidad < 1) {
    throw new Error("`cantidad` debe ser un entero mayor que 0.");
  }
  if (!Number.isInteger(o.grupo) || o.grupo < 0) {
    throw new Error("`grupo` debe ser un entero mayor o igual que 0.");
  }

  // Sin repetidas: una plantilla que aparece dos veces ocuparía dos lugares.
  const vistas = new Set<string>();
  const unicas = candidatas.filter((c) => {
    if (vistas.has(c.slug)) return false;
    vistas.add(c.slug);
    return true;
  });

  const existentes = new Set(unicas.map((c) => c.slug));
  const prioridad = o.prioritarias.filter(
    (s, i, a) => existentes.has(s) && a.indexOf(s) === i,
  );
  const enPrioridad = new Set(prioridad);
  const resto = unicas
    .filter((c) => !enPrioridad.has(c.slug))
    .sort((a, b) => b.bytes - a.bytes || a.slug.localeCompare(b.slug))
    .map((c) => c.slug);

  const ordenadas = [...prioridad, ...resto];
  return ordenadas.slice(o.grupo * o.cantidad, (o.grupo + 1) * o.cantidad);
}

/**
 * Cuántas imágenes de `cantidad` tarjetas completas salen de `total` plantillas.
 * Una tanda incompleta NO cuenta: una imagen con dos tarjetas y un hueco se ve rota.
 */
export function gruposCompletos(total: number, cantidad: number): number {
  if (!Number.isInteger(cantidad) || cantidad < 1) return 0;
  return Math.floor(Math.max(0, total) / cantidad);
}

/** Nombre de la plantilla a partir de la URL de la imagen de su tarjeta. */
export function slugDeImagen(src: string): string | null {
  // Next sirve la miniatura como `/_next/image?url=%2Fpreviews%2Fplantillas%2F<slug>.jpg%3Fv%3D…`.
  let ruta = src;
  try {
    const url = new URL(src, "http://x");
    ruta = url.searchParams.get("url") ?? url.pathname;
  } catch {
    return null;
  }
  const m = /\/previews\/plantillas\/([a-z0-9-]+)\.jpg/i.exec(ruta);
  return m ? m[1] : null;
}

/**
 * Dimensiones de un JPEG leyendo su cabecera (marcadores SOF). Sirve para
 * COMPROBAR la imagen que salió en vez de confiar en la configuración del
 * navegador: un recorte mal calculado produce un JPEG perfectamente válido de
 * otro tamaño, y Facebook lo recortaría sin avisar.
 */
export function dimensionesJpeg(b: Uint8Array): { ancho: number; alto: number } | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marcador = b[i + 1];
    // Marcadores sin longitud: relleno y SOI/EOI/RSTn/TEM.
    if (marcador === 0xff) {
      i += 1;
      continue;
    }
    if (marcador === 0xd8 || marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) {
      i += 2;
      continue;
    }
    const longitud = (b[i + 2] << 8) | b[i + 3];
    // SOF0–SOF15, salvo DHT (C4), JPG (C8) y DAC (CC), que no son cabeceras de marco.
    const esSof =
      marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador);
    if (esSof) {
      const alto = (b[i + 5] << 8) | b[i + 6];
      const ancho = (b[i + 7] << 8) | b[i + 8];
      return alto > 0 && ancho > 0 ? { ancho, alto } : null;
    }
    if (longitud < 2) return null;
    i += 2 + longitud;
  }
  return null;
}
