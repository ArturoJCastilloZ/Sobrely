import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MODULE_TYPES,
  moduleConfigSchemas,
  type ModuleType,
} from "@/lib/modules/types";
import { themeSchema } from "@/lib/theme/theme";
import { isThemePackPremium, THEME_PACKS } from "@/lib/theme/theme-packs";
import { minimalPlanForModules } from "@/lib/billing/plans";

/**
 * Valida el catálogo de plantillas SEMBRADO, leyendo las migraciones reales.
 *
 * Por qué esta prueba existe: `parseConfig` y `parseTheme` hacen `safeParse` y
 * **caen al default cuando la entrada es inválida**. Es decir, una plantilla mal
 * escrita en el seed no rompe nada — simplemente se convierte en la genérica, en
 * silencio, y nadie se enteraría hasta que un usuario la elige y no ve lo que la
 * tarjeta prometía. Aquí se valida en modo ESTRICTO.
 *
 * También fija la escalera comercial: el catálogo debe cubrir los cuatro planes
 * en cada tipo de evento, porque es lo que hace que el CTA de upgrade se dispare
 * solo vía `minimalPlanForModules`.
 */

const MIGRATIONS = [
  "supabase/migrations/0003_seed_templates.sql",
  "supabase/migrations/0015_seed_templates_catalogo.sql",
];

interface SeededTemplate {
  name: string;
  slug: string;
  description: string;
  eventType: string;
  theme: unknown;
  modules: {
    module_type: string;
    sort_order: number;
    is_visible: boolean;
    config: unknown;
  }[];
  source: string;
}

/**
 * Extrae los literales de texto de un `insert` de SQL, respetando el escape de
 * comilla simple de SQL (`''`). Un split por comas se rompería con cualquier
 * texto que traiga coma — y los hay en casi todas las descripciones.
 */
function sqlStringLiterals(sql: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < sql.length) {
    if (sql[i] !== "'") {
      i++;
      continue;
    }
    i++; // abre
    let buf = "";
    while (i < sql.length) {
      if (sql[i] === "'") {
        if (sql[i + 1] === "'") {
          buf += "'";
          i += 2;
          continue;
        }
        i++; // cierra
        break;
      }
      buf += sql[i];
      i++;
    }
    out.push(buf);
  }
  return out;
}

function loadTemplates(): SeededTemplate[] {
  const all: SeededTemplate[] = [];

  for (const file of MIGRATIONS) {
    const sql = readFileSync(file, "utf8");
    // Solo lo que va después de `values`: el encabezado es comentario.
    const body = sql.slice(sql.indexOf("\nvalues"));
    const lits = sqlStringLiterals(body);

    // Cada fila aporta 6 literales, en orden.
    expect(
      lits.length % 6,
      `${file}: los literales no cuadran en grupos de 6 (hay ${lits.length})`,
    ).toBe(0);

    for (let i = 0; i < lits.length; i += 6) {
      const [name, slug, description, eventType, theme, modules] = lits.slice(
        i,
        i + 6,
      );
      all.push({
        name,
        slug,
        description,
        eventType,
        theme: JSON.parse(theme),
        modules: JSON.parse(modules),
        source: file,
      });
    }
  }

  return all;
}

const templates = loadTemplates();

describe("catálogo de plantillas · integridad", () => {
  it("se leyeron las plantillas de las dos migraciones", () => {
    expect(templates.length).toBeGreaterThanOrEqual(50);
    for (const file of MIGRATIONS) {
      expect(templates.some((t) => t.source === file)).toBe(true);
    }
  });

  it("ningún slug repetido (el `on conflict` silenciaría el duplicado)", () => {
    const slugs = templates.map((t) => t.slug);
    const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    expect(dupes).toEqual([]);
  });

  it("nombre, slug y descripción presentes en todas", () => {
    for (const t of templates) {
      expect(t.name.trim(), t.slug).not.toBe("");
      expect(t.slug).toMatch(/^[a-z0-9-]+$/);
      expect(t.description.trim(), t.slug).not.toBe("");
    }
  });
});

describe("catálogo de plantillas · los config validan en estricto", () => {
  it("cada module_type existe en el registro", () => {
    for (const t of templates) {
      for (const m of t.modules) {
        expect(
          MODULE_TYPES as readonly string[],
          `${t.slug}: module_type desconocido "${m.module_type}"`,
        ).toContain(m.module_type);
      }
    }
  });

  it("cada config pasa su schema de Zod SIN caer al default", () => {
    const failures: string[] = [];
    for (const t of templates) {
      for (const m of t.modules) {
        const schema = moduleConfigSchemas[m.module_type as ModuleType];
        if (!schema) continue;
        const res = schema.safeParse(m.config);
        if (!res.success) {
          failures.push(
            `${t.slug} · ${m.module_type}: ${res.error.issues
              .map((i) => `${i.path.join(".")} ${i.message}`)
              .join("; ")}`,
          );
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("cada theme_config pasa themeSchema en estricto", () => {
    const failures: string[] = [];
    for (const t of templates) {
      const res = themeSchema.safeParse(t.theme);
      if (!res.success) {
        failures.push(
          `${t.slug}: ${res.error.issues
            .map((i) => `${i.path.join(".")} ${i.message}`)
            .join("; ")}`,
        );
      }
    }
    expect(failures).toEqual([]);
  });

  it("los sort_order son consecutivos desde 0 y todos visibles", () => {
    for (const t of templates) {
      const orders = t.modules.map((m) => m.sort_order);
      expect(orders, t.slug).toEqual(orders.map((_, i) => i));
      expect(
        t.modules.every((m) => m.is_visible === true),
        `${t.slug}: trae módulos ocultos`,
      ).toBe(true);
    }
  });

  it("toda plantilla trae portada y confirmación de asistencia", () => {
    for (const t of templates) {
      const types = t.modules.map((m) => m.module_type);
      expect(types, `${t.slug} sin hero`).toContain("hero");
      expect(types, `${t.slug} sin rsvp`).toContain("rsvp");
    }
  });

  it("si declara themePack, el pack existe en el catálogo", () => {
    for (const t of templates) {
      const pack = (t.theme as { themePack?: string }).themePack;
      if (!pack) continue;
      expect(
        Object.keys(THEME_PACKS),
        `${t.slug}: themePack inexistente "${pack}"`,
      ).toContain(pack);
    }
  });
});

/** Plan mínimo que la plantilla exige por sus módulos. */
function planOf(t: SeededTemplate) {
  const mods = t.modules.map((m) => m.module_type as ModuleType);
  const plan = minimalPlanForModules(mods);
  expect(plan, `${t.slug}: ningún plan cubre sus módulos`).toBeDefined();
  return plan!;
}

describe("catálogo de plantillas · la escalera comercial", () => {
  const EVENT_TYPES = ["Boda", "XV años", "Cumpleaños", "Baby shower", "Corporativo"];

  it("hay al menos 10 plantillas por tipo de evento", () => {
    for (const type of EVENT_TYPES) {
      const count = templates.filter((t) => t.eventType === type).length;
      expect(count, `${type} solo tiene ${count}`).toBeGreaterThanOrEqual(10);
    }
  });

  it("cada tipo de evento cubre los cuatro planes", () => {
    for (const type of EVENT_TYPES) {
      const codes = new Set(
        templates.filter((t) => t.eventType === type).map((t) => planOf(t).code),
      );
      for (const expected of ["free", "esencial", "celebracion", "premium"]) {
        expect(
          [...codes],
          `${type} no tiene ninguna plantilla de plan ${expected}`,
        ).toContain(expected);
      }
    }
  });

  it("existen plantillas que muestran los módulos de Celebración y de Premium", () => {
    // El bug de 0003: las 5 plantillas cabían en Esencial, así que el gate de
    // upgrade nunca se disparaba y nadie veía por qué pagar el plan de arriba.
    const celebracionModules = ["gallery", "itinerary", "dresscode", "music"];
    for (const mod of celebracionModules) {
      expect(
        templates.some((t) => t.modules.some((m) => m.module_type === mod)),
        `ninguna plantilla usa ${mod}`,
      ).toBe(true);
    }
    expect(
      templates.filter((t) => t.modules.some((m) => m.module_type === "video"))
        .length,
      "ninguna plantilla usa video (el módulo exclusivo de Premium)",
    ).toBeGreaterThanOrEqual(5);
  });

  it("una plantilla de Free o Esencial NUNCA trae un theme pack premium", () => {
    // Si lo trajera, quien la elige no podría publicar: el pack premium exige
    // `advanced_personalization` (Celebración+). Sería un callejón sin salida
    // creado por el propio catálogo.
    const offenders: string[] = [];
    for (const t of templates) {
      const pack = (t.theme as { themePack?: string }).themePack;
      if (!pack || !isThemePackPremium(pack)) continue;
      const code = planOf(t).code;
      if (code === "free" || code === "esencial") {
        offenders.push(`${t.slug} (${code}) usa el pack premium "${pack}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("las plantillas gratis se pueden publicar sin comprar nada", () => {
    const free = templates.filter((t) => planOf(t).code === "free");
    expect(free.length).toBeGreaterThanOrEqual(10);
    for (const t of free) {
      const pack = (t.theme as { themePack?: string }).themePack;
      expect(
        isThemePackPremium(pack),
        `${t.slug} es de plan free pero su pack gatea`,
      ).toBe(false);
    }
  });
});

describe("catálogo de plantillas · contenido real, no cascarones", () => {
  it("los itinerarios traen horas y etiquetas de verdad", () => {
    const withItinerary = templates.filter((t) =>
      t.modules.some((m) => m.module_type === "itinerary"),
    );
    expect(withItinerary.length).toBeGreaterThan(0);
    for (const t of withItinerary) {
      const cfg = t.modules.find((m) => m.module_type === "itinerary")!
        .config as { items: { time: string; label: string }[] };
      expect(cfg.items.length, `${t.slug}: itinerario vacío`).toBeGreaterThanOrEqual(4);
      for (const item of cfg.items) {
        expect(item.time.trim(), t.slug).not.toBe("");
        expect(item.label.trim(), t.slug).not.toBe("");
      }
    }
  });

  it("el mensaje de bienvenida no queda en blanco", () => {
    for (const t of templates) {
      const w = t.modules.find((m) => m.module_type === "welcome");
      if (!w) continue;
      const cfg = w.config as { message: string };
      expect(cfg.message.trim(), `${t.slug}: bienvenida sin texto`).not.toBe("");
    }
  });

  it("la portada siempre trae título", () => {
    for (const t of templates) {
      const hero = t.modules.find((m) => m.module_type === "hero")!;
      const cfg = hero.config as { title: string };
      expect(cfg.title.trim(), `${t.slug}: portada sin título`).not.toBe("");
    }
  });

  it("las galerías arrancan vacías: las imágenes las sube el usuario", () => {
    for (const t of templates) {
      const g = t.modules.find((m) => m.module_type === "gallery");
      if (!g) continue;
      expect((g.config as { images: string[] }).images, t.slug).toEqual([]);
    }
  });
});
