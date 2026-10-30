import { describe, expect, it, vi } from "vitest";

/**
 * Las 5 landings `/invitaciones-digitales-*` son páginas de SEO: tienen que
 * salir estáticas con ISR (no `ƒ`, no `Cache-Control: private, no-store`).
 *
 * Eso se rompe si la landing lee la base con el cliente de SERVIDOR, que toca
 * `cookies()`. Aquí ese cliente revienta si alguien lo usa, y el cliente
 * público (sin cookies) se sustituye por uno que devuelve una lista vacía.
 */
const usoDeCookies = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    usoDeCookies();
    throw new Error("la landing no debe usar el cliente con cookies");
  },
}));
vi.mock("@supabase/supabase-js", () => {
  const consulta = {
    select: () => consulta,
    eq: () => consulta,
    not: () => consulta,
    order: () => consulta,
    limit: async () => ({ data: [], error: null }),
  };
  return { createClient: () => ({ from: () => consulta }) };
});

const PAGINAS = [
  "invitaciones-digitales-baby-shower",
  "invitaciones-digitales-boda",
  "invitaciones-digitales-corporativas",
  "invitaciones-digitales-cumpleanos",
  "invitaciones-digitales-xv-anos",
] as const;

describe("landings por evento: estáticas con ISR", () => {
  it.each(PAGINAS)("%s declara revalidate = 900 (15 min)", async (p) => {
    const mod = (await import(`@/app/${p}/page.tsx`)) as { revalidate?: unknown };
    expect(mod.revalidate).toBe(900);
  });

  it("la landing lee las plantillas sin tocar cookies", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://supabase.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "clave-publica-de-prueba");
    const { EventLandingPage } = await import("@/components/seo/event-landing");
    const { EVENT_LANDINGS } = await import("@/lib/seo/event-landings");
    await expect(EventLandingPage({ data: EVENT_LANDINGS.boda })).resolves.toBeTruthy();
    expect(usoDeCookies).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});

describe("landings por evento: el precio de oferta sigue al reloj del render", () => {
  /*
    Con ISR la página se regenera como mucho cada `revalidate` (900 s). Que el
    precio se calcule con la hora DEL RENDER (y no con una fecha congelada al
    importar el módulo o en el build) es lo que acota el retraso al TTL: la
    primera regeneración tras el corte ya pinta el precio regular.
  */
  it("antes del corte: precio de lanzamiento con tachado; un segundo después: regular", async () => {
    vi.stubEnv("NEXT_PUBLIC_LAUNCH_CAMPAIGN_END_DATE", "2026-11-30");
    vi.stubEnv("NEXT_PUBLIC_PRICING_LAUNCH_ENABLED", "true");
    vi.resetModules();
    const { cargarPlantillasDeEvento } = await import("@/lib/templates/plantillas-de-evento");
    const fila = {
      id: "t1",
      slug: "boda-clasica",
      name: "Boda clásica",
      description: null,
      event_type: "boda",
      preview_image_url: "https://img.test/boda.webp",
      modules_config: [
        { module_type: "hero", is_visible: true },
        { module_type: "rsvp", is_visible: true },
      ],
      theme_config: {},
      is_active: true,
    };
    const consulta = {
      select: () => consulta,
      eq: () => consulta,
      not: () => consulta,
      order: () => consulta,
      limit: async () => ({ data: [fila], error: null }),
    };
    const supabase = { from: () => consulta } as unknown as Parameters<
      typeof cargarPlantillasDeEvento
    >[0];
    const evento = { eventType: "boda", nombreEvento: "boda" };

    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-11-30T23:59:00"));
      const [antes] = await cargarPlantillasDeEvento(supabase, evento);
      expect(antes.precio).toEqual({ precio: 199, precioRegular: 299 });

      vi.setSystemTime(new Date("2026-12-01T00:00:00"));
      const [despues] = await cargarPlantillasDeEvento(supabase, evento);
      expect(despues.precio).toEqual({ precio: 299, precioRegular: null });
    } finally {
      vi.useRealTimers();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
