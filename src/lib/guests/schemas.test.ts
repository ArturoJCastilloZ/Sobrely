import { describe, it, expect } from "vitest";
import {
  parseBulkGuests,
  extractTokenFromScan,
  MAX_GUEST_ALLOTMENT,
} from "@/lib/guests/schemas";

describe("extractTokenFromScan", () => {
  const tok = "a3f9c1e8b7d24f60a9e5c1e8b7d24f60";

  it("acepta el token crudo", () => {
    expect(extractTokenFromScan(tok)).toBe(tok);
  });

  it("extrae el token de una URL de invitado", () => {
    expect(extractTokenFromScan(`https://sobrely.com/g/${tok}`)).toBe(tok);
    expect(extractTokenFromScan(`https://sobrely.com/g/${tok}?x=1`)).toBe(tok);
  });

  it("normaliza a minúsculas", () => {
    expect(extractTokenFromScan(tok.toUpperCase())).toBe(tok);
  });

  it("rechaza texto que no es un token válido", () => {
    expect(extractTokenFromScan("https://google.com")).toBe("");
    expect(extractTokenFromScan("hola mundo")).toBe("");
    expect(extractTokenFromScan("")).toBe("");
  });
});

describe("parseBulkGuests", () => {
  it("una línea sin cupo → 1 lugar", () => {
    expect(parseBulkGuests("Juan Pérez")).toEqual([
      { name: "Juan Pérez", maxGuests: 1 },
    ]);
  });

  it("línea 'Nombre, cupo' toma el cupo", () => {
    expect(parseBulkGuests("Mara González, 2")).toEqual([
      { name: "Mara González", maxGuests: 2 },
    ]);
  });

  it("ignora líneas vacías y recorta espacios", () => {
    const rows = parseBulkGuests("\n  Ana  , 3 \n\nLuis\n");
    expect(rows).toEqual([
      { name: "Ana", maxGuests: 3 },
      { name: "Luis", maxGuests: 1 },
    ]);
  });

  it("cupo inválido o < 1 cae a 1; se limita al máximo", () => {
    expect(parseBulkGuests("Ana, abc")[0].maxGuests).toBe(1);
    expect(parseBulkGuests("Ana, 0")[0].maxGuests).toBe(1);
    expect(parseBulkGuests(`Ana, ${MAX_GUEST_ALLOTMENT + 50}`)[0].maxGuests).toBe(
      MAX_GUEST_ALLOTMENT,
    );
  });

  it("descarta filas sin nombre", () => {
    expect(parseBulkGuests(", 3")).toEqual([]);
  });
});
