/** RSVP attendance statuses shared across the public form and dashboard. */
export const ATTENDANCE_STATUSES = ["yes", "no", "maybe"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  yes: "Asistirá",
  no: "No asistirá",
  maybe: "Tal vez",
};

/** Short labels used on the public form buttons. */
export const ATTENDANCE_SHORT: Record<AttendanceStatus, string> = {
  yes: "Sí, asistiré",
  no: "No podré",
  maybe: "Tal vez",
};

export const MAX_GUEST_COUNT = 20;
