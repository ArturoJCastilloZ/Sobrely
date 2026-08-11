/**
 * Client-side image compression: downscales to a max dimension and re-encodes
 * as JPEG to keep uploads small. Runs entirely in the browser (canvas), so no
 * image data leaves the device except the final upload the user triggers.
 */
export async function compressImage(
  file: File,
  opts: { maxSize?: number; quality?: number } = {},
): Promise<Blob> {
  const maxSize = opts.maxSize ?? 1600;
  const quality = opts.quality ?? 0.82;

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
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  return blob ?? file;
}
