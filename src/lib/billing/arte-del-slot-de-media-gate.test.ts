import { describe, expect, it } from "vitest";
import { canPublishInvitation } from "@/lib/billing/entitlements";

/**
 * El gate de publicacion, ejercitado de VERDAD sobre el slot de media.
 *
 * No es una prueba del extractor —esa es `arte-del-slot-de-media.test.ts`—
 * sino de la funcion que decide si se puede publicar. Es lo mas cerca del
 * efecto observado que se llega sin tocar Supabase, que aqui es SOLO
 * produccion.
 *
 * El cliente falso sigue el mismo patron que `arte-de-plantilla.test.ts`, con
 * una diferencia que es justo la del cambio: los modulos ahora traen `config`.
 */
const cliente = (modulos: { module_type: string; config?: unknown }[]) =>
  ({
    rpc: async () => ({ data: false, error: null }),
    from(tabla: string) {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () =>
          tabla === "invitations"
            ? {
                data: {
                  theme_config: {
                    colors: {
                      primary: "#8a6d3b",
                      secondary: "#b08d57",
                      background: "#ffffff",
                      text: "#1f2937",
                    },
                    font: "serif",
                    spacing: "normal",
                  },
                  rsvp_mode: "open",
                },
              }
            : { data: null }, // sin entitlement => plan Free
        then: (r: (v: unknown) => unknown) =>
          r({
            data: modulos.map((m) => ({
              module_type: m.module_type,
              is_visible: true,
              config: m.config ?? {},
            })),
          }),
      };
      return chain;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

/** Los cuatro que Free cubre, para que el gate de MODULOS no enturbie la medicion. */
const FREE = ["hero", "welcome", "countdown", "rsvp"].map((m) => ({
  module_type: m,
}));

const SUBIDA =
  "https://ncxglanrfeepzenrfvoh.supabase.co/storage/v1/object/public/art/u/x.png";

describe("el slot de media de una seccion cuenta como arte propio", () => {
  it("control: los cuatro modulos Free sin imagen publican gratis", async () => {
    // Sin este control, un `allowed:false` de mas no distingue «lo bloqueo el
    // slot» de «lo bloqueaba ya otra cosa».
    const r = await canPublishInvitation(cliente(FREE), "id");
    expect(r.allowed).toBe(true);
  });

  it("una foto SUBIDA en el slot de `welcome` exige Celebracion", async () => {
    const r = await canPublishInvitation(
      cliente([
        ...FREE.filter((m) => m.module_type !== "welcome"),
        {
          module_type: "welcome",
          config: { media: { url: SUBIDA, position: "left" } },
        },
      ]),
      "id",
    );
    expect(r.allowed).toBe(false);
    expect(r.allowed === false && r.requiredPlanCode).toBe("celebracion");
  });

  it("con el slot APAGADO (`position: none`) NO cobra: no se renderiza", async () => {
    const r = await canPublishInvitation(
      cliente([
        ...FREE.filter((m) => m.module_type !== "welcome"),
        {
          module_type: "welcome",
          config: { media: { url: SUBIDA, position: "none" } },
        },
      ]),
      "id",
    );
    expect(r.allowed).toBe(true);
  });

  it("el arte de la APP en el slot no cobra, igual que en el fondo", async () => {
    const r = await canPublishInvitation(
      cliente([
        ...FREE.filter((m) => m.module_type !== "welcome"),
        {
          module_type: "welcome",
          config: {
            media: { url: "/arte/foto/boda-pastel-rosas.jpg", position: "left" },
          },
        },
      ]),
      "id",
    );
    expect(r.allowed).toBe(true);
  });

  it("un modulo OCULTO con foto propia no cobra: no se publica nada suyo", async () => {
    const r = await canPublishInvitation(
      {
        ...cliente(FREE),
        from(tabla: string) {
          const chain: Record<string, unknown> = {
            select: () => chain,
            eq: () => chain,
            maybeSingle: async () =>
              tabla === "invitations"
                ? {
                    data: {
                      theme_config: {
                        colors: {
                          primary: "#8a6d3b",
                          secondary: "#b08d57",
                          background: "#ffffff",
                          text: "#1f2937",
                        },
                        font: "serif",
                        spacing: "normal",
                      },
                      rsvp_mode: "open",
                    },
                  }
                : { data: null },
            then: (r2: (v: unknown) => unknown) =>
              r2({
                data: [
                  ...FREE.map((m) => ({
                    module_type: m.module_type,
                    is_visible: true,
                    config: {},
                  })),
                  {
                    module_type: "welcome",
                    is_visible: false,
                    config: { media: { url: SUBIDA, position: "left" } },
                  },
                ],
              }),
          };
          return chain;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      "id",
    );
    expect(r.allowed).toBe(true);
  });
});
