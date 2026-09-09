import { describe, expect, it } from "vitest";
import {
  FONT_KEYS,
  cuerpoIlegible,
  defaultTheme,
  parcheDeParTipografico,
  parseTheme,
  resolveTypography,
} from "@/lib/theme/theme";

describe("el interruptor del par tipográfico", () => {
  it("hay familias que comprobar", () => {
    expect(FONT_KEYS.length).toBe(4);
  });

  it("al ACTIVARLO siembra el par desde `font`: el render NO se mueve", () => {
    // Lo que defiende: si al encenderlo pusiera un par «bonito», le movería la
    // invitación al usuario sin habérselo pedido.
    for (const f of FONT_KEYS) {
      expect(parcheDeParTipografico(true, f)).toEqual({
        typography: { heading: f, body: f },
      });
    }
  });

  it("al activarlo NO pisa un par que ya existía", () => {
    const previo = { heading: "elegant", body: "sans" } as const;
    expect(parcheDeParTipografico(true, "script", previo)).toEqual({
      typography: previo,
    });
  });

  it("al APAGARLO escribe undefined, y el tema vuelve a caer en `font`", () => {
    const p = parcheDeParTipografico(false, "serif", {
      heading: "elegant",
      body: "sans",
    });
    expect(p).toEqual({ typography: undefined });

    // El efecto de verdad, y partiendo de un tema que SI TIENE par — que es lo
    // que a esta prueba le faltaba. Con la base sin par, un parche vacio (`{}`)
    // pasaba igual: no habia nada que borrar, asi que no se demostraba que
    // borrase. Lo cazo un mutante que cambiaba `{typography: undefined}` por
    // `{}` y SOBREVIVIA. Es la leccion del «200 con 0 filas»: hay que probar
    // que habia fila.
    const conPar = {
      ...defaultTheme(),
      font: "serif",
      typography: { heading: "elegant", body: "script" },
    };
    expect(resolveTypography(parseTheme(conPar))).toEqual({
      heading: "elegant",
      body: "script",
    });

    const tema = parseTheme({ ...conPar, ...p });
    expect(tema.typography).toBeUndefined();
    expect(resolveTypography(tema)).toEqual({ heading: "serif", body: "serif" });
  });

  it("apagarlo sobrevive al viaje por JSON, que es como se guarda", () => {
    // `JSON.stringify` ELIMINA las claves con undefined, asi que la fila no
    // queda con basura y al releerla el par sigue ausente.
    const p = parcheDeParTipografico(false, "sans");
    const ida = JSON.parse(
      JSON.stringify({
        ...defaultTheme(),
        font: "sans",
        typography: { heading: "elegant", body: "serif" },
        ...p,
      }),
    );
    expect("typography" in ida).toBe(false);
    expect(resolveTypography(parseTheme(ida))).toEqual({
      heading: "sans",
      body: "sans",
    });
  });

  it("todo par que produce lo acepta el esquema y llega al render", () => {
    for (const h of FONT_KEYS) {
      for (const b of FONT_KEYS) {
        const tema = parseTheme({
          ...defaultTheme(),
          typography: { heading: h, body: b },
        });
        expect(resolveTypography(tema)).toEqual({ heading: h, body: b });
      }
    }
  });

  it("`cuerpoIlegible` marca sólo la manuscrita", () => {
    expect(cuerpoIlegible("script")).toBe(true);
    for (const f of FONT_KEYS.filter((x) => x !== "script")) {
      expect(cuerpoIlegible(f)).toBe(false);
    }
  });
});
