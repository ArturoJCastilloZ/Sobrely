import { describe, expect, it } from "vitest";
import {
  activityFromGuests,
  activityFromResponses,
  buildSeries,
  funnelFromGuests,
  funnelFromResponses,
  nextAction,
  outcomesFromGuests,
  outcomesFromResponses,
  shareOf,
  type GuestRow,
  type ResponseRow,
} from "@/lib/dashboard/metrics";

function guest(over: Partial<GuestRow> = {}): GuestRow {
  return {
    name: "Invitado",
    status: "pending",
    max_guests: 2,
    confirmed_count: null,
    checked_in_at: null,
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-01T10:00:00.000Z",
    ...over,
  };
}

function response(over: Partial<ResponseRow> = {}): ResponseRow {
  return {
    guest_name: "Invitado",
    attendance_status: "yes",
    guest_count: 1,
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-01T10:00:00.000Z",
    ...over,
  };
}

describe("embudo · modo lista de invitados", () => {
  // El caso del competidor: 33 en lista, 28 confirmados (65 personas), 4 no, 1 sin responder.
  const lista: GuestRow[] = [
    ...Array.from({ length: 28 }, (_, i) =>
      guest({
        name: `Confirmado ${i}`,
        status: "confirmed",
        max_guests: 3,
        // 28 confirmaciones que suman 65 personas.
        confirmed_count: i === 0 ? 11 : 2,
      }),
    ),
    ...Array.from({ length: 4 }, () => guest({ status: "declined" })),
    guest({ status: "pending" }),
  ];

  it("distingue confirmaciones de personas que asisten", () => {
    const f = funnelFromGuests(lista);
    expect(f.confirmed).toBe(28);
    expect(f.attendees).toBe(65);
  });

  it("la tasa de respuesta usa la lista como denominador", () => {
    const f = funnelFromGuests(lista);
    expect(f.registered).toBe(33);
    expect(f.responded).toBe(32);
    expect(Math.round((f.responseRate ?? 0) * 100)).toBe(97);
  });

  it("los porcentajes por estado van sobre la lista completa", () => {
    const f = funnelFromGuests(lista);
    expect(Math.round(shareOf(f, f.confirmed))).toBe(85);
    expect(Math.round(shareOf(f, f.declined))).toBe(12);
    expect(Math.round(shareOf(f, f.pending ?? 0))).toBe(3);
  });

  it("suma lugares apartados y check-ins", () => {
    const f = funnelFromGuests([
      guest({ status: "confirmed", max_guests: 2, confirmed_count: 2, checked_in_at: "2026-08-20T01:00:00.000Z" }),
      guest({ status: "confirmed", max_guests: 4, confirmed_count: 3 }),
    ]);
    expect(f.allotted).toBe(6);
    expect(f.attendees).toBe(5);
    expect(f.checkedIn).toBe(1);
  });

  it("lista vacía no produce NaN: la tasa es null, no 0/0", () => {
    const f = funnelFromGuests([]);
    expect(f.responseRate).toBeNull();
    expect(f.registered).toBe(0);
    expect(shareOf(f, 0)).toBe(0);
  });

  it("un confirmado sin confirmed_count no rompe el total de asistentes", () => {
    const f = funnelFromGuests([guest({ status: "confirmed", confirmed_count: null })]);
    expect(f.attendees).toBe(0);
  });
});

describe("embudo · modo abierto", () => {
  const abiertas: ResponseRow[] = [
    response({ attendance_status: "yes", guest_count: 2 }),
    response({ attendance_status: "yes", guest_count: 3 }),
    response({ attendance_status: "no", guest_count: 0 }),
    response({ attendance_status: "maybe", guest_count: 1 }),
  ];

  it("NO inventa tasa de respuesta: sin lista previa no hay denominador", () => {
    const f = funnelFromResponses(abiertas);
    expect(f.responseRate).toBeNull();
    expect(f.registered).toBeNull();
    expect(f.pending).toBeNull();
  });

  it("cuenta tal vez aparte y solo suma asistentes de los que dijeron sí", () => {
    const f = funnelFromResponses(abiertas);
    expect(f.confirmed).toBe(2);
    expect(f.declined).toBe(1);
    expect(f.maybe).toBe(1);
    expect(f.attendees).toBe(5);
  });

  it("los porcentajes caen sobre el total de respuestas", () => {
    const f = funnelFromResponses(abiertas);
    expect(Math.round(shareOf(f, f.confirmed))).toBe(50);
  });
});

describe("serie acumulada", () => {
  const now = new Date("2026-08-10T12:00:00.000Z");

  it("acumula y rellena los días sin movimiento", () => {
    const s = buildSeries(
      [
        { at: "2026-08-08T10:00:00.000Z", kind: "confirmed" },
        { at: "2026-08-10T09:00:00.000Z", kind: "confirmed" },
        { at: "2026-08-10T11:00:00.000Z", kind: "declined" },
      ],
      4,
      now,
    );
    expect(s.map((p) => p.day)).toEqual([
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
      "2026-08-10",
    ]);
    expect(s.map((p) => p.confirmed)).toEqual([0, 1, 1, 2]);
    expect(s.map((p) => p.declined)).toEqual([0, 0, 0, 1]);
  });

  it("lo anterior a la ventana entra como acumulado inicial, no se pierde", () => {
    const s = buildSeries(
      [
        { at: "2026-06-01T10:00:00.000Z", kind: "confirmed" },
        { at: "2026-06-02T10:00:00.000Z", kind: "confirmed" },
        { at: "2026-08-10T10:00:00.000Z", kind: "confirmed" },
      ],
      3,
      now,
    );
    expect(s[0].confirmed).toBe(2);
    expect(s[s.length - 1].confirmed).toBe(3);
  });

  it("la serie nunca decrece y siempre trae un punto por día", () => {
    const s = buildSeries(
      [{ at: "2026-08-05T10:00:00.000Z", kind: "confirmed" }],
      30,
      now,
    );
    expect(s).toHaveLength(30);
    for (let i = 1; i < s.length; i++) {
      expect(s[i].confirmed).toBeGreaterThanOrEqual(s[i - 1].confirmed);
    }
  });

  it("ignora fechas inválidas y futuras en vez de romper", () => {
    const s = buildSeries(
      [
        { at: "no-es-fecha", kind: "confirmed" },
        { at: "2027-01-01T00:00:00.000Z", kind: "confirmed" },
        { at: "2026-08-10T10:00:00.000Z", kind: "confirmed" },
      ],
      2,
      now,
    );
    expect(s[s.length - 1].confirmed).toBe(1);
  });

  it("tal vez no entra en la serie: no es confirmación ni rechazo", () => {
    const outcomes = outcomesFromResponses([
      response({ attendance_status: "maybe" }),
      response({ attendance_status: "yes" }),
    ]);
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].kind).toBe("confirmed");
  });

  it("los pendientes no entran en la serie de la lista", () => {
    expect(
      outcomesFromGuests([guest({ status: "pending" }), guest({ status: "declined" })]),
    ).toHaveLength(1);
  });
});

describe("actividad reciente", () => {
  it("ordena de la respuesta más nueva a la más vieja y excluye pendientes", () => {
    const items = activityFromGuests([
      guest({ name: "Vieja", status: "confirmed", updated_at: "2026-08-01T10:00:00.000Z" }),
      guest({ name: "Nueva", status: "declined", updated_at: "2026-08-09T10:00:00.000Z" }),
      guest({ name: "Sin responder", status: "pending" }),
    ]);
    expect(items.map((i) => i.name)).toEqual(["Nueva", "Vieja"]);
  });

  it("marca 'cambió' cuando updated_at es posterior a created_at", () => {
    const [item] = activityFromGuests([
      guest({
        status: "confirmed",
        created_at: "2026-08-01T10:00:00.000Z",
        updated_at: "2026-08-06T10:00:00.000Z",
      }),
    ]);
    expect(item.changed).toBe(true);
  });

  it("no marca 'cambió' por el jitter del trigger de updated_at", () => {
    const [item] = activityFromGuests([
      guest({
        status: "confirmed",
        created_at: "2026-08-01T10:00:00.000Z",
        updated_at: "2026-08-01T10:00:00.500Z",
      }),
    ]);
    expect(item.changed).toBe(false);
  });

  it("respeta el límite pedido", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      guest({ status: "confirmed", updated_at: `2026-08-${String(i + 1).padStart(2, "0")}T10:00:00.000Z` }),
    );
    expect(activityFromGuests(many, 5)).toHaveLength(5);
  });

  it("en modo abierto traduce los estados yes/no/maybe", () => {
    const items = activityFromResponses([
      response({ attendance_status: "maybe", guest_name: "Duda" }),
    ]);
    expect(items[0].kind).toBe("maybe");
    expect(items[0].people).toBeNull();
  });
});

describe("el empujón (next action)", () => {
  it("con un solo pendiente nombra la acción en singular", () => {
    const f = funnelFromGuests([
      guest({ status: "confirmed", confirmed_count: 1 }),
      guest({ status: "pending" }),
    ]);
    expect(nextAction(f)?.label).toBe("Recuérdale al invitado que falta");
  });

  it("con varios pendientes dice cuántos son", () => {
    const f = funnelFromGuests([
      guest({ status: "pending" }),
      guest({ status: "pending" }),
      guest({ status: "pending" }),
    ]);
    expect(nextAction(f)?.label).toBe("Recuérdales a los 3 que faltan");
  });

  it("sin pendientes celebra en vez de empujar", () => {
    const f = funnelFromGuests([guest({ status: "confirmed", confirmed_count: 2 })]);
    expect(nextAction(f)).toEqual({
      label: "Ya respondieron todos tus invitados",
      tone: "ok",
    });
  });

  it("lista vacía pide agregar invitados", () => {
    expect(nextAction(funnelFromGuests([]))?.label).toBe(
      "Agrega a tus invitados para empezar",
    );
  });

  it("modo abierto sin respuestas invita a compartir; con respuestas no empuja", () => {
    expect(nextAction(funnelFromResponses([]))?.tone).toBe("wait");
    expect(nextAction(funnelFromResponses([response()]))).toBeNull();
  });
});
