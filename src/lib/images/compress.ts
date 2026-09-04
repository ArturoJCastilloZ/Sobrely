/**
 * Compresión de imagen del lado del cliente: reduce a una dimensión máxima y
 * re-codifica para que la subida pese poco. Corre entera en el navegador
 * (canvas), así que ningún dato de imagen sale del dispositivo salvo la subida
 * final que el usuario dispara.
 *
 * El formato de salida NO es fijo: si la imagen trae canal alfa se codifica
 * WebP, que lo conserva. JPEG no tiene alfa y aplanaba los PNG transparentes a
 * un rectángulo opaco — justo lo que el editor pide para stickers, marcos y
 * ornamentos (".png sin fondo").
 */

/** Tipos de origen que PUEDEN traer alfa. Un JPEG nunca la tiene. */
const ALPHA_CAPABLE = new Set([
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
]);

export type CompressedImage = {
  blob: Blob;
  /** MIME real del blob. El llamador DEBE usar este, no asumir jpeg. */
  contentType: string;
  /** Extensión de archivo que corresponde a `contentType`, sin punto. */
  ext: string;
};

/** ¿El tipo de origen puede traer canal alfa? Evita escanear un JPEG en vano. */
export function mayHaveAlpha(sourceType: string): boolean {
  return ALPHA_CAPABLE.has(sourceType.toLowerCase());
}

/**
 * Busca un píxel no-opaco en un buffer RGBA. Sale al primero que encuentra.
 * Se separa de `compressImage` para poder probarla sin DOM.
 */
export function hasAlphaPixel(rgba: Uint8ClampedArray): boolean {
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] < 255) return true;
  }
  return false;
}

const EXT_BY_TYPE: Record<string, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
};

/** Extensión para un MIME de salida; `jpg` como último recurso. */
export function extForType(contentType: string): string {
  return EXT_BY_TYPE[contentType] ?? "jpg";
}

export async function compressImage(
  file: File,
  opts: { maxSize?: number; quality?: number } = {},
): Promise<CompressedImage> {
  const maxSize = opts.maxSize ?? 1600;
  const quality = opts.quality ?? 0.82;

  const passthrough = (): CompressedImage => ({
    blob: file,
    contentType: file.type || "image/jpeg",
    ext: extForType(file.type),
  });

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return passthrough();
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Solo escaneamos píxeles si el formato de origen puede tener alfa.
  let keepAlpha = false;
  if (mayHaveAlpha(file.type)) {
    try {
      keepAlpha = hasAlphaPixel(ctx.getImageData(0, 0, width, height).data);
    } catch {
      // getImageData puede fallar (canvas contaminado). Ante la duda,
      // conservamos el alfa: perderla es el bug que estamos arreglando.
      keepAlpha = true;
    }
  }

  const wanted = keepAlpha ? "image/webp" : "image/jpeg";
  let blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, wanted, quality),
  );

  // `toBlob` ignora en silencio un tipo que no soporta y devuelve PNG. Si
  // pedimos WebP y no lo dieron, PNG también conserva el alfa: lo aceptamos.
  if (keepAlpha && blob && blob.type !== "image/webp") {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
  }

  if (!blob) return passthrough();
  return { blob, contentType: blob.type, ext: extForType(blob.type) };
}
