import { describe, expect, it, vi } from "vitest";
import { resolverVistaPrevia } from "@/lib/previews/resolver";
import { generarToken, hashToken } from "@/lib/previews/token";

const AHORA = new Date("2026-10-23T12:00:00.000Z");
const enDias = (n: number) => new Date(AHORA.getTime() + n * 86_400_000).toISOString();

type Resp = { data: unknown; error: { message: string } | null };

/** Cliente de servicio falso: solo registra por qué hash se preguntó. */
function adminFalso(respuesta: Resp) {
  const consultas: { tabla: string; hash?: unknown }[] = [];
  const admin = {
    from(tabla: string) {
      const c = { tabla } as { tabla: string; hash?: unknown };
      consultas.push(c);
      const cadena = {
        select: () => cadena,
        eq: (_col: string, valor: unknown) => {
          c.hash = valor;
          return cadena;
        },
        maybeSingle: async () => respuesta,
      };
      return cadena;
    },
  };
  return { admin: admin as never, consultas };
}

describe("resolverVistaPrevia", () => {
  it("una liga vigente abre la invitación a la que apunta", async () => {
    const t = generarToken();
    const { admin, consultas } = adminFalso({
      data: { invitation_id: "inv-1", expires_at: enDias(3), revoked_at: null },
      error: null,
    });
    expect(await resolverVistaPrevia(admin, t, AHORA)).toEqual({
      ok: true,
      invitationId: "inv-1",
      expiresAt: enDias(3),
    });
    // Se busca por el HASH, nunca por el token en claro.
    expect(consultas[0].tabla).toBe("invitation_previews");
    expect(consultas[0].hash).toBe(hashToken(t));
    expect(consultas[0].hash).not.toBe(t);
  });

  it("una liga VENCIDA no abre", async () => {
    const { admin } = adminFalso({
      data: { invitation_id: "inv-1", expires_at: enDias(-1), revoked_at: null },
      error: null,
    });
    expect(await resolverVistaPrevia(admin, generarToken(), AHORA)).toEqual({ ok: false });
  });

  it("una liga REVOCADA no abre, aunque no haya vencido", async () => {
    const { admin } = adminFalso({
      data: { invitation_id: "inv-1", expires_at: enDias(5), revoked_at: AHORA.toISOString() },
      error: null,
    });
    expect(await resolverVistaPrevia(admin, generarToken(), AHORA)).toEqual({ ok: false });
  });

  it("un token que no existe no abre", async () => {
    const { admin } = adminFalso({ data: null, error: null });
    expect(await resolverVistaPrevia(admin, generarToken(), AHORA)).toEqual({ ok: false });
  });

  it("un valor basura NO llega a la base: se descarta por forma", async () => {
    const { admin, consultas } = adminFalso({
      data: { invitation_id: "inv-1", expires_at: enDias(5), revoked_at: null },
      error: null,
    });
    for (const malo of ["", "abc", "A".repeat(42), "A".repeat(44), "../etc/passwd", "' or 1=1 --", null, undefined, 7]) {
      expect(await resolverVistaPrevia(admin, malo, AHORA), JSON.stringify(malo)).toEqual({ ok: false });
    }
    expect(consultas).toHaveLength(0);
  });

  it("un error de la base CIERRA (p. ej. la migración aún no está aplicada): ante la duda, no se abre", async () => {
    const espia = vi.spyOn(console, "error").mockImplementation(() => {});
    const { admin } = adminFalso({
      data: { invitation_id: "inv-1", expires_at: enDias(5), revoked_at: null },
      error: { message: 'relation "invitation_previews" does not exist' },
    });
    expect(await resolverVistaPrevia(admin, generarToken(), AHORA)).toEqual({ ok: false });
    espia.mockRestore();
  });

  it("todas las salidas negativas son IDÉNTICAS: no se filtra por qué falló", async () => {
    const t = generarToken();
    const casos: Resp[] = [
      { data: null, error: null },
      { data: { invitation_id: "i", expires_at: enDias(-1), revoked_at: null }, error: null },
      { data: { invitation_id: "i", expires_at: enDias(5), revoked_at: AHORA.toISOString() }, error: null },
    ];
    const espia = vi.spyOn(console, "error").mockImplementation(() => {});
    const resultados = await Promise.all(casos.map((c) => resolverVistaPrevia(adminFalso(c).admin, t, AHORA)));
    espia.mockRestore();
    expect(new Set(resultados.map((r) => JSON.stringify(r))).size).toBe(1);
  });
});
