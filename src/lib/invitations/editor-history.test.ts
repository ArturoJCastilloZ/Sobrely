import { describe, expect, it } from "vitest";
import {
  editorHistoryReducer, estadoInicial, puedeDeshacer, puedeRehacer,
  hayCambiosSinGuardar, type EditorHistoryState,
} from "./editor-history";
import { VENTANA_FUSION_MS, MAX_HISTORIAL, type EditorDocument } from "./editor-document";
import { defaultTheme } from "@/lib/theme/theme";
import { defaultConfigFor } from "@/lib/modules/types";

const doc = (): EditorDocument => ({
  invitation: {
    id: "inv-1", title: "Boda", slug: "boda", event_type: "boda",
    event_date: "", is_published: false, rsvp_mode: "open",
  },
  modules: [
    { id: "m1", module_type: "hero", sort_order: 0, is_visible: true, config: defaultConfigFor("hero") },
    { id: "m2", module_type: "countdown", sort_order: 1, is_visible: true, config: defaultConfigFor("countdown") },
  ],
  theme: defaultTheme(),
});

const aplicar = (s: EditorHistoryState, action: Parameters<typeof editorHistoryReducer>[1]) =>
  editorHistoryReducer(s, action);

const editar = (s: EditorHistoryState, titulo: string, ahora: number) =>
  aplicar(s, { type: "aplicar", action: { type: "updateSettings", patch: { title: titulo } }, ahora });

describe("historial del editor", () => {
  it("arranca sin nada que deshacer ni cambios pendientes", () => {
    const s = estadoInicial(doc());
    expect(puedeDeshacer(s)).toBe(false);
    expect(puedeRehacer(s)).toBe(false);
    expect(hayCambiosSinGuardar(s)).toBe(false);
  });

  it("deshacer devuelve el documento anterior; rehacer lo trae de vuelta", () => {
    let s = estadoInicial(doc());
    s = aplicar(s, { type: "aplicar", action: { type: "deleteModule", id: "m2" } });
    expect(s.presente.modules).toHaveLength(1);

    s = aplicar(s, { type: "deshacer" });
    expect(s.presente.modules).toHaveLength(2);
    expect(s.presente.modules[1].id).toBe("m2");

    s = aplicar(s, { type: "rehacer" });
    expect(s.presente.modules).toHaveLength(1);
  });

  it("deshacer un borrado recupera la CONFIG del módulo, no solo la fila", () => {
    let s = estadoInicial(doc());
    s = aplicar(s, {
      type: "aplicar",
      action: { type: "updateConfig", id: "m2", patch: { title: "Faltan poquito" } },
    });
    s = aplicar(s, { type: "aplicar", action: { type: "deleteModule", id: "m2" } });
    s = aplicar(s, { type: "deshacer" });
    expect(s.presente.modules.find((m) => m.id === "m2")?.config.title).toBe("Faltan poquito");
  });

  it("teclear seguido se fusiona en UN paso, no uno por letra", () => {
    let s = estadoInicial(doc());
    let t = 1000;
    for (const parcial of ["B", "Bo", "Bod", "Boda ", "Boda A", "Boda An", "Boda Ana"]) {
      s = editar(s, parcial, t);
      t += 50; // dentro de la ventana
    }
    expect(s.presente.invitation.title).toBe("Boda Ana");
    expect(s.pasado).toHaveLength(1);

    s = aplicar(s, { type: "deshacer" });
    // Un solo ⌘Z vuelve al titulo original, no a "Boda An".
    expect(s.presente.invitation.title).toBe("Boda");
  });

  it("una pausa corta la fusión: son dos pasos", () => {
    let s = estadoInicial(doc());
    s = editar(s, "Boda A", 1000);
    s = editar(s, "Boda B", 1000 + VENTANA_FUSION_MS + 1);
    expect(s.pasado).toHaveLength(2);
  });

  it("campos distintos no se fusionan aunque sean seguidos", () => {
    let s = estadoInicial(doc());
    s = aplicar(s, { type: "aplicar", action: { type: "updateSettings", patch: { title: "X" } }, ahora: 1000 });
    s = aplicar(s, { type: "aplicar", action: { type: "updateSettings", patch: { slug: "y" } }, ahora: 1010 });
    expect(s.pasado).toHaveLength(2);
  });

  it("una acción que no cambia nada NO apila un paso vacío", () => {
    let s = estadoInicial(doc());
    s = aplicar(s, { type: "aplicar", action: { type: "reorder", activeId: "m1", overId: "m1" } });
    s = aplicar(s, { type: "aplicar", action: { type: "deleteModule", id: "no-existe" } });
    expect(s.pasado).toHaveLength(0);
    expect(puedeDeshacer(s)).toBe(false);
  });

  it("editar tras deshacer descarta el futuro", () => {
    let s = estadoInicial(doc());
    s = aplicar(s, { type: "aplicar", action: { type: "deleteModule", id: "m2" } });
    s = aplicar(s, { type: "deshacer" });
    expect(puedeRehacer(s)).toBe(true);
    s = editar(s, "Otra cosa", 5000);
    expect(puedeRehacer(s)).toBe(false);
  });

  it("lo que viene del SERVIDOR no entra al historial", () => {
    let s = estadoInicial(doc());
    s = aplicar(s, { type: "aplicar", action: { type: "setPublished", published: true } });
    // Deshacer un "se publicó" no despublicaría nada: solo mentiría.
    expect(puedeDeshacer(s)).toBe(false);
    expect(s.presente.invitation.is_published).toBe(true);
    expect(hayCambiosSinGuardar(s)).toBe(false);
  });

  it("adoptar los ids reales tras guardar tampoco es una edición", () => {
    let s = estadoInicial(doc());
    s = aplicar(s, { type: "aplicar", action: { type: "remapIds", mapa: { m1: "db-1" } } });
    expect(puedeDeshacer(s)).toBe(false);
    expect(s.presente.modules[0].id).toBe("db-1");
    expect(hayCambiosSinGuardar(s)).toBe(false);
  });

  it("editar MIENTRAS se guarda no pierde el cambio ni lo da por guardado", () => {
    // El bug del codigo anterior: al volver el guardado, reemplazaba los
    // modulos con los del servidor y se llevaba por delante lo tecleado
    // durante la peticion.
    let s = estadoInicial(doc());
    s = editar(s, "Version A", 1000);
    const enviado = s.presente;                       // lo que viaja al servidor

    s = editar(s, "Version B", 3000);                 // el usuario sigue escribiendo
    s = aplicar(s, { type: "aplicar", action: { type: "remapIds", mapa: { m1: "db-1" } } });
    s = aplicar(s, { type: "marcarGuardado", documento: enviado });

    // La edicion posterior sobrevive...
    expect(s.presente.invitation.title).toBe("Version B");
    // ...el remapeo se aplico...
    expect(s.presente.modules[0].id).toBe("db-1");
    // ...y sigue marcada como pendiente, que es la verdad.
    expect(hayCambiosSinGuardar(s)).toBe(true);
  });

  it("dirty se deriva del documento: deshacer hasta el inicio lo apaga", () => {
    let s = estadoInicial(doc());
    s = editar(s, "Cambiado", 1000);
    expect(hayCambiosSinGuardar(s)).toBe(true);
    s = aplicar(s, { type: "deshacer" });
    // Una bandera booleana seguiria diciendo "sin guardar" aqui, y es falso.
    expect(hayCambiosSinGuardar(s)).toBe(false);
  });

  it("el historial sobrevive al guardado: se puede deshacer algo ya guardado", () => {
    let s = estadoInicial(doc());
    s = editar(s, "Guardado", 1000);
    s = aplicar(s, { type: "marcarGuardado", documento: s.presente });
    expect(hayCambiosSinGuardar(s)).toBe(false);
    expect(puedeDeshacer(s)).toBe(true);
    s = aplicar(s, { type: "deshacer" });
    expect(s.presente.invitation.title).toBe("Boda");
    expect(hayCambiosSinGuardar(s)).toBe(true);
  });

  it("la pila se topa y descarta lo mas viejo, no lo reciente", () => {
    let s = estadoInicial(doc());
    for (let i = 0; i < MAX_HISTORIAL + 20; i++) {
      s = editar(s, `t${i}`, 1000 + i * (VENTANA_FUSION_MS + 10));
    }
    expect(s.pasado).toHaveLength(MAX_HISTORIAL);
    s = aplicar(s, { type: "deshacer" });
    expect(s.presente.invitation.title).toBe(`t${MAX_HISTORIAL + 20 - 2}`);
  });

  it("reordenar reindexa sort_order desde la posicion", () => {
    let s = estadoInicial(doc());
    s = aplicar(s, { type: "aplicar", action: { type: "reorder", activeId: "m2", overId: "m1" } });
    expect(s.presente.modules.map((m) => [m.id, m.sort_order])).toEqual([["m2", 0], ["m1", 1]]);
  });
});
