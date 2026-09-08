import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { INTENSITY_SCALE } from "./tokens";
import { ANIMATION_INTENSITIES } from "./types";

/**
 * El dev reportó que Sutil, Moderada y Llamativa se veían IGUAL.
 *
 * Medido frame a frame en el editor real, la intensidad sí funcionaba — el
 * recorrido era 8 / 30 / 72 px, 9× entre los extremos. Lo que no se podía era
 * VERLO: la reproducción dura ~300 ms (a los 275 ms la opacidad ya iba en 0.92
 * de 1) y arranca en el mismo instante en que se pulsa un botón que está en el
 * panel OPUESTO al lienzo, así que se acaba antes de mover la vista. Y la
 * curva de opacidad es idéntica en las tres, así que lo único que distingue es
 * el desplazamiento, que es justo lo que uno se pierde.
 *
 * De ahí las dos cosas que estas pruebas fijan: que las magnitudes sigan
 * siendo distinguibles, y que exista el disparador explícito para poder
 * mirarlas.
 */
describe("las tres intensidades tienen que ser distinguibles", () => {
  it("cada escalón es al menos el doble que el anterior", () => {
    // Un escalón pequeño no se ve, y la etiqueta prometería algo que no pasa.
    const dist = ANIMATION_INTENSITIES.map((k) => INTENSITY_SCALE[k].distance);
    for (let i = 1; i < dist.length; i++) {
      expect(
        dist[i],
        `${ANIMATION_INTENSITIES[i]} (${dist[i]}px) debe ser >= 2x ` +
          `${ANIMATION_INTENSITIES[i - 1]} (${dist[i - 1]}px)`,
      ).toBeGreaterThanOrEqual(dist[i - 1] * 2);
    }
  });

  it("van de menos a más en las tres magnitudes", () => {
    // Si una creciera y otra decreciera, "más intenso" dejaría de significar
    // nada: el movimiento sería mayor y el desenfoque menor a la vez.
    for (const campo of ["distance", "scale", "blur"] as const) {
      const v = ANIMATION_INTENSITIES.map((k) => INTENSITY_SCALE[k][campo]);
      for (let i = 1; i < v.length; i++) {
        expect(v[i], `${campo} no crece en ${ANIMATION_INTENSITIES[i]}`).toBeGreaterThan(
          v[i - 1],
        );
      }
    }
  });

  it("la más sutil se mueve algo, pero no tanto que deje de ser sutil", () => {
    const sutil = INTENSITY_SCALE.subtle.distance;
    expect(sutil).toBeGreaterThan(0);
    expect(sutil).toBeLessThan(16);
  });
});

/**
 * El disparador de replay. Sin él, un ajuste solo se puede evaluar por
 * accidente —viendo el destello de 300 ms que se dispara al cambiarlo— y un
 * ajuste que no se puede observar no se puede ajustar.
 */
describe("se puede reproducir la animación a voluntad", () => {
  const preview = readFileSync(
    new URL("../../components/editor/preview-pane.tsx", import.meta.url),
    "utf8",
  );
  const campos = readFileSync(
    new URL("../../components/editor/animation-fields.tsx", import.meta.url),
    "utf8",
  );

  it("el panel pide el replay", () => {
    expect(campos).toMatch(/pedirReplayDeAnimacion/);
  });

  it("el preview REMONTA con la petición, no solo la escucha", () => {
    // Escucharla y no meterla en la clave de remonte dejaría el botón inerte:
    // el elemento ya está revelado, así que sin remonte no hay nada que
    // volver a animar. Se comprueba que la variable entra en `replayKey`.
    const i = preview.indexOf("const replayKey");
    expect(i).toBeGreaterThan(-1);
    const bloque = preview.slice(i, preview.indexOf("].join(", i));
    expect(bloque).toMatch(/replayPedido/);
  });
});
