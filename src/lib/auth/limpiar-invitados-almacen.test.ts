import { describe, expect, it } from "vitest";
import { recopilarRutas, type EntradaDeLista } from "./limpiar-invitados-almacen";

/** Almacenamiento falso: ruta de carpeta → entradas. Las carpetas llevan `id: null`, como Supabase. */
const arbol = (mapa: Record<string, EntradaDeLista[]>) => async (p: string) => mapa[p] ?? [];
const carpeta = (name: string): EntradaDeLista => ({ name, id: null });
const archivo = (name: string): EntradaDeLista => ({ name, id: `id-${name}` });

describe("recopilarRutas", () => {
  it("baja a las carpetas de invitación y devuelve la ruta de cada archivo (el defecto original)", async () => {
    const listar = arbol({
      u1: [carpeta("inv-a"), carpeta("inv-b")],
      "u1/inv-a": [archivo("1.jpg"), archivo("2.jpg")],
      "u1/inv-b": [archivo("3.png")],
    });
    expect(await recopilarRutas(listar, "u1")).toEqual(["u1/inv-a/1.jpg", "u1/inv-a/2.jpg", "u1/inv-b/3.png"]);
  });

  it("nunca devuelve una carpeta como si fuera un archivo", async () => {
    const listar = arbol({ u1: [carpeta("inv-a")], "u1/inv-a": [] });
    expect(await recopilarRutas(listar, "u1")).toEqual([]);
  });

  it("acepta archivos sueltos en la raíz del usuario y usuarios sin nada", async () => {
    expect(await recopilarRutas(arbol({ u1: [archivo("suelto.jpg")] }), "u1")).toEqual(["u1/suelto.jpg"]);
    expect(await recopilarRutas(arbol({}), "u1")).toEqual([]);
  });

  it("si una lista falla devuelve null: no se borra a medias", async () => {
    const listar = async (p: string) => (p === "u1" ? [carpeta("inv-a")] : null);
    expect(await recopilarRutas(listar, "u1")).toBeNull();
  });

  it("corta una jerarquía absurda en vez de recorrerla sin fin", async () => {
    const infinito = async () => [carpeta("x")];
    expect(await recopilarRutas(infinito, "u1")).toBeNull();
  });
});
