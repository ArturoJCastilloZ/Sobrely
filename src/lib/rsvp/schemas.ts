import { z } from "zod";
import { ATTENDANCE_STATUSES, MAX_GUEST_COUNT } from "./constants";

/** Public RSVP submission. Validated on the client and again on the server. */
export const rsvpSubmitSchema = z.object({
  invitationId: z.string().uuid(),
  guestName: z.string().trim().min(1, "Escribe tu nombre.").max(120),
  guestEmail: z
    .union([z.string().trim().email("Correo inválido."), z.literal("")])
    .default(""),
  attendanceStatus: z.enum(ATTENDANCE_STATUSES, {
    message: "Selecciona una opción de asistencia.",
  }),
  guestCount: z.coerce
    .number()
    .int()
    .min(1, "Mínimo 1 invitado.")
    .max(MAX_GUEST_COUNT, `Máximo ${MAX_GUEST_COUNT} invitados.`)
    .default(1),
  message: z.string().trim().max(500).optional().default(""),
});

export type RsvpSubmitInput = z.infer<typeof rsvpSubmitSchema>;

/** Owner-side edit of an existing response. */
export const rsvpUpdateSchema = z.object({
  id: z.string().uuid(),
  guestName: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
  guestEmail: z
    .union([z.string().trim().email("Correo inválido."), z.literal("")])
    .default(""),
  attendanceStatus: z.enum(ATTENDANCE_STATUSES),
  guestCount: z.coerce.number().int().min(1).max(MAX_GUEST_COUNT).default(1),
  message: z.string().trim().max(500).optional().default(""),
});

export type RsvpUpdateInput = z.infer<typeof rsvpUpdateSchema>;
