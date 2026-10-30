import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  GuestInvitationBundle,
  PublicInvitation,
} from "@/lib/invitations/public-types";

/**
 * La tarjeta al compartir una invitación (WhatsApp/Facebook) sale de
 * `generateMetadata` de `/g/[token]` y `/<usuario>/<slug>`. Se prueban las
 * PÁGINAS, no solo el helper: lo que importa es lo que la ruta emite.
 *
 * Las lecturas a la base se sustituyen; la vista se sustituye porque solo se
 * prueba la metadata.
 */
const cargar = vi.hoisted(() => ({
  publica: vi.fn<(u: string, s: string) => Promise<PublicInvitation | null>>(),
  invitado: vi.fn<(t: string) => Promise<GuestInvitationBundle | null>>(),
  estado: vi.fn<
    (fn: string, a: Record<string, string>) => Promise<{ data: unknown; error: unknown }>
  >(),
}));

// Se sustituye solo el cliente: los cargadores de `cargar-publica` corren de
// verdad, incluido el filtro de vigencia de `/g` (la RPC del invitado no lo
// aplica, ver 0012).
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async (fn: string, a: Record<string, string>) => {
      if (fn === "get_public_invitation") {
        return { data: await cargar.publica(a.p_username, a.p_slug), error: null };
      }
      if (fn === "get_guest_invitation") {
        return { data: await cargar.invitado(a.p_token), error: null };
      }
      return cargar.estado(fn, a);
    },
  }),
}));
vi.mock("@/components/public/public-invitation", () => ({
  PublicInvitationView: () => null,
}));
vi.mock("@/components/public/invitacion-caducada", () => ({
  InvitacionCaducada: () => null,
}));

const { generateMetadata: metadataDeInvitado } = await import("@/app/g/[token]/page");
const { generateMetadata: metadataPublica } = await import(
  "@/app/[username]/[invitationSlug]/page"
);
const { datosParaCompartir } = await import("./compartir-invitacion");
const { SITE_TITLE, SITE_DESCRIPTION } = await import("./site");

const INVITADO = {
  id: "g1",
  name: "Josefina Invitada Pérez",
  max_guests: 4,
  status: "confirmed" as const,
  confirmed_count: 3,
  message: "Mensaje privado del invitado",
  checked_in: false,
};

function invitacion(extra: Partial<PublicInvitation> = {}): PublicInvitation {
  return {
    id: "inv1",
    title: "Boda de Ana y Luis",
    slug: "boda-ana-luis",
    event_type: "Boda",
    // Mediodía de México central, como se guarda.
    event_date: "2027-03-20T18:00:00+00:00",
    theme_config: { colors: { primary: "#aa3355", background: "#fffaf0", text: "#222222" } },
    owner_name: "Anfitriona Secreta",
    owner_username: "ana",
    plan_code: "esencial",
    modules: [
      {
        id: "m1",
        module_type: "map",
        sort_order: 1,
        is_visible: true,
        config: { venueName: "Salón Privado", address: "Calle Falsa 123, Col. Centro" },
      },
    ],
    ...extra,
  };
}

const TOKEN = "a".repeat(48);
const params = <T,>(p: T) => ({ params: Promise.resolve(p) });

/** Todo lo que el scraper lee de la tarjeta, como texto plano. */
function tarjeta(m: Awaited<ReturnType<typeof metadataDeInvitado>>): string {
  return JSON.stringify({ og: m.openGraph, tw: m.twitter, d: m.description });
}

beforeEach(() => {
  cargar.publica.mockReset();
  cargar.invitado.mockReset();
  cargar.estado.mockReset();
  // Por defecto la invitación está vigente; los casos de caducidad lo cambian.
  cargar.estado.mockResolvedValue({ data: "vigente", error: null });
});

describe("/g/[token]: tarjeta del enlace personal", () => {
  it("es la del EVENTO: título, tipo, fecha y URL propia; imagen del segmento", async () => {
    cargar.invitado.mockResolvedValue({ invitation: invitacion(), guest: INVITADO });
    const m = await metadataDeInvitado(params({ token: TOKEN }));
    expect(m.openGraph).toMatchObject({
      title: "Boda de Ana y Luis",
      url: `/g/${TOKEN}`,
      siteName: "Sobrely",
    });
    expect(m.description).toBe("Boda · sábado, 20 de marzo de 2027 · Te invitamos");
    // Sin `images`: así Next adjunta `g/[token]/opengraph-image.tsx`.
    expect(m.openGraph).not.toHaveProperty("images");
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "Boda de Ana y Luis" });
    expect(m.robots).toEqual({ index: false, follow: false });
  });

  it("no filtra nada del invitado, del lugar ni del anfitrión", async () => {
    cargar.invitado.mockResolvedValue({ invitation: invitacion(), guest: INVITADO });
    const m = await metadataDeInvitado(params({ token: TOKEN }));
    const texto = tarjeta(m);
    for (const secreto of [
      "Josefina",
      "Mensaje privado",
      "confirmed",
      "Salón Privado",
      "Calle Falsa",
      "Anfitriona",
    ]) {
      expect(texto, secreto).not.toContain(secreto);
    }
  });

  it("token inválido → la tarjeta genérica de Sobrely, igual a la del layout", async () => {
    cargar.invitado.mockResolvedValue(null);
    const m = await metadataDeInvitado(params({ token: "no-existe" }));
    expect(m.openGraph).toMatchObject({
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      url: "/",
      images: [expect.objectContaining({ url: "/opengraph-image" })],
    });
    expect(JSON.stringify(m.openGraph)).not.toContain("no-existe");
    expect(m.robots).toEqual({ index: false, follow: false });
  });

  it("invitación CADUCADA → genérica, idéntica a la de un token inválido", async () => {
    // `get_guest_invitation` la devuelve aunque el entitlement venció.
    cargar.invitado.mockResolvedValue({ invitation: invitacion(), guest: INVITADO });
    cargar.estado.mockResolvedValue({ data: "caducada", error: null });
    const caducada = await metadataDeInvitado(params({ token: TOKEN }));
    expect(cargar.estado).toHaveBeenCalledWith("estado_publico_de_invitacion", {
      p_username: "ana",
      p_slug: "boda-ana-luis",
    });

    cargar.invitado.mockResolvedValue(null);
    const invalido = await metadataDeInvitado(params({ token: TOKEN }));
    expect(caducada.openGraph).toEqual(invalido.openGraph);
    expect(caducada.twitter).toEqual(invalido.twitter);
    expect(tarjeta(caducada)).not.toContain("Boda de Ana y Luis");
  });

  it("si el estado no se puede leer (RPC con error) → genérica", async () => {
    cargar.invitado.mockResolvedValue({ invitation: invitacion(), guest: INVITADO });
    cargar.estado.mockResolvedValue({ data: null, error: { message: "no existe" } });
    const m = await metadataDeInvitado(params({ token: TOKEN }));
    expect(m.openGraph).toMatchObject({ title: SITE_TITLE, url: "/" });
  });

  it("plan sin marca: sin og:site_name «Sobrely»", async () => {
    cargar.invitado.mockResolvedValue({
      invitation: invitacion({ plan_code: "premium" }),
      guest: INVITADO,
    });
    const m = await metadataDeInvitado(params({ token: TOKEN }));
    expect(m.openGraph).not.toHaveProperty("siteName");
    expect(tarjeta(m)).not.toContain("Sobrely");
  });
});

describe("/<usuario>/<slug>: tarjeta de la invitación pública", () => {
  it("título y fecha del evento, URL canónica de la invitación", async () => {
    cargar.publica.mockResolvedValue(invitacion());
    const m = await metadataPublica(params({ username: "ANA", invitationSlug: "viejo-slug" }));
    expect(m.openGraph).toMatchObject({
      title: "Boda de Ana y Luis",
      url: "/ana/boda-ana-luis",
      description: "Boda · sábado, 20 de marzo de 2027 · Te invitamos",
    });
    expect(m.openGraph).not.toHaveProperty("images");
    expect(tarjeta(m)).not.toContain("Salón Privado");
  });

  it("no publicada, inexistente o caducada → genérica, sin decir cuál", async () => {
    cargar.publica.mockResolvedValue(null);
    for (const estado of ["caducada", "inexistente"]) {
      cargar.estado.mockResolvedValue({ data: estado, error: null });
      const m = await metadataPublica(params({ username: "ana", invitationSlug: "x" }));
      expect(m.openGraph).toMatchObject({ title: SITE_TITLE, url: "/" });
      expect(m.twitter).toMatchObject({ title: SITE_TITLE });
    }
  });
});

describe("datosParaCompartir: lista blanca", () => {
  it("solo título, tipo, fecha, colores y si hay marca", () => {
    const d = datosParaCompartir(invitacion());
    expect(Object.keys(d).sort()).toEqual(
      ["colores", "conMarca", "fecha", "tipoEvento", "titulo"].sort(),
    );
    expect(d.colores).toEqual({ fondo: "#fffaf0", texto: "#222222", primario: "#aa3355" });
  });

  it("sin fecha ni tipo no inventa nada; título vacío → «Invitación»", () => {
    const d = datosParaCompartir(invitacion({ title: "  ", event_type: null, event_date: null }));
    expect(d).toMatchObject({ titulo: "Invitación", tipoEvento: null, fecha: null });
  });

  it("recorta títulos muy largos", () => {
    const d = datosParaCompartir(invitacion({ title: "x".repeat(200) }));
    expect(d.titulo.length).toBeLessThanOrEqual(90);
    expect(d.titulo.endsWith("…")).toBe(true);
  });

  it("marca según el plan: esencial/sin plan sí, celebración/premium no", () => {
    expect(datosParaCompartir(invitacion({ plan_code: "esencial" })).conMarca).toBe(true);
    expect(datosParaCompartir(invitacion({ plan_code: null })).conMarca).toBe(true);
    expect(datosParaCompartir(invitacion({ plan_code: "celebracion" })).conMarca).toBe(false);
    expect(datosParaCompartir(invitacion({ plan_code: "premium" })).conMarca).toBe(false);
  });
});
