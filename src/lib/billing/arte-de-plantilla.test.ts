import { describe, expect, it } from "vitest";
import { canPublishInvitation } from "@/lib/billing/entitlements";
import { esArteDeLaApp } from "@/lib/theme/arte";

/**
 * El arte que trae una PLANTILLA no es «arte propio» y no se cobra.
 *
 * `custom_art` se llama, literalmente, «Arte propio (fondo e imágenes)»: cobra
 * por subir arte TUYO. La `0030` puso `backgroundImage` en las 50 plantillas y
 * el gate no distinguía el origen, así que el catálogo entero se fue detrás de
 * Celebración.
 *
 * Medido con la función real sobre las 50 plantillas de producción, con plan
 * Free y comparando cada plantilla consigo misma:
 *
 *   antes  ->  celebracion 40 · premium 10 · FREE 0
 *   ahora  ->  free 10 · esencial 10 · celebracion 20 · premium 10
 *
 * O sea: 20 de 50 subían de plan por el arte, y 10 pasaban de publicables
 * gratis a exigir Celebración. Y el gate SIGUE cobrando el arte que el usuario
 * sube al Storage — que es lo que de verdad vende `custom_art`.
 */

const cliente = (theme: unknown, modulos: string[]) =>
  ({
    rpc: async () => ({ data: false, error: null }),
    from(tabla: string) {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () =>
          tabla === "invitations"
            ? { data: { theme_config: theme, rsvp_mode: "open" } }
            : { data: null }, // sin entitlement => plan Free
        then: (r: (v: unknown) => unknown) =>
          r({ data: modulos.map((m) => ({ module_type: m, is_visible: true })) }),
      };
      return chain;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

/** Módulos que Free ya cubre, para que el gate de MÓDULOS no confunda la medición. */
const MODULOS_FREE = ["hero", "welcome", "countdown", "rsvp"];

const temaCon = (url: string) => ({
  colors: { primary: "#8a6d3b", secondary: "#b08d57", background: "#ffffff", text: "#1f2937" },
  font: "serif",
  spacing: "normal",
  backgroundImage: { url, overlay: 0.05 },
});

describe("esArteDeLaApp", () => {
  it.each([
    ["/arte/xv-noche-oro.svg", true],
    ["/arte/foto/boda-marco-floral.jpg", true],
    ["/previews/plantillas/boda-elegante.jpg", true],
    ["", false],
    [undefined, false],
    ["https://ncxglanrfeepzenrfvoh.supabase.co/storage/v1/object/public/art/u/x.png", false],
    // Relativa al protocolo: empieza por "/" pero es un ORIGEN EXTERNO. Si
    // pasara por «de la app» se colaría gratis y rompería el cero phone-home.
    ["//cdn.ajeno.com/x.png", false],
  ])("%s -> %s", (url, esperado) => {
    expect(esArteDeLaApp(url as string | undefined)).toBe(esperado);
  });
});

describe("el gate de publicación distingue el origen del arte", () => {
  it("el arte de una plantilla NO exige plan", async () => {
    const r = await canPublishInvitation(
      cliente(temaCon("/arte/xv-noche-oro.svg"), MODULOS_FREE),
      "id",
    );
    expect(r.allowed).toBe(true);
  });

  it("control: sin arte tampoco exige plan (la sonda no aprueba por otra razón)", async () => {
    const r = await canPublishInvitation(cliente(temaCon(""), MODULOS_FREE), "id");
    expect(r.allowed).toBe(true);
  });

  it("el arte que SUBE el usuario sigue exigiendo Celebración", async () => {
    const r = await canPublishInvitation(
      cliente(
        temaCon("https://ncxglanrfeepzenrfvoh.supabase.co/storage/v1/object/public/art/u/x.png"),
        MODULOS_FREE,
      ),
      "id",
    );
    expect(r.allowed).toBe(false);
    expect(r.allowed === false && r.requiredPlanCode).toBe("celebracion");
  });

  it("una URL relativa al protocolo no se cuela como arte de la app", async () => {
    const r = await canPublishInvitation(
      cliente(temaCon("//cdn.ajeno.com/x.png"), MODULOS_FREE),
      "id",
    );
    expect(r.allowed).toBe(false);
    expect(r.allowed === false && r.requiredPlanCode).toBe("celebracion");
  });
});
