import { describe, it, expect } from "vitest";
import { buildIcs, toIcsUtc, escapeIcsText } from "@/lib/calendar/ics";

describe("toIcsUtc", () => {
  it("formatea a YYYYMMDDTHHMMSSZ en UTC", () => {
    expect(toIcsUtc(new Date("2026-08-14T05:27:00Z"))).toBe("20260814T052700Z");
  });
});

describe("escapeIcsText", () => {
  it("escapa coma, punto y coma, barra y saltos de línea", () => {
    expect(escapeIcsText("Salón, A; B\\C\nD")).toBe("Salón\\, A\\; B\\\\C\\nD");
  });
});

describe("buildIcs", () => {
  const ics = buildIcs({
    uid: "abc123",
    title: "Boda de Ana y Carlos",
    location: "Hilton, Monterrey",
    description: "¡Te esperamos!",
    start: new Date("2026-11-07T18:00:00Z"),
    end: new Date("2026-11-07T21:00:00Z"),
    stamp: new Date("2026-11-07T18:00:00Z"),
  });

  it("incluye los campos requeridos y usa CRLF", () => {
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:abc123");
    expect(ics).toContain("DTSTART:20261107T180000Z");
    expect(ics).toContain("DTEND:20261107T210000Z");
    expect(ics).toContain("SUMMARY:Boda de Ana y Carlos");
    expect(ics).toContain("LOCATION:Hilton\\, Monterrey");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("\r\n");
  });

  it("omite LOCATION y DESCRIPTION si no se dan", () => {
    const min = buildIcs({
      uid: "x",
      title: "Evento",
      start: new Date("2026-01-01T00:00:00Z"),
      end: new Date("2026-01-01T03:00:00Z"),
    });
    expect(min).not.toContain("LOCATION:");
    expect(min).not.toContain("DESCRIPTION:");
  });
});
