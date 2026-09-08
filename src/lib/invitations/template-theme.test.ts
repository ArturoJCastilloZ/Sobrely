import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveTemplateTheme } from "@/lib/invitations/template-theme";
import { defaultTheme } from "@/lib/theme/theme";
import { THEME_PACKS } from "@/lib/theme/theme-packs";

describe("resolveTemplateTheme", () => {
  it("expande la clave del pack a su paleta", () => {
    const pack = THEME_PACKS["boda-lujo"];
    const theme = resolveTemplateTheme({ themePack: "boda-lujo" });

    expect(theme.colors).toEqual(pack.theme.colors);
    expect(theme.font).toBe(pack.theme.font);
    expect(theme.spacing).toBe(pack.theme.spacing);
    expect(theme.themePack).toBe("boda-lujo");
  });

  it("el resultado NO es la paleta por defecto (el bug original)", () => {
    // `createFromTemplate` copiaba `theme_config` tal cual, así que una
    // plantilla que solo declara el pack producía esto: los colores base.
    const theme = resolveTemplateTheme({ themePack: "boda-lujo" });
    expect(theme.colors).not.toEqual(defaultTheme().colors);
  });

  it("sin pack, respeta los colores que trae la plantilla", () => {
    const raw = {
      colors: {
        primary: "#111111",
        secondary: "#6b7280",
        background: "#ffffff",
        text: "#111111",
      },
      font: "sans",
      spacing: "relaxed",
    };
    const theme = resolveTemplateTheme(raw);
    expect(theme.colors).toEqual(raw.colors);
    expect(theme.spacing).toBe("relaxed");
    expect(theme.themePack).toBeUndefined();
  });

  it("pack inexistente se degrada a los colores base, no truena", () => {
    // Pasa si se siembra una plantilla antes de desplegar el código del pack.
    const theme = resolveTemplateTheme({ themePack: "pack-que-no-existe" });
    expect(theme.colors).toEqual(defaultTheme().colors);
    expect(theme.themePack).toBe("pack-que-no-existe");
  });

  it("es idempotente: resolver dos veces da lo mismo", () => {
    const once = resolveTemplateTheme({ themePack: "xv-glam" });
    const twice = resolveTemplateTheme(once);
    expect(twice).toEqual(once);
  });

  it("un theme_config vacío o basura produce el theme por defecto", () => {
    expect(resolveTemplateTheme({}).colors).toEqual(defaultTheme().colors);
    expect(resolveTemplateTheme(null).colors).toEqual(defaultTheme().colors);
    expect(resolveTemplateTheme("no soy un objeto").colors).toEqual(
      defaultTheme().colors,
    );
  });
});

describe("cableado: createFromTemplate resuelve el theme", () => {
  // La función pura puede estar impecable y el bug seguir vivo si el call site
  // no la usa — ahí es donde estaba. Esta guarda es estática a propósito:
  // `createFromTemplate` es un server action con Supabase adentro y no se puede
  // ejercitar sin base de datos.
  const src = readFileSync("src/lib/invitations/actions.ts", "utf8");

  const render = readFileSync("src/lib/invitations/template-render.ts", "utf8");

  it("createFromTemplate escribe el theme que produce templateToDocument", () => {
    // La expansion del pack se movio a `templateToDocument` para que las
    // miniaturas de la galeria usen la MISMA logica. La propiedad que importa
    // no cambia: el call site tiene que escribir el theme EXPANDIDO.
    expect(src).toContain("templateToDocument(template)");
    expect(src).toContain("theme_config: doc.theme");
  });

  it("y templateToDocument es quien expande el pack", () => {
    // Sin este eslabon, la cadena de arriba podria escribir un theme sin
    // expandir y las dos aserciones seguirian pasando.
    expect(render).toContain("resolveTemplateTheme(template.theme_config)");
  });

  it("ya NO copia el theme_config de la plantilla en crudo", () => {
    expect(src).not.toContain("theme_config: template.theme_config");
  });

  it("la galeria y la creacion comparten la MISMA normalizacion", () => {
    // Es la invariante que impide que una miniatura muestre algo distinto de
    // lo que el usuario recibe al elegir esa plantilla. Si alguien vuelve a
    // normalizar `modules_config` a mano en `actions.ts`, las dos copias
    // pueden divergir y la galeria empieza a mentir.
    expect(src).not.toContain("template.modules_config");
    expect(render).toContain("modules_config");
  });
});
