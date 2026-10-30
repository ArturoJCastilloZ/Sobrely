import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FilaPlantillaPublica } from "@/lib/templates/galeria-publica";
import { aPlantillaPublica } from "@/lib/templates/galeria-publica";
import {
  altDePlantilla,
  cargarPlantillasDeEvento,
  hrefPlantillasDeEvento,
  MAX_PLANTILLAS_LANDING,
  nombreDeColor,
  seleccionarPlantillasDeEvento,
} from "@/lib/templates/plantillas-de-evento";
import { hrefVistaPlantilla } from "@/lib/templates/marketplace";
import {
  EVENT_LANDING_LIST,
  TIPO_DE_EVENTO_POR_SLUG,
  etiquetaCortaDeLanding,
} from "@/lib/seo/event-landings";

const AHORA = new Date("2026-10-30T12:00:00");
const BODA = { eventType: "Boda", nombreEvento: "boda" };

type Fila = FilaPlantillaPublica & { is_active: boolean };
let n = 0;
const fila = (over: Partial<Fila> = {}): Fila => {
  n += 1;
  return {
    id: `t${n}`,
    slug: `boda-${n}`,
    name: `Boda ${n}`,
    description: null,
    event_type: "Boda",
    preview_image_url: `/previews/plantillas/boda-${n}.jpg`,
    modules_config: [{ module_type: "hero" }, { module_type: "rsvp" }],
    theme_config: { colors: { primary: "#8a6d3b" } },
    is_active: true,
    ...over,
  };
};

describe("seleccionarPlantillasDeEvento", () => {
  it("deja fuera las inactivas", () => {
    const r = seleccionarPlantillasDeEvento(
      [fila({ slug: "activa" }), fila({ slug: "inactiva", is_active: false })],
      BODA,
      12,
      AHORA,
    );
    expect(r.map((p) => p.slug)).toEqual(["activa"]);
  });

  it("solo el tipo exacto de la BD: «XV años» no entra en «Boda» ni al revés", () => {
    const r = seleccionarPlantillasDeEvento(
      [
        fila({ slug: "b" }),
        fila({ slug: "xv", event_type: "XV años" }),
        fila({ slug: "sin-tipo", event_type: null }),
        fila({ slug: "minusculas", event_type: "boda" }),
      ],
      BODA,
      12,
      AHORA,
    );
    expect(r.map((p) => p.slug)).toEqual(["b"]);
  });

  it("sin miniatura no entra: la landing es una vitrina de imágenes", () => {
    const r = seleccionarPlantillasDeEvento(
      [fila({ slug: "con" }), fila({ slug: "sin", preview_image_url: null })],
      BODA,
      12,
      AHORA,
    );
    expect(r.map((p) => p.slug)).toEqual(["con"]);
  });

  it("como mucho N, en el orden recibido", () => {
    const filas = Array.from({ length: 20 }, () => fila());
    const r = seleccionarPlantillasDeEvento(filas, BODA, undefined, AHORA);
    expect(r).toHaveLength(MAX_PLANTILLAS_LANDING);
    expect(r.map((p) => p.id)).toEqual(filas.slice(0, MAX_PLANTILLAS_LANDING).map((f) => f.id));
    expect(seleccionarPlantillasDeEvento(filas, BODA, 3, AHORA)).toHaveLength(3);
  });

  it("el precio es el MISMO que calcula la galería pública", () => {
    const f = fila({
      modules_config: [{ module_type: "hero" }, { module_type: "gallery" }],
    });
    const [p] = seleccionarPlantillasDeEvento([f], BODA, 12, AHORA);
    expect(p.precio).toEqual(aPlantillaPublica(f, AHORA).precio);
    expect(p.precio).not.toBeNull();
  });

  it("no manda la configuración pesada al navegador", () => {
    const [p] = seleccionarPlantillasDeEvento([fila()], BODA, 12, AHORA);
    expect(p).not.toHaveProperty("theme_config");
    expect(p).not.toHaveProperty("modules_config");
  });
});

describe("cargarPlantillasDeEvento", () => {
  it("pide a la BD solo activas, del tipo, con miniatura, por nombre y con límite", async () => {
    const llamadas: unknown[][] = [];
    const filas = [fila(), fila({ is_active: false })];
    const builder: Record<string, unknown> = {};
    for (const m of ["select", "eq", "not", "order"]) {
      builder[m] = (...args: unknown[]) => {
        llamadas.push([m, ...args]);
        return builder;
      };
    }
    builder.limit = (...args: unknown[]) => {
      llamadas.push(["limit", ...args]);
      return Promise.resolve({ data: filas, error: null });
    };
    const supabase = {
      from: (t: string) => {
        llamadas.push(["from", t]);
        return builder;
      },
    } as unknown as SupabaseClient;

    const r = await cargarPlantillasDeEvento(supabase, BODA, 6);

    expect(llamadas).toContainEqual(["from", "templates"]);
    expect(llamadas).toContainEqual(["eq", "is_active", true]);
    expect(llamadas).toContainEqual(["eq", "event_type", "Boda"]);
    expect(llamadas).toContainEqual(["not", "preview_image_url", "is", null]);
    expect(llamadas).toContainEqual(["order", "name", { ascending: true }]);
    expect(llamadas).toContainEqual(["limit", 6]);
    // Y la selección lo vuelve a defender aunque la BD devolviera una inactiva.
    expect(r).toHaveLength(1);
  });
});

describe("altDePlantilla", () => {
  it("dice tipo, estilo y color, y NO el nombre (ya es el título visible)", () => {
    const alt = altDePlantilla(
      { estilo: "elegante" },
      { colors: { primary: "#8a6d3b" } },
      "boda",
    );
    expect(alt).toBe("Invitación digital de boda, estilo elegante, en color dorado");
  });

  it("nombra el fondo oscuro y respeta el nombre del evento («XV años», no «xv años»)", () => {
    const alt = altDePlantilla(
      { estilo: null },
      { colors: { primary: "#0ea5e9" }, mode: "dark" },
      "XV años",
    );
    expect(alt).toBe("Invitación digital de XV años, en color azul sobre fondo oscuro");
  });

  it("con themePack y sin colores propios usa los del pack", () => {
    const alt = altDePlantilla({ estilo: null }, { themePack: "minimalista-moderno" }, "boda");
    expect(alt).toBe("Invitación digital de boda, en color negro");
  });

  it("el alt de la selección no repite el nombre de la plantilla", () => {
    const [p] = seleccionarPlantillasDeEvento([fila({ name: "Jardín Real" })], BODA, 12, AHORA);
    expect(p.alt).not.toContain("Jardín Real");
    expect(p.alt).toContain("boda");
  });
});

describe("nombreDeColor", () => {
  it.each([
    ["#8a6d3b", "dorado"],
    ["#0ea5e9", "azul"],
    ["#a24d66", "rosa"],
    ["#4f6b52", "verde"],
    ["#6d5aa6", "morado"],
    ["#b4553a", "naranja"],
    ["#111111", "negro"],
    ["#ffffff", "blanco"],
    ["#6b7280", "gris"],
    ["#dc2626", "rojo"],
  ])("%s → %s", (hex, nombre) => {
    expect(nombreDeColor(hex)).toBe(nombre);
  });

  it("un hex inválido no inventa color", () => {
    expect(nombreDeColor("rojo")).toBeNull();
    expect(nombreDeColor("#fff")).toBeNull();
  });
});

describe("enlaces de las landings", () => {
  it("cada landing tiene su tipo de evento y su CTA al catálogo filtrado", () => {
    for (const l of EVENT_LANDING_LIST) {
      expect(TIPO_DE_EVENTO_POR_SLUG[l.slug], l.slug).toBeTruthy();
    }
    expect(hrefPlantillasDeEvento("Boda")).toBe("/plantillas?evento=Boda");
    expect(hrefPlantillasDeEvento("XV años")).toBe("/plantillas?evento=XV%20a%C3%B1os");
    // Ida y vuelta: lo que lee `searchParams` es el valor exacto de la BD.
    for (const tipo of Object.values(TIPO_DE_EVENTO_POR_SLUG)) {
      const url = new URL(hrefPlantillasDeEvento(tipo), "https://x.test");
      expect(url.pathname).toBe("/plantillas");
      expect(url.searchParams.get("evento")).toBe(tipo);
    }
  });

  it("cada tarjeta enlaza a la ficha `/plantillas/<slug>`", () => {
    const [p] = seleccionarPlantillasDeEvento([fila({ slug: "boda-jardin" })], BODA, 12, AHORA);
    expect(hrefVistaPlantilla(p.slug)).toBe("/plantillas/boda-jardin");
  });

  it("la etiqueta corta del catálogo quita el prefijo y capitaliza", () => {
    expect(EVENT_LANDING_LIST.map(etiquetaCortaDeLanding)).toEqual([
      "Boda",
      "XV años",
      "Cumpleaños",
      "Baby shower",
      "Eventos corporativos",
    ]);
  });
});
