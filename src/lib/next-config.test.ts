import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `output: "standalone"` y Vercel.
 *
 * Con Next 16.3.x, `standalone` rompe el build EN VERCEL después de compilar bien
 * (`ENOENT .next/next-server.js.nft.json` en `onBuildComplete`; vercel/next.js
 * #96646). Y el contenedor SÍ lo necesita: la imagen ejecuta
 * `.next/standalone/server.js`. Las dos cosas a la vez dependen de una condición
 * sobre `VERCEL`, y quitarla en cualquier dirección rompe un despliegue:
 *   - siempre `standalone`  → Vercel deja de desplegar (producción no se actualiza);
 *   - nunca `standalone`    → el Dockerfile no encuentra `server.js`.
 * Esta prueba EJECUTA la configuración en ambos entornos.
 */
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function cargar() {
  vi.resetModules();
  return (await import("../../next.config")).default;
}

describe("next.config: output standalone solo fuera de Vercel", () => {
  it("en Vercel (VERCEL=1) NO usa standalone", async () => {
    vi.stubEnv("VERCEL", "1");
    expect((await cargar()).output).toBeUndefined();
  });

  it("fuera de Vercel (el contenedor) SÍ usa standalone", async () => {
    vi.stubEnv("VERCEL", "");
    expect((await cargar()).output).toBe("standalone");
  });

  it("con VERCEL sin definir (docker, CI local) SÍ usa standalone", async () => {
    delete process.env.VERCEL;
    expect((await cargar()).output).toBe("standalone");
  });
});

describe("el resto de la configuración no cambia entre entornos", () => {
  it("las cabeceras de seguridad y la redirección de compatibilidad siguen en los dos", async () => {
    for (const v of ["1", ""]) {
      vi.stubEnv("VERCEL", v);
      const c = await cargar();
      const cabeceras = await c.headers!();
      const claves = cabeceras[0].headers.map((h) => h.key);
      expect(claves).toContain("Strict-Transport-Security");
      expect(claves).toContain("X-Frame-Options");
      const redirecciones = await c.redirects!();
      expect(redirecciones[0].source).toBe("/public/:username/:invitationSlug");
    }
  });
});
