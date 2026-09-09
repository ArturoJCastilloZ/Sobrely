import { describe, expect, it } from "vitest";
import {
  HERO_BLOQUES,
  parseConfig,
  MODULE_TYPES,
  desplazamientoSchema,
  limitarDesplazamiento,
  moduleConfigSchemas,
  paresSolapados,
  estiloDeDesplazamiento,
  parcheDeDesplazamiento,
  MOSTRAR_MOVIMIENTO_LIBRE,
  heroConfigSchema,
} from "@/lib/modules/types";

describe("limitarDesplazamiento", () => {
  // El criterio es que el CENTRO del bloque quede dentro del marco, NO el
  // bloque entero. La primera version exigia que cupiera entero y fue la causa
  // del segundo «sigue sin moverse» que reporto el dev: `h2`, `p` y el `div`
  // del CTA son elementos de BLOQUE y su caja ocupa casi todo el ancho del
  // contenedor, asi que no tenian a donde ir. Medido en su invitacion: el
  // titulo ocupaba 325 px de 418 —46 px de recorrido— y con un titulo que
  // llena el ancho el recorrido era EXACTAMENTE cero.
  const EXT = { ancho: 1, alto: 0.8 };

  it("un desplazamiento que cabe se deja intacto", () => {
    expect(
      limitarDesplazamiento({ dx: 0.1, dy: -0.05 }, { x: 0.5, y: 0.4 }, EXT),
    ).toEqual({ dx: 0.1, dy: -0.05 });
  });

  it("el recorrido es el marco ENTERO, no lo que sobra del bloque", () => {
    // Desde el centro (0.5) se puede llegar al borde derecho: dx hasta +0.5.
    // Con el criterio viejo, un bloque de medio-ancho 0.4 solo habria podido
    // moverse 0.1 — el sintoma exacto que el dev veia.
    const r = limitarDesplazamiento({ dx: 9, dy: 9 }, { x: 0.5, y: 0.4 }, EXT);
    expect(r.dx).toBeCloseTo(0.5, 10);
    expect(r.dy).toBeCloseTo(0.4, 10);
  });

  it("no deja salir el centro por el otro lado", () => {
    const r = limitarDesplazamiento({ dx: -9, dy: -9 }, { x: 0.5, y: 0.4 }, EXT);
    expect(r.dx).toBeCloseTo(-0.5, 10);
    expect(r.dy).toBeCloseTo(-0.4, 10);
  });

  it("respeta un centro natural que NO esta en el medio", () => {
    // Centro en 0.2: a la izquierda queda 0.2, a la derecha 0.8.
    expect(
      limitarDesplazamiento({ dx: -9, dy: 0 }, { x: 0.2, y: 0.4 }, EXT).dx,
    ).toBeCloseTo(-0.2, 10);
    expect(
      limitarDesplazamiento({ dx: 9, dy: 0 }, { x: 0.2, y: 0.4 }, EXT).dx,
    ).toBeCloseTo(0.8, 10);
  });

  it("el bloque puede quedar medio fuera, pero NUNCA perderse del todo", () => {
    // Es la contrapartida aceptada de dar recorrido de verdad: con el centro
    // en el borde, la mitad del texto sigue dentro del marco. Perderlo
    // entero seria un estado del que el usuario no sabria salir.
    const r = limitarDesplazamiento({ dx: 99, dy: 99 }, { x: 0.5, y: 0.4 }, EXT);
    expect(r.dx + 0.5).toBeLessThanOrEqual(EXT.ancho);
    expect(r.dy + 0.4).toBeLessThanOrEqual(EXT.alto);
  });

  it("el eje VERTICAL se limita contra alto/ancho, no contra 1", () => {
    // La unidad es el ANCHO de la seccion en los dos ejes (`cqw`), medido en el
    // navegador: `top` en % da 0 con `min-height`, y `cqw` sobre la propia
    // seccion si resuelve sin sacar el contenido del flujo. Una seccion de
    // 380x300 tiene extension vertical 300/380 = 0.789, NO 1.
    const ext = { ancho: 1, alto: 300 / 380 };
    const r = limitarDesplazamiento({ dx: 0, dy: 9 }, { x: 0.5, y: 0.4 }, ext);
    expect(r.dy).toBeCloseTo(ext.alto - 0.4, 10);
    expect(r.dy).toBeLessThan(1);
  });

  it("una extension imposible no mueve nada", () => {
    for (const alto of [0, -1, Number.NaN]) {
      const r = limitarDesplazamiento(
        { dx: 0.2, dy: 0.2 },
        { x: 0.5, y: 0.3 },
        { ancho: 1, alto },
      );
      expect(r.dy).toBe(0);
    }
  });

  it("no propaga NaN ni Infinity", () => {
    for (const mal of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = limitarDesplazamiento(
        { dx: mal, dy: mal },
        { x: 0.5, y: 0.4 },
        EXT,
      );
      expect(Number.isFinite(r.dx)).toBe(true);
      expect(Number.isFinite(r.dy)).toBe(true);
    }
  });

  it("el esquema topa el rango incluso sin pasar por el limitador", () => {
    // Defensa en profundidad: el limitador es del editor, pero una config
    // escrita a mano no pasa por el.
    expect(desplazamientoSchema.parse({ dx: 9, dy: -9 })).toEqual({
      dx: 1,
      dy: -1,
    });
  });
});

describe("paresSolapados", () => {
  const caja = (id: string, x: number, y: number) => ({
    id,
    x,
    y,
    w: 0.4,
    h: 0.2,
  });

  it("tres bloques separados no dan ningún par", () => {
    expect(
      paresSolapados([caja("a", 0.2, 0.2), caja("b", 0.8, 0.2), caja("c", 0.2, 0.8)]),
    ).toEqual([]);
  });

  it("dos encimados dan su par", () => {
    expect(paresSolapados([caja("a", 0.5, 0.5), caja("b", 0.55, 0.52)])).toEqual([
      ["a", "b"],
    ]);
  });

  it("exige solape en LOS DOS ejes: tocarse en uno solo no es pisarse", () => {
    // Misma franja horizontal pero separados en x: no se pisan. Si la función
    // mirara un solo eje, esto saldría como solape y el aviso mentiría.
    expect(paresSolapados([caja("a", 0.2, 0.5), caja("b", 0.8, 0.5)])).toEqual([]);
  });

  it("no se compara un bloque consigo mismo ni repite pares", () => {
    const r = paresSolapados([
      caja("a", 0.5, 0.5),
      caja("b", 0.5, 0.5),
      caja("c", 0.5, 0.5),
    ]);
    expect(r).toEqual([
      ["a", "b"],
      ["a", "c"],
      ["b", "c"],
    ]);
  });
});

describe("parcheDeDesplazamiento", () => {
  const D = { dx: 0.2, dy: -0.1 };

  it("la PORTADA guarda por nombre y conserva los otros bloques", () => {
    const r = parcheDeDesplazamiento(
      true,
      { title: { dx: 0.9, dy: 0.9 }, cta: { dx: 0.1, dy: 0.1 } },
      "subtitle",
      D,
    );
    expect(r).toEqual({
      textOffsets: {
        title: { dx: 0.9, dy: 0.9 },
        cta: { dx: 0.1, dy: 0.1 },
        subtitle: D,
      },
    });
  });

  it("la portada RECHAZA un bloque que no es suyo", () => {
    // Un `data-bloque` inesperado no debe corromper lo guardado.
    for (const malo of ["0", "titulo", "", "footer"]) {
      expect(parcheDeDesplazamiento(true, {}, malo, D)).toBeNull();
    }
  });

  it("una SECCIÓN guarda por índice y rellena los huecos", () => {
    // Sin rellenar, un array disperso se convierte en `null` al pasar por JSON
    // y el esquema recibiría algo que no es un objeto.
    const r = parcheDeDesplazamiento(false, [], "2", D) as {
      textOffsets: unknown[];
    };
    expect(r.textOffsets).toEqual([{ dx: 0, dy: 0 }, { dx: 0, dy: 0 }, D]);
    expect(JSON.parse(JSON.stringify(r.textOffsets))).toEqual(r.textOffsets);
  });

  it("una sección conserva los índices anteriores", () => {
    const r = parcheDeDesplazamiento(
      false,
      [{ dx: 0.5, dy: 0 }, { dx: 0, dy: 0.5 }],
      "0",
      D,
    ) as { textOffsets: unknown[] };
    expect(r.textOffsets).toEqual([D, { dx: 0, dy: 0.5 }]);
  });

  it("una sección RECHAZA índices imposibles", () => {
    for (const malo of ["-1", "6", "title", "1.5", ""]) {
      expect(parcheDeDesplazamiento(false, [], malo, D)).toBeNull();
    }
  });

  it("sobrevive a un `actual` de la forma equivocada", () => {
    // Una config vieja, o tocada a mano, puede traer un objeto donde se espera
    // un array. No debe reventar: se parte de vacío.
    expect(parcheDeDesplazamiento(false, { raro: 1 }, "0", D)).toEqual({
      textOffsets: [D],
    });
    expect(parcheDeDesplazamiento(true, [1, 2], "title", D)).toEqual({
      textOffsets: { title: D },
    });
  });
});

describe("estiloDeDesplazamiento", () => {
  it("APAGADO no emite NADA: una invitación que no lo usa no se mueve", () => {
    // Es la propiedad que hace esto aditivo. Si emitiera un `translate(0,0)`
    // ya estaría creando un contexto de apilamiento y tocando el render de
    // todas las invitaciones guardadas.
    expect(estiloDeDesplazamiento(false, { dx: 0.5, dy: 0.5 })).toEqual({});
  });

  it("encendido y SIN mover emite `touchAction`, para poder agarrarlo", () => {
    // Un bloque sin desplazar tambien tiene que ser arrastrable, y en tactil
    // eso exige `touch-action: none` en el propio bloque — si no, el navegador
    // se lleva el gesto como scroll. Lo aprendi porque el arrastre no movia
    // nada: ver la capa que lo tapaba todo.
    expect(estiloDeDesplazamiento(true, undefined)).toEqual({
      touchAction: "none",
    });
    expect(estiloDeDesplazamiento(true, { dx: 0, dy: 0 })).toEqual({
      touchAction: "none",
    });
  });

  it("encendido emite `cqw` en los dos ejes", () => {
    expect(estiloDeDesplazamiento(true, { dx: 0.25, dy: -0.1 })).toEqual({
      touchAction: "none",
      transform: "translate(25cqw, -10cqw)",
    });
  });

  it("el string es CSS válido y no arrastra notación científica", () => {
    // `0.0000001 * 100` da `0.00001`, pero valores mas pequenos salen como
    // `1e-8cqw`, que el navegador NO entiende. Se comprueba el rango real que
    // el editor puede producir: un pixel sobre 400 es 0.0025.
    for (const dx of [0.0025, -0.0025, 1, -1, 0.333]) {
      const t = estiloDeDesplazamiento(true, { dx, dy: 0 }).transform!;
      expect(t).not.toMatch(/e-/);
      expect(t).toMatch(/^translate\(-?[0-9.]+cqw, 0cqw\)$/);
    }
  });
});

describe("el interruptor está en el esquema de los 12 módulos", () => {
  it("hay 12 tipos que comprobar", () => {
    expect(MODULE_TYPES.length).toBe(12);
  });

  it.each(MODULE_TYPES.map((t) => [t] as const))(
    "%s acepta freeMove y guarda desplazamientos",
    (tipo) => {
      const leido = moduleConfigSchemas[tipo].parse({ freeMove: true }) as {
        freeMove: boolean;
      };
      expect(leido.freeMove).toBe(true);
    },
  );

  it("apagado es el DEFECTO: una config vieja no se mueve", () => {
    for (const tipo of MODULE_TYPES) {
      const leido = moduleConfigSchemas[tipo].parse({}) as { freeMove: boolean };
      expect(leido.freeMove).toBe(false);
    }
  });

  it("un desplazamiento BASURA degrada, no borra la portada", () => {
    // El control que importa. `parseConfig` descarta la config ENTERA del
    // modulo si algo no valida, asi que si el rango RECHAZARA en vez de
    // recortar, un `dx` fuera de rango se llevaria por delante el titulo, el
    // subtitulo y la foto. Se comprueba que el resto SOBREVIVE.
    const leido = parseConfig("hero", {
      title: "Ana & Carlos",
      subtitle: "7 de noviembre",
      imageUrl: "/arte/foto/boda-pastel-rosas.jpg",
      freeMove: true,
      textOffsets: { title: { dx: 99, dy: "no soy un numero" } },
    }) as {
      title: string;
      subtitle: string;
      imageUrl: string;
      textOffsets: { title: { dx: number; dy: number } };
    };
    expect(leido.title).toBe("Ana & Carlos");
    expect(leido.subtitle).toBe("7 de noviembre");
    expect(leido.imageUrl).toBe("/arte/foto/boda-pastel-rosas.jpg");
    expect(leido.textOffsets.title).toEqual({ dx: 1, dy: 0 });
  });

  it("la portada guarda un desplazamiento por bloque, con nombre", () => {
    const c = heroConfigSchema.parse({
      textOffsets: { title: { dx: 0.1, dy: 0.2 } },
    });
    expect(Object.keys(c.textOffsets).sort()).toEqual([...HERO_BLOQUES].sort());
    expect(c.textOffsets.title).toEqual({ dx: 0.1, dy: 0.2 });
    // Los que no se declaran quedan sin desplazar, no undefined.
    expect(c.textOffsets.cta).toEqual({ dx: 0, dy: 0 });
  });
});

describe("el interruptor está OCULTO pero el motor intacto", () => {
  it("la interfaz no lo muestra", () => {
    expect(MOSTRAR_MOVIMIENTO_LIBRE).toBe(false);
  });

  it("una invitación que YA lo tenga guardado se sigue pintando igual", () => {
    // Es lo que hace que esconder la interfaz sea seguro: apagar el control no
    // apaga el motor, así que nadie pierde una colocación hecha antes.
    const c = heroConfigSchema.parse({
      freeMove: true,
      textOffsets: { title: { dx: 0.2, dy: -0.1 } },
    });
    expect(c.freeMove).toBe(true);
    expect(estiloDeDesplazamiento(c.freeMove, c.textOffsets.title)).toEqual({
      touchAction: "none",
      transform: "translate(20cqw, -10cqw)",
    });
  });

  it("reactivarlo es cambiar el booleano: nada mas depende de el", () => {
    // El esquema y las guardas no lo consultan — sólo la interfaz. Si alguna
    // lógica lo mirara, esconder el control cambiaría el comportamiento y no
    // sólo la visibilidad.
    for (const f of [true, false]) {
      expect(heroConfigSchema.parse({ freeMove: f }).freeMove).toBe(f);
    }
  });
});
