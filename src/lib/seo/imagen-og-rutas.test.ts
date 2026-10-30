import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  GuestInvitationBundle,
  PublicInvitation,
} from "@/lib/invitations/public-types";
import type { DatosParaCompartir } from "./compartir-invitacion";

/**
 * Las rutas `opengraph-image.tsx` de `/g/[token]` y `/<usuario>/<slug>`.
 *
 * Se sustituyen el cliente de Supabase (los cargadores corren de verdad) y el
 * pintor `imagenDeInvitacion`: lo que se prueba es QUÉ datos le pasa cada ruta,
 * no el PNG.
 */
const db = vi.hoisted(() => ({
  publica: vi.fn<() => Promise<PublicInvitation | null>>(),
  invitado: vi.fn<() => Promise<GuestInvitationBundle | null>>(),
  estado: vi.fn<() => Promise<string>>(),
}));
const pintar = vi.hoisted(() => vi.fn((d: DatosParaCompartir | null) => ({ pintado: d })));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async (fn: string) => {
      if (fn === "get_public_invitation") return { data: await db.publica(), error: null };
      if (fn === "get_guest_invitation") return { data: await db.invitado(), error: null };
      if (fn === "estado_publico_de_invitacion") {
        return { data: await db.estado(), error: null };
      }
      return { data: null, error: { message: `rpc inesperada ${fn}` } };
    },
  }),
}));
vi.mock("@/lib/seo/imagen-invitacion", () => ({
  imagenDeInvitacion: pintar,
  TAMANO_OG: { width: 1200, height: 630 },
}));

const { default: imagenDeInvitado } = await import("@/app/g/[token]/opengraph-image");
const { default: imagenPublica } = await import(
  "@/app/[username]/[invitationSlug]/opengraph-image"
);
const { datosParaCompartir } = await import("./compartir-invitacion");

function invitacion(): PublicInvitation {
  return {
    id: "inv1",
    title: "Boda de Ana y Luis",
    slug: "boda-ana-luis",
    event_type: "Boda",
    event_date: "2027-03-20T18:00:00+00:00",
    theme_config: { colors: { primary: "#aa3355", background: "#fffaf0", text: "#222222" } },
    owner_name: "Anfitriona Secreta",
    owner_username: "ana",
    plan_code: "esencial",
    modules: [],
  };
}

const INVITADO = {
  id: "g1",
  name: "Josefina Invitada",
  max_guests: 2,
  status: "pending" as const,
  confirmed_count: null,
  message: null,
  checked_in: false,
};

const token = (t: string) => ({ params: Promise.resolve({ token: t }) });
/** Mismo formato que `access_token`: `encode(gen_random_bytes(24), 'hex')`. */
const T1 = "a1".repeat(24);
const NADIE = "0f".repeat(24);

beforeEach(() => {
  db.publica.mockReset();
  db.invitado.mockReset();
  db.estado.mockReset();
  pintar.mockClear();
});

describe("/g/[token]/opengraph-image", () => {
  it("vigente → pinta SOLO datosParaCompartir(bundle.invitation)", async () => {
    const bundle = { invitation: invitacion(), guest: INVITADO };
    db.invitado.mockResolvedValue(bundle);
    db.estado.mockResolvedValue("vigente");
    await imagenDeInvitado(token(T1));
    expect(pintar).toHaveBeenCalledTimes(1);
    const recibido = pintar.mock.calls[0][0];
    expect(recibido).toEqual(datosParaCompartir(bundle.invitation));
    // Nada del invitado llega al pintor.
    expect(JSON.stringify(recibido)).not.toContain("Josefina");
  });

  it("token desconocido (null) → genérica", async () => {
    db.invitado.mockResolvedValue(null);
    await imagenDeInvitado(token(NADIE));
    expect(pintar).toHaveBeenCalledWith(null);
    expect(db.estado).not.toHaveBeenCalled();
  });

  it("invitación caducada → genérica", async () => {
    db.invitado.mockResolvedValue({ invitation: invitacion(), guest: INVITADO });
    db.estado.mockResolvedValue("caducada");
    await imagenDeInvitado(token(T1));
    expect(pintar).toHaveBeenCalledWith(null);
  });

  it.each([
    ["corto", "t1"],
    ["47 hex", "a".repeat(47)],
    ["49 hex", "a".repeat(49)],
    ["mayúsculas", "A1".repeat(24)],
    ["no hex", "g".repeat(48)],
    ["inyección", `${"a".repeat(46)}'%`],
  ])("token con formato inválido (%s) → genérica SIN consultar la base", async (_, t) => {
    await imagenDeInvitado(token(t));
    expect(pintar).toHaveBeenCalledWith(null);
    expect(db.invitado).not.toHaveBeenCalled();
    expect(db.estado).not.toHaveBeenCalled();
  });
});

describe("/<usuario>/<slug>/opengraph-image", () => {
  const ruta = { params: Promise.resolve({ username: "ana", invitationSlug: "boda-ana-luis" }) };

  it("publicada → datosParaCompartir de la invitación", async () => {
    db.publica.mockResolvedValue(invitacion());
    await imagenPublica(ruta);
    expect(pintar).toHaveBeenCalledWith(datosParaCompartir(invitacion()));
  });

  it("no servible (null: inexistente o caducada) → genérica", async () => {
    db.publica.mockResolvedValue(null);
    await imagenPublica(ruta);
    expect(pintar).toHaveBeenCalledWith(null);
  });

  it.each([
    ["usuario con barra", "ana/x", "boda"],
    ["usuario con espacio", "ana luis", "boda"],
    ["usuario de 101", "a".repeat(101), "boda"],
    ["usuario vacío", "", "boda"],
    ["slug con mayúsculas", "ana", "Boda"],
    ["slug con punto", "ana", "boda.png"],
    ["slug de 61", "ana", "b".repeat(61)],
    ["slug vacío", "ana", ""],
  ])("formato inválido (%s) → genérica SIN consultar la base", async (_, u, s) => {
    await imagenPublica({ params: Promise.resolve({ username: u, invitationSlug: s }) });
    expect(pintar).toHaveBeenCalledWith(null);
    expect(db.publica).not.toHaveBeenCalled();
  });

  it("formatos que genera la app (usuario del trigger, slug `invitacion-xxxxxx`) sí consultan", async () => {
    db.publica.mockResolvedValue(invitacion());
    await imagenPublica({
      params: Promise.resolve({ username: "Ana_Luis-3f9a0c", invitationSlug: "invitacion-k2j9x0" }),
    });
    expect(db.publica).toHaveBeenCalledTimes(1);
  });
});
