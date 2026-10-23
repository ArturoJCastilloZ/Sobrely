import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Guardas ESTRUCTURALES de la Fase 4: lo que no se puede ejecutar en una prueba
 * unitaria (la ruta de Next, el SQL de la migración). Cada ancla se comprueba
 * que EXISTE: sin eso, `expect("").not.toContain(...)` pasa mirando la nada.
 */
const leer = (ruta: string) => readFileSync(ruta, "utf8");
const sinComentarios = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const sinComentariosSql = (s: string) => s.replace(/--[^\n]*/g, "");

describe("la ruta /vista-previa/[token]", () => {
  const fuente = sinComentarios(leer("src/app/vista-previa/[token]/page.tsx"));

  it("el ancla existe (no es un archivo vacío)", () => {
    expect(fuente).toContain("export default async function VistaPreviaPage");
  });

  it("resuelve la liga ANTES de cargar la invitación, y cierra con 404 si no abre", () => {
    const resuelve = fuente.indexOf("resolverVistaPrevia(");
    const cierra = fuente.indexOf("notFound()");
    const carga = fuente.indexOf("cargarInvitacionDeVistaPrevia(");
    expect(resuelve).toBeGreaterThan(-1);
    expect(cierra).toBeGreaterThan(resuelve);
    expect(carga).toBeGreaterThan(cierra);
  });

  it("nunca se indexa, ni se cachea, ni manda el referrer (el token es una credencial)", () => {
    expect(fuente).toContain("index: false");
    expect(fuente).toContain("follow: false");
    expect(fuente).toContain('referrer: "no-referrer"');
    expect(fuente).toContain('dynamic = "force-dynamic"');
  });

  it("renderiza la vista pública en modo `vistaPrevia`", () => {
    expect(fuente).toMatch(/<PublicInvitationView[^>]*\bvistaPrevia\b/);
  });

  it("no usa el cliente con sesión: la tabla es solo del servidor", () => {
    expect(fuente).toContain("createAdminClient");
    expect(fuente).not.toContain("createClient(");
  });
});

describe("el cargador no filtra datos reales a la vista", () => {
  const fuente = sinComentarios(leer("src/lib/previews/cargar.ts"));

  it("el id de la invitación que sale es SINTÉTICO, nunca el real", () => {
    expect(fuente).toContain("id: ID_DE_VISTA_PREVIA");
    expect(fuente).not.toMatch(/\bid:\s*invitationId\b/);
    expect(fuente).not.toMatch(/\bid:\s*inv\.id\b/);
  });

  it("solo carga módulos VISIBLES: la vista previa muestra lo que verían los invitados", () => {
    expect(fuente).toContain('.eq("is_visible", true)');
  });
});

describe("la migración 0060 deja la tabla cerrada", () => {
  const sql = sinComentariosSql(leer("supabase/migrations/0060_vistas_previas.sql"));

  it("el ancla existe", () => {
    expect(sql).toContain("create table if not exists public.invitation_previews");
  });

  it("guarda el HASH, no el token: no hay una columna `token`", () => {
    expect(sql).toContain("token_hash    text not null unique");
    expect(sql).not.toMatch(/\btoken\s+text\b/);
  });

  it("RLS activada, SIN policies, y permisos de anon/authenticated revocados", () => {
    expect(sql).toContain("alter table public.invitation_previews enable row level security");
    expect(sql).not.toMatch(/create\s+policy/i);
    expect(sql).toContain(
      "revoke all on table public.invitation_previews from anon, authenticated",
    );
  });

  it("concede a service_role de forma EXPLÍCITA (un Supabase nuevo no lo hace solo)", () => {
    expect(sql).toMatch(/grant\s+select,\s*insert,\s*update\s+on table public\.invitation_previews\s+to service_role/);
  });

  it("se autocomprueba: falla si quedó abierta", () => {
    expect(sql).toContain("raise exception");
    expect(sql).toContain("has_table_privilege('anon'");
  });

  it("borrar la invitación borra sus ligas", () => {
    expect(sql).toContain("references public.invitations (id) on delete cascade");
  });
});

describe("las acciones nunca escriben el token en claro", () => {
  const fuente = sinComentarios(leer("src/lib/previews/actions.ts"));

  it("el insert lleva solo invitation_id, token_hash y expires_at", () => {
    const ini = fuente.indexOf(".insert({");
    expect(ini, "ancla del insert no encontrada").toBeGreaterThan(-1);
    const bloque = fuente.slice(ini, fuente.indexOf("})", ini));
    expect(bloque).toContain("token_hash: hashToken(token)");
    expect(bloque).not.toMatch(/\btoken:/);
  });
});

describe("la liga no aparece en ningún índice público", () => {
  it("está en robots.txt y NO en el sitemap", () => {
    expect(sinComentarios(leer("src/app/robots.ts"))).toContain('"/vista-previa"');
    expect(sinComentarios(leer("src/app/sitemap.ts"))).not.toContain("vista-previa");
  });

  it("el nombre `vista-previa` está reservado: nadie puede tomarlo como vanity", () => {
    expect(sinComentarios(leer("src/lib/vanity/validate.ts"))).toContain('"vista-previa"');
  });
});
