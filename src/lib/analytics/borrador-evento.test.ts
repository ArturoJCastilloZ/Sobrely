import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const registrar = vi.fn();
vi.mock("./embudo", () => ({ registrarEvento: (...a: unknown[]) => registrar(...a) }));

import { registrarBorradorCompleto } from "./borrador-evento";

const SUBIDA = "https://x.supabase.co/storage/v1/object/public/invitation-images/u/i/f.jpg";
const modulos = (titulo: string) => [
  { module_type: "hero", is_visible: true, config: { title: titulo, imageUrl: SUBIDA } },
  { module_type: "map", is_visible: true, config: { venueName: "Salón" } },
  { module_type: "rsvp", is_visible: true, config: {} },
];

/** Cliente falso: `invitations` → template_id, `templates` → fila de plantilla. */
function clienteFalso(templateId: string | null, plantilla: unknown) {
  const consultas: string[] = [];
  const from = (tabla: string) => {
    consultas.push(tabla);
    const fila = tabla === "invitations" ? { template_id: templateId } : plantilla;
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = () => q;
    q.maybeSingle = async () => ({ data: fila });
    return q;
  };
  return { cliente: { from } as never, consultas };
}

const plantilla = {
  slug: "boda-jardin",
  modules_config: [{ module_type: "hero", config: { title: "Ana & Carlos" } }],
};

beforeEach(() => registrar.mockClear());

describe("registrarBorradorCompleto", () => {
  it("registra una vez con plantilla, slug y módulos visibles", async () => {
    const { cliente } = clienteFalso("t1", plantilla);
    await registrarBorradorCompleto({
      supabase: cliente, invitationId: "inv-1", fechaDelEvento: "2026-12-12", modulos: modulos("Ana y Luis"),
    });
    expect(registrar).toHaveBeenCalledWith("complete_draft", "inv-1", {
      template_slug: "boda-jardin", modules_count: 3,
    });
  });

  it("no consulta la base si ya falta algo de lo que viene en la petición (camino barato)", async () => {
    const { cliente, consultas } = clienteFalso("t1", plantilla);
    await registrarBorradorCompleto({
      supabase: cliente, invitationId: "inv-2", fechaDelEvento: "", modulos: modulos("Ana y Luis"),
    });
    expect(consultas).toEqual([]);
    expect(registrar).not.toHaveBeenCalled();
  });

  it("no registra si el título sigue siendo el de la plantilla", async () => {
    const { cliente } = clienteFalso("t1", plantilla);
    await registrarBorradorCompleto({
      supabase: cliente, invitationId: "inv-3", fechaDelEvento: "2026-12-12", modulos: modulos("Ana & Carlos"),
    });
    expect(registrar).not.toHaveBeenCalled();
  });

  it("una invitación en blanco compara con el título por defecto", async () => {
    const { cliente } = clienteFalso(null, null);
    await registrarBorradorCompleto({
      supabase: cliente, invitationId: "inv-4", fechaDelEvento: "2026-12-12", modulos: modulos("Nuestra celebración"),
    });
    expect(registrar).not.toHaveBeenCalled();
    await registrarBorradorCompleto({
      supabase: cliente, invitationId: "inv-5", fechaDelEvento: "2026-12-12", modulos: modulos("Boda de Ana"),
    });
    expect(registrar).toHaveBeenCalledTimes(1);
  });

  it("después de registrar, los guardados siguientes de la misma invitación no consultan nada", async () => {
    const { cliente, consultas } = clienteFalso("t1", plantilla);
    const datos = { supabase: cliente, invitationId: "inv-6", fechaDelEvento: "2026-12-12", modulos: modulos("Ana y Luis") };
    await registrarBorradorCompleto(datos);
    const antes = consultas.length;
    await registrarBorradorCompleto(datos);
    expect(consultas.length).toBe(antes);
    expect(registrar).toHaveBeenCalledTimes(1);
  });

  it("nunca lanza aunque la base falle", async () => {
    const roto = { from: () => { throw new Error("caída"); } } as never;
    await expect(
      registrarBorradorCompleto({ supabase: roto, invitationId: "inv-7", fechaDelEvento: "2026-12-12", modulos: modulos("Ana y Luis") }),
    ).resolves.toBeUndefined();
  });
});
