import { describe, expect, it } from "vitest";
import {
  contarFacetas,
  contarPorEvento,
  hrefGaleriaDelEvento,
  filtrarPlantillas,
  normalizar,
  topesDePrecio,
  type PlantillaMarketplace,
} from "./marketplace";

/**
 * Los datos del fixture NO son inventados: reproducen la forma medida en
 * producción el 2026-09-07 sobre las 50 filas activas — cinco tipos de evento
 * con reparto balanceado, `description` siempre presente, y los acentos y la
 * eñe que trae el catálogo real («Cumpleaños», «XV años», «jardín»).
 */
const tpl = (
  id: string,
  name: string,
  event_type: string | null,
  description: string | null,
): PlantillaMarketplace => ({
  id,
  slug: id,
  name,
  description,
  event_type,
  preview_image_url: `/miniaturas/${id}.jpg`,
});

const LISTA: PlantillaMarketplace[] = [
  tpl("boda-botanica", "Boda botánica", "Boda", "Hojas verdes y jardín"),
  tpl("boda-lino", "Boda lino", "Boda", "Papel de lino con sello de cera"),
  tpl("xv-noche", "XV noche estelar", "XV años", "Cielo nocturno y oro"),
  tpl("cumple-confeti", "Cumpleaños confeti", "Cumpleaños", "Confeti de colores"),
  tpl("corp-lineas", "Corporativo líneas", "Corporativo", "Retícula sobria"),
  tpl("sin-tipo", "Plantilla suelta", null, null),
];

describe("normalizar", () => {
  it("quita acentos y eñes, y baja a minúsculas", () => {
    expect(normalizar("Cumpleaños")).toBe("cumpleanos");
    expect(normalizar("XV AÑOS")).toBe("xv anos");
    expect(normalizar("  Jardín  ")).toBe("jardin");
  });

  it("deja intacto lo que ya está normalizado", () => {
    expect(normalizar("boda")).toBe("boda");
  });
});

describe("filtrarPlantillas", () => {
  it("sin filtro devuelve la lista entera y en el mismo orden", () => {
    const r = filtrarPlantillas(LISTA);
    expect(r.map((t) => t.id)).toEqual(LISTA.map((t) => t.id));
  });

  it("filtra por tipo de evento exacto", () => {
    const r = filtrarPlantillas(LISTA, { evento: "Boda" });
    expect(r.map((t) => t.id)).toEqual(["boda-botanica", "boda-lino"]);
  });

  it("el evento null significa TODOS, no 'las que no tienen tipo'", () => {
    expect(filtrarPlantillas(LISTA, { evento: null })).toHaveLength(
      LISTA.length,
    );
  });

  it("una plantilla sin event_type nunca cae en un filtro de evento", () => {
    const r = filtrarPlantillas(LISTA, { evento: "Boda" });
    expect(r.some((t) => t.id === "sin-tipo")).toBe(false);
  });

  it("busca en el nombre", () => {
    const r = filtrarPlantillas(LISTA, { q: "lino" });
    expect(r.map((t) => t.id)).toEqual(["boda-lino"]);
  });

  it("busca también en la descripción, no sólo en el nombre", () => {
    // «cera» NO aparece en ningún nombre: si la búsqueda mirara sólo `name`,
    // esto saldría vacío.
    const r = filtrarPlantillas(LISTA, { q: "cera" });
    expect(r.map((t) => t.id)).toEqual(["boda-lino"]);
  });

  it("encuentra sin acentos lo que en el catálogo va con acento", () => {
    // El caso que motivó `normalizar`: se teclea sin acento y sin eñe.
    expect(filtrarPlantillas(LISTA, { q: "botanica" })).toHaveLength(1);
    expect(filtrarPlantillas(LISTA, { q: "cumpleanos" })).toHaveLength(1);
    expect(filtrarPlantillas(LISTA, { q: "jardin" })).toHaveLength(1);
  });

  it("varios términos cruzan nombre y descripción (Y lógico)", () => {
    // «boda» está en el nombre y «jardín» en la descripción: buscar la cadena
    // entera fallaría porque nunca están juntas en un mismo campo.
    const r = filtrarPlantillas(LISTA, { q: "boda jardin" });
    expect(r.map((t) => t.id)).toEqual(["boda-botanica"]);
  });

  it("todos los términos deben aparecer, no basta con uno", () => {
    // «boda» sí está; «retícula» está pero en OTRA plantilla. Si el filtro
    // fuera un O lógico devolvería 3.
    expect(filtrarPlantillas(LISTA, { q: "boda reticula" })).toHaveLength(0);
  });

  it("una descripción null no rompe la búsqueda", () => {
    expect(() => filtrarPlantillas(LISTA, { q: "suelta" })).not.toThrow();
    expect(filtrarPlantillas(LISTA, { q: "suelta" })).toHaveLength(1);
  });

  it("una consulta de sólo espacios se trata como consulta vacía", () => {
    expect(filtrarPlantillas(LISTA, { q: "   " })).toHaveLength(LISTA.length);
  });

  it("evento y búsqueda se combinan", () => {
    expect(filtrarPlantillas(LISTA, { evento: "Boda", q: "lino" })).toHaveLength(
      1,
    );
    // La búsqueda encuentra «confeti», pero el evento la excluye.
    expect(
      filtrarPlantillas(LISTA, { evento: "Boda", q: "confeti" }),
    ).toHaveLength(0);
  });
});

describe("contarPorEvento", () => {
  it("cuenta por tipo e ignora las que no tienen", () => {
    const c = contarPorEvento(LISTA);
    expect(c.get("Boda")).toBe(2);
    expect(c.get("XV años")).toBe(1);
    expect(c.has("null")).toBe(false);
    // 4 tipos distintos entre las 6 filas: Boda va dos veces y una fila
    // no tiene tipo, asi que no crea entrada.
    expect(c.size).toBe(4);
  });
});

describe("filtrarPlantillas · favoritos", () => {
  const FAVS = new Set(["boda-lino", "cumple-confeti"]);

  it("soloFavoritos deja unicamente las marcadas", () => {
    const r = filtrarPlantillas(LISTA, { soloFavoritos: true, favoritos: FAVS });
    expect(r.map((t) => t.id).sort()).toEqual(["boda-lino", "cumple-confeti"]);
  });

  it("sin soloFavoritos el conjunto no filtra nada", () => {
    // Pasar `favoritos` no debe acotar por si solo: el que acota es el flag.
    expect(filtrarPlantillas(LISTA, { favoritos: FAVS })).toHaveLength(
      LISTA.length,
    );
  });

  it("soloFavoritos sin conjunto devuelve VACIO, no la lista entera", () => {
    // El modo de fallo que esto cierra: tratar «no tengo favoritos» como
    // «filtro inactivo» mostraria las 50 con el filtro encendido.
    expect(filtrarPlantillas(LISTA, { soloFavoritos: true })).toHaveLength(0);
  });

  it("favoritos se combina con el evento", () => {
    const r = filtrarPlantillas(LISTA, {
      soloFavoritos: true,
      favoritos: FAVS,
      evento: "Boda",
    });
    expect(r.map((t) => t.id)).toEqual(["boda-lino"]);
  });

  it("favoritos se combina con la busqueda", () => {
    const r = filtrarPlantillas(LISTA, {
      soloFavoritos: true,
      favoritos: FAVS,
      q: "confeti",
    });
    expect(r.map((t) => t.id)).toEqual(["cumple-confeti"]);
  });

  it("un favorito que ya no esta en la lista no inventa filas", () => {
    const r = filtrarPlantillas(LISTA, {
      soloFavoritos: true,
      favoritos: new Set(["plantilla-borrada"]),
    });
    expect(r).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* T14: estilo, precio y conteos por faceta                           */
/* ------------------------------------------------------------------ */
const plantilla = (
  id: string,
  event_type: string,
  estilo: "elegante" | "natural" | "moderno" | "divertido" | "romantico" | null,
  precio: number | null,
): PlantillaMarketplace => ({
  id,
  slug: id,
  name: id,
  description: null,
  event_type,
  preview_image_url: null,
  estilo,
  precio: precio === null ? null : { precio, precioRegular: null },
});

const catalogo = [
  plantilla("b1", "Boda", "elegante", 399),
  plantilla("b2", "Boda", "natural", 199),
  plantilla("b3", "Boda", "natural", 699),
  plantilla("c1", "Cumpleaños", "divertido", 199),
  plantilla("c2", "Cumpleaños", "moderno", 199),
  plantilla("x1", "XV años", "elegante", 699),
];

describe("filtrarPlantillas · estilo y precio (T14)", () => {
  it("filtra por estilo", () => {
    expect(filtrarPlantillas(catalogo, { estilo: "natural" }).map((t) => t.id)).toEqual(["b2", "b3"]);
  });

  it("filtra por precio máximo, inclusivo", () => {
    expect(filtrarPlantillas(catalogo, { precioMax: 199 }).map((t) => t.id)).toEqual(["b2", "c1", "c2"]);
    expect(filtrarPlantillas(catalogo, { precioMax: 399 })).toHaveLength(4);
  });

  it("los filtros se combinan con AND, incluido el evento y la búsqueda", () => {
    expect(
      filtrarPlantillas(catalogo, { evento: "Boda", estilo: "natural", precioMax: 199 }).map((t) => t.id),
    ).toEqual(["b2"]);
    expect(filtrarPlantillas(catalogo, { evento: "Cumpleaños", estilo: "elegante" })).toEqual([]);
    expect(filtrarPlantillas(catalogo, { estilo: "elegante", q: "x1" }).map((t) => t.id)).toEqual(["x1"]);
  });

  it("sin precio calculado no pasa un filtro de precio, pero sí sin filtro", () => {
    const sin = [plantilla("s1", "Boda", "natural", null)];
    expect(filtrarPlantillas(sin, { precioMax: 999 })).toEqual([]);
    expect(filtrarPlantillas(sin, {})).toHaveLength(1);
  });

  it("precioMax 0 es un filtro real y null/ausente no filtra", () => {
    expect(filtrarPlantillas(catalogo, { precioMax: 0 })).toEqual([]);
    expect(filtrarPlantillas(catalogo, { precioMax: null })).toHaveLength(6);
  });
});

describe("topesDePrecio", () => {
  it("devuelve los precios que hay, ordenados, sin el más alto", () => {
    expect(topesDePrecio(catalogo)).toEqual([199, 399]);
  });
  it("con un solo precio o sin precios no ofrece pastillas", () => {
    expect(topesDePrecio([plantilla("a", "Boda", null, 199)])).toEqual([]);
    expect(topesDePrecio([plantilla("a", "Boda", null, null)])).toEqual([]);
    expect(topesDePrecio([])).toEqual([]);
  });
});

describe("contarFacetas", () => {
  it("sin filtros cuenta todo el catálogo", () => {
    const f = contarFacetas(catalogo, {}, [199, 399]);
    expect(f.evento.get("Boda")).toBe(3);
    expect(f.estilo.get("elegante")).toBe(2);
    expect(f.precio.get(199)).toBe(3);
    expect(f.precio.get(399)).toBe(4);
  });

  it("elegir un evento no pone en 0 a los demás eventos", () => {
    const f = contarFacetas(catalogo, { evento: "Boda" }, [199, 399]);
    expect(f.evento.get("Boda")).toBe(3);
    expect(f.evento.get("Cumpleaños")).toBe(2);
    expect(f.evento.get("XV años")).toBe(1);
  });

  it("el estilo y el precio se cuentan dentro del evento elegido", () => {
    const f = contarFacetas(catalogo, { evento: "Boda" }, [199, 399]);
    expect(f.estilo.get("natural")).toBe(2);
    expect(f.estilo.get("divertido")).toBeUndefined();
    expect(f.precio.get(199)).toBe(1);
  });

  it("un cruce sin resultados se refleja: Boda + Divertido no existe", () => {
    const f = contarFacetas(catalogo, { estilo: "divertido" }, [199, 399]);
    expect(f.evento.get("Boda")).toBeUndefined();
    expect(f.evento.get("Cumpleaños")).toBe(1);
  });

  it("el conteo de cada grupo coincide con lo que mostraría pulsarlo", () => {
    const filtro = { evento: "Boda", precioMax: 399 };
    const f = contarFacetas(catalogo, filtro, [199, 399]);
    for (const e of ["elegante", "natural"] as const) {
      expect(f.estilo.get(e)).toBe(filtrarPlantillas(catalogo, { ...filtro, estilo: e }).length);
    }
    for (const [tipo, n] of f.evento) {
      expect(n).toBe(filtrarPlantillas(catalogo, { ...filtro, evento: tipo }).length);
    }
  });
});

describe("hrefGaleriaDelEvento", () => {
  it("codifica el tipo de evento y lo recupera tal cual en la galería", () => {
    for (const tipo of ["Boda", "XV años", "Baby shower", "Cumpleaños", "Corporativo"]) {
      const href = hrefGaleriaDelEvento(tipo);
      expect(href.startsWith("/plantillas?evento=")).toBe(true);
      const recuperado = new URL(href, "https://sobrely.com").searchParams.get("evento");
      expect(recuperado).toBe(tipo);
    }
  });
});
