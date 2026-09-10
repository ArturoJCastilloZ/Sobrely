import { describe, expect, it } from "vitest";
import {
  contrastRatio, deriveCta, deriveStatus, deriveAccentText, cardSurface,
  hexToRgb, mix, rgbToHex,
  AA_NORMAL, MAX_DARKEN, WHITE,
  STATUS_SUCCESS_BASE, STATUS_DANGER_BASE,
} from "./contrast";
import { THEME_PACKS } from "./theme-packs";

describe("contrastRatio", () => {
  it("da los extremos conocidos de la norma", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("es simétrico: el orden de los colores no cambia la razón", () => {
    expect(contrastRatio("#b08d57", WHITE)).toBeCloseTo(contrastRatio(WHITE, "#b08d57"), 10);
  });

  it("reproduce los valores medidos de los packs que fallaban", () => {
    // Estos números son los que se midieron en la auditoría; si cambian,
    // cambió la fórmula y hay que saberlo.
    expect(contrastRatio("#b08d57", WHITE)).toBeCloseTo(3.09, 2); // boda-lujo
    expect(contrastRatio("#f7a8c4", WHITE)).toBeCloseTo(1.85, 2); // kawaii
    expect(contrastRatio("#d4af37", WHITE)).toBeCloseTo(2.10, 2); // noche-estelar
  });

  it("acepta hex de 3 dígitos", () => {
    expect(contrastRatio("#fff", "#000")).toBeCloseTo(21, 5);
  });
});

describe("hexToRgb / rgbToHex", () => {
  it("va y vuelve sin perder el valor", () => {
    for (const hex of ["#b08d57", "#f7a8c4", "#000000", "#ffffff"]) {
      expect(rgbToHex(hexToRgb(hex))).toBe(hex);
    }
  });
  it("satura en vez de desbordar", () => {
    expect(rgbToHex({ r: 300, g: -20, b: 128 })).toBe("#ff0080");
  });
});

describe("mix", () => {
  it("t=0 y t=1 son los extremos", () => {
    expect(mix("#b08d57", "#000000", 0)).toBe("#b08d57");
    expect(mix("#b08d57", "#000000", 1)).toBe("#000000");
  });
  it("oscurecer siempre baja el contraste contra blanco", () => {
    const base = contrastRatio("#7c9070", WHITE);
    expect(contrastRatio(mix("#7c9070", "#000000", 0.2), WHITE)).toBeGreaterThan(base);
  });
});

describe("deriveCta", () => {
  it("no toca un primario que ya cumple", () => {
    const cta = deriveCta("#1e3a5f", "#1f2937", "#ffffff"); // corporativo-limpio
    expect(cta.kind).toBe("solid");
    expect(cta.bg).toBe("#1e3a5f");
    expect(cta.fg).toBe(WHITE);
  });

  it("oscurece lo MÍNIMO necesario cuando alcanza", () => {
    const cta = deriveCta("#b08d57", "#2a2724", "#fffdf8"); // boda-lujo
    expect(cta.kind).toBe("solid");
    expect(cta.ratio).toBeGreaterThanOrEqual(AA_NORMAL);
    // Mínimo: un paso menos de oscurecimiento ya no cumpliría.
    expect(cta.ratio).toBeLessThan(AA_NORMAL + 0.5);
  });

  it("cambia a contorno cuando oscurecer destruiría el pastel", () => {
    const cta = deriveCta("#f7a8c4", "#4a3b41", "#fffafc"); // kawaii
    expect(cta.kind).toBe("outline");
    // El fondo del botón sigue siendo rosa claro, no malva oscuro.
    expect(contrastRatio(cta.bg, WHITE)).toBeLessThan(1.5);
  });

  it("el contorno se mezcla hacia el FONDO, no hacia blanco", () => {
    // Un pack oscuro no debe recibir un botón casi blanco pegado encima.
    const claro = deriveCta("#d4af37", "#f4efe6", "#161310");
    expect(claro.kind).toBe("outline");
    expect(contrastRatio(claro.bg, "#161310")).toBeLessThan(3);
  });

  it("NUNCA devuelve algo por debajo de AA, para ningún pack real", () => {
    for (const pack of Object.values(THEME_PACKS)) {
      const { primary, text, background } = pack.theme.colors;
      const cta = deriveCta(primary, text, background);
      expect(
        cta.ratio,
        `${pack.key}: ${cta.kind} ${cta.bg}/${cta.fg} = ${cta.ratio.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });

  it("los 11 packs que fallaban ahora pasan, y los 9 que pasaban no se tocan", () => {
    let corregidos = 0;
    let intactos = 0;
    for (const pack of Object.values(THEME_PACKS)) {
      const { primary, text, background } = pack.theme.colors;
      const antes = contrastRatio(primary, WHITE);
      const cta = deriveCta(primary, text, background);
      if (antes < AA_NORMAL) {
        corregidos++;
      } else {
        intactos++;
        expect(cta.bg, `${pack.key} no debía cambiar`).toBe(primary);
      }
    }
    expect(corregidos).toBe(11);
    expect(intactos).toBe(9);
  });

  it("el umbral cae dentro de la banda estable medida (0.20–0.30)", () => {
    // Fuera de esa banda el grupo de packs con contorno cambia; ver el
    // comentario de MAX_DARKEN.
    expect(MAX_DARKEN).toBeGreaterThanOrEqual(0.2);
    expect(MAX_DARKEN).toBeLessThanOrEqual(0.3);
  });
});

describe("deriveStatus", () => {
  it("no toca un color que ya es legible sobre el fondo", () => {
    // Ojo con el color de ejemplo: emerald-600 (#059669) sobre blanco da 3.77 y
    // NO pasa AA, asi que `deriveStatus` si lo ajusta. Esta prueba fallo la
    // primera vez por asumir lo contrario. Se usa un verde que si cumple.
    const yaLegible = "#0f6b46";
    expect(contrastRatio(yaLegible, "#ffffff")).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(deriveStatus(yaLegible, "#1f2937", "#ffffff")).toBe(yaLegible);
  });

  it("el verde base NO pasa AA sobre blanco, y por eso se ajusta", () => {
    // Deja constancia del numero: es la razon de que este modulo exista.
    expect(contrastRatio(STATUS_SUCCESS_BASE, "#ffffff")).toBeLessThan(AA_NORMAL);
    const ajustado = deriveStatus(STATUS_SUCCESS_BASE, "#1f2937", "#ffffff");
    expect(ajustado).not.toBe(STATUS_SUCCESS_BASE);
    expect(contrastRatio(ajustado, "#ffffff")).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it("arregla los DOS cruces que estaban rotos, medidos", () => {
    // El bug: la variante `dark:` responde al tema de la APP, no al de la
    // invitación, así que las dos combinaciones cruzadas fallaban.
    const oscura = { ink: "#f4efe6", bg: "#161310" };
    const clara = { ink: "#2a2724", bg: "#fffdf8" };

    // emerald-700 sobre invitación oscura daba 3.37; red-600 daba 3.83.
    for (const base of [STATUS_SUCCESS_BASE, STATUS_DANGER_BASE]) {
      const s = deriveStatus(base, oscura.ink, oscura.bg);
      expect(contrastRatio(s, oscura.bg), `oscura ${base} -> ${s}`).toBeGreaterThanOrEqual(AA_NORMAL);
      const c = deriveStatus(base, clara.ink, clara.bg);
      expect(contrastRatio(c, clara.bg), `clara ${base} -> ${c}`).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });

  it("cumple AA en los 20 packs reales, para éxito y error", () => {
    for (const pack of Object.values(THEME_PACKS)) {
      const { text, background } = pack.theme.colors;
      for (const base of [STATUS_SUCCESS_BASE, STATUS_DANGER_BASE]) {
        const c = deriveStatus(base, text, background);
        expect(
          contrastRatio(c, background),
          `${pack.key} ${base} -> ${c} = ${contrastRatio(c, background).toFixed(2)}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    }
  });

  it("cumple AA tambien SOBRE SU PROPIO TINTE, que es donde se pinta", () => {
    // El fallo que encontro la revision: el token se derivaba contra el fondo
    // desnudo, pero el aviso se pinta sobre `color-mix(... 10%)` del mismo
    // color. En zz-demo eso bajaba de 4.57 a 4.01.
    for (const pack of Object.values(THEME_PACKS)) {
      const { text, background } = pack.theme.colors;
      for (const base of [STATUS_SUCCESS_BASE, STATUS_DANGER_BASE]) {
        const c = deriveStatus(base, text, background);
        const superficie = mix(background, c, 0.1);
        expect(
          contrastRatio(c, superficie),
          `${pack.key} ${base} -> ${c} sobre tinte = ${contrastRatio(c, superficie).toFixed(2)}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    }
  });

  it("conserva el matiz cuando puede: no devuelve la tinta a la primera", () => {
    // En un pack oscuro el verde sigue siendo verde, no gris del texto.
    const s = deriveStatus(STATUS_SUCCESS_BASE, "#f4efe6", "#161310");
    expect(s).not.toBe("#f4efe6");
  });
});

describe("deriveAccentText", () => {
  it("no toca un acento que YA se lee sobre su superficie", () => {
    // La mayoria del catalogo no debe cambiar de aspecto: solo se mueven las
    // que no se leian. Si esto se rompe, el arreglo repinta 65 plantillas.
    //
    // OJO con el acento y la tinta: la primera version de esta prueba los puso
    // IGUALES (`#111111` y `#111111`), y entonces mezclar hacia la tinta no
    // cambia nada — la prueba pasaba aunque se quitara el atajo. Sobrevivio al
    // mutante. Tienen que ser DISTINTOS para que el atajo sea observable.
    const azul = "#1d4ed8";
    const tinta = "#0f172a";
    expect(azul).not.toBe(tinta);
    expect(contrastRatio(azul, WHITE)).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(deriveAccentText(azul, WHITE, tinta)).toBe(azul);
  });

  it("levanta el peor caso PUBLICADO hasta AA", () => {
    // `invitacion-i7t0nb`, medida el 2026-09-09: azul palido sobre azul
    // palido, 1.24 sobre un piso de 4.5.
    const fondo = "#dde3ff";
    expect(contrastRatio("#b3cfff", fondo)).toBeLessThan(2);
    const out = deriveAccentText("#b3cfff", fondo, "#1f2937");
    expect(contrastRatio(out, fondo)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it("cambia lo MINIMO: un paso menos ya no cumpliria", () => {
    const fondo = "#fffafc";
    const tinta = "#4a3b41";
    const out = deriveAccentText("#f7a8c4", fondo, tinta); // kawaii
    expect(contrastRatio(out, fondo)).toBeGreaterThanOrEqual(AA_NORMAL);
    // Con un 1 % menos de mezcla hacia la tinta, NO llega. Es lo que
    // demuestra que busca el minimo y no se pasa de largo.
    for (let t = 0.01; t <= 1; t += 0.01) {
      if (mix("#f7a8c4", tinta, t) === out) {
        const menos = mix("#f7a8c4", tinta, Math.max(0, t - 0.01));
        expect(contrastRatio(menos, fondo)).toBeLessThan(AA_NORMAL);
        return;
      }
    }
    throw new Error("el resultado no esta en la rampa hacia la tinta");
  });

  it("mezcla hacia la TINTA, no hacia negro: el resultado no es gris", () => {
    // Mezclar a negro apagaria el color y sacaria a la pieza de su paleta.
    const out = deriveAccentText("#f7a8c4", "#fffafc", "#4a3b41");
    const { r, g, b } = hexToRgb(out);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeGreaterThan(20);
  });

  it("devuelve la TINTA cuando ni ella alcanza el objetivo", () => {
    // Caso degenerado: la superficie no admite texto legible de ningun color
    // del tema. Ahi el acento no es el problema, y devolver la tinta es
    // preferible a devolver un acento ilegible.
    const tinta = "#808080";
    expect(deriveAccentText("#7f7f7f", "#808080", tinta, 4.5)).toBe(tinta);
  });

  it("respeta un objetivo distinto de AA (texto grande pide 3.0)", () => {
    const fondo = "#f0f9ff";
    const flojo = deriveAccentText("#0ea5e9", fondo, "#1f2937", 3);
    const duro = deriveAccentText("#0ea5e9", fondo, "#1f2937", 4.5);
    expect(contrastRatio(flojo, fondo)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(duro, fondo)).toBeGreaterThanOrEqual(4.5);
    // El objetivo mas duro obliga a mezclar mas, asi que NO pueden coincidir.
    expect(flojo).not.toBe(duro);
  });
});

describe("cardSurface", () => {
  it("compone la tarjeta translucida sobre el fondo, en los dos modos", () => {
    // `--inv-card` es `rgba(255,255,255,0.7)` en claro y `rgba(0,0,0,0.22)` en
    // oscuro. Medir contra la CADENA en vez de contra el color compuesto seria
    // medir contra algo que no se pinta en ninguna parte.
    expect(cardSurface("#000000", "light")).toBe(mix("#000000", WHITE, 0.7));
    expect(cardSurface("#ffffff", "dark")).toBe(mix("#ffffff", "#000000", 0.22));
    // Una tarjeta clara sobre fondo oscuro es MAS clara que el fondo.
    const claro = cardSurface("#101010", "light");
    expect(contrastRatio(claro, WHITE)).toBeLessThan(contrastRatio("#101010", WHITE));
  });
});
