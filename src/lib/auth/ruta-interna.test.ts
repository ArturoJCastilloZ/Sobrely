import { describe, expect, it } from "vitest";
import {
  DESTINO_POR_DEFECTO,
  enlaceConDestino,
  rutaInternaSegura,
} from "@/lib/auth/ruta-interna";

const SITIO = "https://sobrely.test";

/** El chequeo que había copiado en cinco sitios. Se conserva SOLO para probar el defecto. */
const chequeoAntiguo = (v: string) => (v.startsWith("/") ? v : DESTINO_POR_DEFECTO);

/** Intentos de salir del sitio. Cada uno ha funcionado contra algún `startsWith("/")`. */
const ATAQUES = [
  "//evil.com",
  "//evil.com/dashboard",
  "///evil.com",
  "/\\evil.com",
  "/\\/evil.com",
  "\\\\evil.com",
  "/\t/evil.com",
  "/\n/evil.com",
  "/\r/evil.com",
  "/ /evil.com",
  "/\u0000/evil.com",
  "https://evil.com",
  "http://evil.com",
  "javascript:alert(1)",
  "data:text/html,x",
  "evil.com",
  "",
  " /dashboard",
];

describe("rutaInternaSegura", () => {
  it("DEMUESTRA el defecto: el chequeo antiguo deja pasar `//evil.com`", () => {
    // Si esta aserción dejara de cumplirse, el resto de la suite perdería su
    // razón de ser: significaría que ya no hay nada que arreglar.
    expect(chequeoAntiguo("//evil.com")).toBe("//evil.com");
    expect(new URL(chequeoAntiguo("//evil.com"), SITIO).origin).not.toBe(SITIO);
  });

  it("acepta rutas internas normales, con query y hash", () => {
    for (const ok of [
      "/dashboard",
      "/plantillas/boda-elegante?usar=1",
      "/editor/abc-123",
      "/billing/checkout?plan=esencial",
      "/a#ancla",
    ]) {
      expect(rutaInternaSegura(ok)).toBe(ok);
    }
  });

  it("rechaza todos los intentos de salir del sitio y devuelve el destino por defecto", () => {
    for (const ataque of ATAQUES) {
      expect(rutaInternaSegura(ataque), JSON.stringify(ataque)).toBe(DESTINO_POR_DEFECTO);
    }
  });

  it("PROPIEDAD: lo que acepta SIEMPRE resuelve al mismo origen, según el analizador de URL del estándar", () => {
    // Es la prueba que importa: no depende de que mi regex sea buena sino de
    // lo que de verdad hace un analizador WHATWG (el de los navegadores).
    for (const entrada of ATAQUES) {
      const resultado = rutaInternaSegura(entrada);
      expect(
        new URL(resultado, SITIO).origin,
        `${JSON.stringify(entrada)} → ${JSON.stringify(resultado)}`,
      ).toBe(SITIO);
    }
  });

  it("una ruta con %2F o @ NO sale del sitio, así que se acepta (no se rompe lo legítimo)", () => {
    for (const ok of ["/%2F/evil.com", "/@evil.com", "/a/..%2F..%2Fb"]) {
      expect(rutaInternaSegura(ok)).toBe(ok);
      expect(new URL(ok, SITIO).origin).toBe(SITIO);
    }
  });

  it("tipos que no son texto devuelven el destino por defecto", () => {
    for (const raro of [null, undefined, 42, {}, [], true]) {
      expect(rutaInternaSegura(raro)).toBe(DESTINO_POR_DEFECTO);
    }
  });

  it("un destino absurdamente largo se descarta", () => {
    expect(rutaInternaSegura("/" + "a".repeat(5000))).toBe(DESTINO_POR_DEFECTO);
  });

  it("el destino por defecto es configurable", () => {
    expect(rutaInternaSegura("//evil.com", "/login")).toBe("/login");
  });
});

describe("enlaceConDestino", () => {
  it("con el destino por defecto devuelve la ruta limpia, sin parámetro", () => {
    expect(enlaceConDestino("/login", "redirectTo", "/dashboard")).toBe("/login");
    expect(enlaceConDestino("/register", "next", undefined)).toBe("/register");
  });

  it("conserva un destino interno, codificado", () => {
    expect(enlaceConDestino("/register", "next", "/plantillas/x?usar=1")).toBe(
      "/register?next=%2Fplantillas%2Fx%3Fusar%3D1",
    );
    expect(enlaceConDestino("/login", "redirectTo", "/plantillas/x?usar=1")).toBe(
      "/login?redirectTo=%2Fplantillas%2Fx%3Fusar%3D1",
    );
  });

  it("un destino hostil NO se propaga al enlace: se vuelve a validar al pintarlo", () => {
    for (const malo of ["//evil.com", "/\\evil.com", "https://evil.com"]) {
      expect(enlaceConDestino("/login", "redirectTo", malo)).toBe("/login");
    }
  });

  it("lo que produce siempre se puede leer de vuelta y es seguro (ida y vuelta)", () => {
    const href = enlaceConDestino("/register", "next", "/plantillas/x?usar=1&y=2");
    const leido = new URL(href, SITIO).searchParams.get("next");
    expect(leido).toBe("/plantillas/x?usar=1&y=2");
    expect(rutaInternaSegura(leido)).toBe(leido);
  });
});
