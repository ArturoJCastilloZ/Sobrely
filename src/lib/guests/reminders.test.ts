import { describe, expect, it } from "vitest";

import {
  countByReason,
  emptyReminderMessage,
  planReminders,
  REMINDER_COOLDOWN_HOURS,
  type RemindableGuest,
} from "./reminders";

const AHORA = new Date("2026-09-05T12:00:00Z");
const AYER = "2026-09-04T09:00:00Z"; // 27 h antes
const HACE_UNA_HORA = "2026-09-05T11:00:00Z";

function invitado(over: Partial<RemindableGuest> = {}): RemindableGuest {
  return {
    id: "g1",
    name: "Ana",
    status: "pending",
    phone: "5512345678",
    invited_at: AYER,
    reminded_at: null,
    ...over,
  };
}

describe("planReminders", () => {
  it("incluye al pendiente con invitación enviada y teléfono usable", () => {
    const plan = planReminders([invitado()], AHORA);
    expect(plan.listos).toHaveLength(1);
    expect(plan.omitidos).toHaveLength(0);
  });

  it("excluye a quien ya respondió, confirmando o declinando", () => {
    const plan = planReminders(
      [
        invitado({ id: "a", status: "confirmed" }),
        invitado({ id: "b", status: "declined" }),
      ],
      AHORA,
    );
    expect(plan.listos).toHaveLength(0);
    expect(plan.omitidos.map((o) => o.reason)).toEqual([
      "ya_respondio",
      "ya_respondio",
    ]);
  });

  it("excluye a quien nunca recibió su invitación", () => {
    // Es el caso que hace la diferencia: recordarle a quien no ha recibido nada
    // es el consejo equivocado. Necesita la invitación, no un empujón.
    const plan = planReminders([invitado({ invited_at: null })], AHORA);
    expect(plan.listos).toHaveLength(0);
    expect(plan.omitidos[0].reason).toBe("sin_invitacion");
  });

  it("excluye a quien no tiene teléfono al que escribirle", () => {
    for (const phone of [null, "", "  ", "123", "no-es-un-teléfono"]) {
      const plan = planReminders([invitado({ phone })], AHORA);
      expect(plan.listos).toHaveLength(0);
      expect(plan.omitidos[0].reason).toBe("sin_telefono");
    }
  });

  it("respeta la ventana de cortesía y la libera al cumplirse", () => {
    const reciente = planReminders(
      [invitado({ reminded_at: HACE_UNA_HORA })],
      AHORA,
    );
    expect(reciente.omitidos[0].reason).toBe("recordado_reciente");

    // Justo pasada la ventana vuelve a estar disponible.
    const pasada = new Date(
      AHORA.getTime() + REMINDER_COOLDOWN_HOURS * 3_600_000,
    );
    const luego = planReminders(
      [invitado({ reminded_at: HACE_UNA_HORA })],
      pasada,
    );
    expect(luego.listos).toHaveLength(1);
  });

  it("un recordatorio viejo NO bloquea uno nuevo", () => {
    const plan = planReminders([invitado({ reminded_at: AYER })], AHORA);
    expect(plan.listos).toHaveLength(1);
  });

  it("reporta el motivo más definitivo, no el primero que se cumpla", () => {
    // Ya confirmó Y no tiene teléfono. Decir "sin teléfono" sería ruido: no
    // hay nada que enviarle porque ya respondió.
    const plan = planReminders(
      [invitado({ status: "confirmed", phone: null, invited_at: null })],
      AHORA,
    );
    expect(plan.omitidos[0].reason).toBe("ya_respondio");
  });

  it("una fecha corrupta no bloquea el recordatorio", () => {
    // `Infinity` horas desde una fecha ilegible: se trata como "nunca", que es
    // lo seguro. Lo contrario dejaría al invitado en un limbo permanente.
    const plan = planReminders([invitado({ reminded_at: "no-es-fecha" })], AHORA);
    expect(plan.listos).toHaveLength(1);
  });

  it("reparte una lista mezclada sin perder a nadie", () => {
    const guests = [
      invitado({ id: "1" }),
      invitado({ id: "2", status: "confirmed" }),
      invitado({ id: "3", invited_at: null }),
      invitado({ id: "4", phone: null }),
      invitado({ id: "5", reminded_at: HACE_UNA_HORA }),
      invitado({ id: "6" }),
    ];
    const plan = planReminders(guests, AHORA);
    expect(plan.listos.map((g) => g.id)).toEqual(["1", "6"]);
    expect(plan.listos.length + plan.omitidos.length).toBe(guests.length);
    expect(countByReason(plan)).toEqual({
      ya_respondio: 1,
      sin_invitacion: 1,
      sin_telefono: 1,
      recordado_reciente: 1,
    });
  });
});

describe("emptyReminderMessage", () => {
  // El caso vacío tiene significados opuestos y un "no hay nadie" seco los
  // confunde. Cada uno lleva a una acción distinta del organizador.

  it("sin lista, lo dice", () => {
    expect(emptyReminderMessage(planReminders([], AHORA))).toContain(
      "Todavía no hay invitados",
    );
  });

  it("si ya todos respondieron, es buena noticia", () => {
    const plan = planReminders([invitado({ status: "confirmed" })], AHORA);
    expect(emptyReminderMessage(plan)).toContain("Ya todos respondieron");
  });

  it("si falta enviar invitaciones, el consejo es ENVIAR", () => {
    const plan = planReminders(
      [invitado({ id: "a", invited_at: null }), invitado({ id: "b", invited_at: null })],
      AHORA,
    );
    const msg = emptyReminderMessage(plan);
    expect(msg).toContain("2");
    expect(msg).toContain("invitación");
    expect(msg).not.toContain("WhatsApp capturado");
  });

  it("si faltan teléfonos, el consejo es CAPTURAR números", () => {
    const plan = planReminders([invitado({ phone: null })], AHORA);
    expect(emptyReminderMessage(plan)).toContain("no tiene WhatsApp capturado");
  });

  it("si ya se les recordó, el consejo es ESPERAR", () => {
    const plan = planReminders([invitado({ reminded_at: HACE_UNA_HORA })], AHORA);
    const msg = emptyReminderMessage(plan);
    expect(msg).toContain(String(REMINDER_COOLDOWN_HOURS));
    expect(msg).toContain("tiempo");
  });

  it("el singular y el plural se dicen bien", () => {
    const uno = planReminders([invitado({ invited_at: null })], AHORA);
    expect(emptyReminderMessage(uno)).toContain("Falta 1 invitado");
    const dos = planReminders(
      [invitado({ id: "a", invited_at: null }), invitado({ id: "b", invited_at: null })],
      AHORA,
    );
    expect(emptyReminderMessage(dos)).toContain("Faltan 2 invitados");
  });
});
