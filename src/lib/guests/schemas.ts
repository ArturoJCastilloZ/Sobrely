import { z } from "zod";

/** Cupo máximo asignable a un solo invitado nominal. */
export const MAX_GUEST_ALLOTMENT = 20;

/** Alta/edición de un invitado nominal (lado dueño). */
export const guestUpsertSchema = z.object({
  invitationId: z.string().uuid(),
  name: z.string().trim().min(1, "Escribe el nombre del invitado.").max(120),
  maxGuests: z.coerce
    .number()
    .int()
    .min(1, "Mínimo 1 lugar.")
    .max(MAX_GUEST_ALLOTMENT, `Máximo ${MAX_GUEST_ALLOTMENT} lugares.`)
    .default(1),
});

export type GuestUpsertInput = z.infer<typeof guestUpsertSchema>;

/** Edición de un invitado existente (lado dueño). */
export const guestEditSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
  maxGuests: z.coerce.number().int().min(1).max(MAX_GUEST_ALLOTMENT).default(1),
});

export type GuestEditInput = z.infer<typeof guestEditSchema>;

/** Alta masiva: una línea por invitado, "Nombre, cupo" (cupo opcional = 1). */
export const guestBulkSchema = z.object({
  invitationId: z.string().uuid(),
  raw: z.string().trim().min(1, "Pega al menos un invitado."),
});

export type GuestBulkInput = z.infer<typeof guestBulkSchema>;

/** Respuesta del invitado por token (lado público, anónimo). */
export const guestRespondSchema = z.object({
  token: z.string().trim().min(16, "Enlace inválido.").max(128),
  // > 0 confirma ese cupo; 0 declina ("Cancelar asistencia").
  confirmedCount: z.coerce.number().int().min(0).max(MAX_GUEST_ALLOTMENT),
  message: z.string().trim().max(500).optional().default(""),
});

export type GuestRespondInput = z.infer<typeof guestRespondSchema>;

/**
 * Extrae el access_token de lo que arroja el escáner: puede ser el token crudo
 * o la URL completa del invitado (`https://…/g/<token>`). Devuelve el token
 * saneado (solo hex) o "" si no reconoce nada válido.
 */
export function extractTokenFromScan(scanned: string): string {
  const raw = (scanned ?? "").trim();
  if (!raw) return "";
  // Si viene como URL, toma el segmento después de /g/.
  const match = raw.match(/\/g\/([^/?#]+)/i);
  const candidate = match ? match[1] : raw;
  // Los tokens son hex (gen_random_bytes → encode hex). Sanea.
  return /^[a-f0-9]{16,128}$/i.test(candidate) ? candidate.toLowerCase() : "";
}

/**
 * Parsea el texto de alta masiva a filas `{ name, maxGuests }`. Formato por
 * línea: `Nombre` o `Nombre, cupo`. Ignora líneas vacías; cupo inválido = 1.
 */
export function parseBulkGuests(raw: string): { name: string; maxGuests: number }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",");
      const name = (parts[0] ?? "").trim();
      const parsed = parseInt((parts[1] ?? "").trim(), 10);
      const maxGuests =
        Number.isFinite(parsed) && parsed >= 1
          ? Math.min(parsed, MAX_GUEST_ALLOTMENT)
          : 1;
      return { name, maxGuests };
    })
    .filter((g) => g.name.length > 0 && g.name.length <= 120);
}
