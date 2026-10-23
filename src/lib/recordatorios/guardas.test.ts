import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guardas ESTRUCTURALES de la Fase 5: decisiones de diseño que un cambio
 * «inocente» podría deshacer sin que ninguna prueba de comportamiento lo note.
 * Cada una dice qué decisión defiende y qué rompería quitarla.
 */
const RAIZ = fileURLToPath(new URL("../../../", import.meta.url));
const leer = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");
const sinComentarios = (rel: string) =>
  leer(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const MODULOS = readdirSync(join(RAIZ, "src/lib/recordatorios")).filter(
  (f) => f.endsWith(".ts") && !f.includes(".test."),
);

describe("qué puede invocar el navegador", () => {
  it("la lista de módulos no está vacía (no-vacuidad)", () => {
    expect(MODULOS.length).toBeGreaterThanOrEqual(8);
  });

  it('SOLO `acciones.ts` lleva "use server": el resto no es un endpoint', () => {
    // Un módulo con la directiva expone cada función exportada a cualquiera.
    // `registrarDecision(idAjeno, true)` sería suscribir a otra persona.
    const conDirectiva = MODULOS.filter((f) =>
      /^\s*["']use server["']/m.test(leer(`src/lib/recordatorios/${f}`)),
    );
    expect(conDirectiva).toEqual(["acciones.ts"]);
  });

  it("las acciones públicas no reciben el id de la persona como argumento", () => {
    const src = sinComentarios("src/lib/recordatorios/acciones.ts");
    expect(src).toMatch(/export async function guardarPreferenciaRecordatorios\(\s*optedIn: boolean,?\s*\)/);
    // La persona sale de la sesión.
    expect(src).toContain("supabase.auth.getUser()");
    expect(src).toMatch(/registrarDecision\(user\.id,/);
  });

  it("los módulos de servidor que tocan la base importan `server-only`", () => {
    for (const f of ["almacen.ts", "preferencias.ts"]) {
      expect(leer(`src/lib/recordatorios/${f}`), f).toMatch(/import "server-only"/);
    }
  });
});

describe("el consentimiento es un acto de la persona autenticada, no del registro", () => {
  it("el formulario y la acción de registro NO capturan consentimiento", () => {
    // Decisión de diseño: una casilla en el registro permite suscribir el correo
    // de OTRA persona (se registra su correo con la casilla marcada; ella
    // confirma después su cuenta y queda suscrita sin haberlo aceptado). El
    // interruptor del panel solo lo mueve quien tiene sesión.
    for (const rel of [
      "src/components/auth/register-form.tsx",
      "src/lib/auth/actions.ts",
      "src/components/auth/google-button.tsx",
    ]) {
      expect(sinComentarios(rel).toLowerCase(), rel).not.toMatch(/recordatorio|reminder|registrarDecision/);
    }
  });

  it("el interruptor empieza apagado salvo que ya haya decisión guardada", () => {
    const pagina = sinComentarios("src/app/dashboard/page.tsx");
    expect(pagina).toMatch(/inicial=\{typeof preferencia === "object" && preferencia\?\.optedIn === true\}/);
  });
});

describe("el cron falla cerrado y en orden", () => {
  const src = sinComentarios("src/app/api/cron/recordatorios/route.ts");

  it("primero el secreto del cron, luego la credencial, luego la configuración", () => {
    const iSecreto = src.indexOf("process.env.CRON_SECRET");
    const iCredencial = src.indexOf("credencialValida(request");
    const iConfig = src.indexOf("leerConfiguracion(");
    const iCorre = src.indexOf("ejecutarRecordatorios(");
    expect(iSecreto).toBeGreaterThan(-1);
    expect(iSecreto).toBeLessThan(iCredencial);
    expect(iCredencial).toBeLessThan(iConfig);
    expect(iConfig).toBeLessThan(iCorre);
  });

  it("compara la credencial en tiempo constante", () => {
    expect(src).toContain("timingSafeEqual");
  });

  it("es dinámica (nunca cacheada)", () => {
    expect(src).toMatch(/export const dynamic = "force-dynamic"/);
  });

  it("vercel.json programa EXACTAMENTE la ruta que existe", () => {
    const v = JSON.parse(leer("vercel.json")) as { crons: { path: string; schedule: string }[] };
    expect(v.crons).toHaveLength(1);
    expect(v.crons[0].path).toBe("/api/cron/recordatorios");
    expect(existsSync(join(RAIZ, "src/app/api/cron/recordatorios/route.ts"))).toBe(true);
    // Una vez al día: el producto promete «como máximo un correo al día».
    expect(v.crons[0].schedule).toMatch(/^\d+ \d+ \* \* \*$/);
  });
});

describe("el envío", () => {
  const src = sinComentarios("src/lib/recordatorios/ejecutar.ts");

  it("se RECLAMA antes de enviar (a lo sumo una vez, nunca duplicado)", () => {
    const iReclamo = src.indexOf("almacen.reclamar(");
    const iEnvio = src.indexOf("o.enviar(");
    expect(iReclamo).toBeGreaterThan(-1);
    expect(iReclamo).toBeLessThan(iEnvio);
  });

  it("el correo del envío sale de `armarCorreo`, que exige la baja", () => {
    expect(src).toContain("armarCorreo(");
    expect(src).toContain('"List-Unsubscribe-Post"');
  });

  it("la corrida en seco no pasa por reclamar ni enviar", () => {
    const iSeco = src.indexOf("if (o.seco || !o.enviar)");
    expect(iSeco).toBeGreaterThan(-1);
    expect(iSeco).toBeLessThan(src.indexOf("almacen.reclamar("));
  });
});

describe("nada de esto escribe a logs ni a la consola", () => {
  it("ningún módulo de recordatorios ni sus rutas usan `console.`", () => {
    // Una dirección de correo o una llave en un log de Vercel queda indexada.
    const archivos = [
      ...MODULOS.map((f) => `src/lib/recordatorios/${f}`),
      "src/app/api/cron/recordatorios/route.ts",
      "src/app/api/recordatorios/baja/route.ts",
      "src/app/recordatorios/baja/page.tsx",
    ];
    for (const rel of archivos) {
      expect(sinComentarios(rel), rel).not.toMatch(/console\./);
    }
  });
});

describe("la página de baja", () => {
  const src = sinComentarios("src/app/recordatorios/baja/page.tsx");
  it("no se indexa y no filtra el referrer (la URL lleva el id y el token)", () => {
    expect(src).toMatch(/robots:\s*\{\s*index:\s*false/);
    expect(src).toContain('referrer: "no-referrer"');
  });
  it("abrirla (GET) no da de baja: hace falta enviar el formulario", () => {
    expect(src).toContain("<form action={confirmar}");
    // La baja ocurre dentro de la acción del formulario, no en el render.
    const render = src.slice(src.indexOf("export default"));
    const iAccion = render.indexOf("confirmarBajaRecordatorios(");
    const iJsx = render.indexOf("return (");
    expect(iAccion).toBeGreaterThan(-1);
    expect(iAccion).toBeLessThan(iJsx); // definida dentro del componente, antes del JSX
    expect(render.slice(iJsx)).not.toContain("confirmarBajaRecordatorios(");
  });
});

describe("la migración", () => {
  const sql = leer("supabase/migrations/0061_recordatorios.sql");
  it("RLS activada y SIN policies en las dos tablas, con revoke explícito", () => {
    expect(sql).toMatch(/alter table public\.reminder_preferences enable row level security/);
    expect(sql).toMatch(/alter table public\.reminder_log enable row level security/);
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).toMatch(/revoke all on table public\.reminder_preferences from anon, authenticated/);
    expect(sql).toMatch(/revoke all on table public\.reminder_log from anon, authenticated/);
  });
  it("el registro es único por (invitación, tipo): lo que vuelve idempotente el envío", () => {
    expect(sql).toMatch(/unique \(invitation_id, kind\)/);
  });
  it("lleva su autocomprobación", () => {
    expect(sql).toMatch(/raise exception '%: RLS NO está activada'/);
  });
  it("los tipos del check coinciden con los del código", () => {
    for (const k of ["borrador_24h", "borrador_3d", "evento_7d"]) {
      expect(sql).toContain(`'${k}'`);
    }
  });
});
