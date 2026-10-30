/**
 * Ataque a la frontera «la lista de invitados es de Premium» (migración 0071).
 *
 *   node scripts/atacar-rls-lista-invitados.mts
 *
 * SOLO LOCAL. Lee `.env.dev.local` (nunca `.env.local`, que apunta a
 * producción) y ABORTA si `NEXT_PUBLIC_SUPABASE_URL` no es 127.0.0.1/localhost:
 * siembra un usuario de prueba, invitaciones y entitlements, y los borra al
 * final pase lo que pase.
 *
 * POR QUÉ EXISTE
 * El gate de la lista (`canManageGuestList`, `canUseGuestManagement`,
 * `setPublished`) vive en el servidor. Pero el dueño tiene su JWT y la llave
 * pública: con PostgREST directo podía hacer PATCH de `rsvp_mode` /
 * `is_published` / `checked_in_at` e INSERT de invitados sin pasar por las
 * server actions, saltándose el cobro de Premium. Este script ataca la API con
 * la llave pública y el JWT del dueño, caso por caso, INCLUIDOS los legítimos:
 * un candado que también rompe el uso normal no es un candado, es un bug.
 *
 * El veredicto de cada caso se lee de la BASE (service_role), no solo del
 * código HTTP: un PATCH que responde 200 con 0 filas no prueba nada.
 *
 * Sale con código 1 si algún caso no da lo esperado.
 */

import { randomBytes } from "node:crypto";

process.loadEnvFile(".env.dev.local");

const URL_BASE = must("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
const ANON = must("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const SERVICE = must("SUPABASE_SERVICE_ROLE_KEY");

{
  const host = new URL(URL_BASE).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    console.error(`ABORTA: la URL no es local (${host}). Este script solo corre contra Supabase local.`);
    process.exit(2);
  }
}

function must(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`falta ${k} en .env.dev.local`);
  return v;
}

type Res = { status: number; body: unknown };

async function http(
  ruta: string,
  o: { key: string; token?: string; metodo?: string; cuerpo?: unknown; prefer?: string },
): Promise<Res> {
  const h: Record<string, string> = {
    apikey: o.key,
    Authorization: `Bearer ${o.token || o.key}`,
    "Content-Type": "application/json",
  };
  if (o.prefer) h.Prefer = o.prefer;
  const r = await fetch(`${URL_BASE}${ruta}`, {
    method: o.metodo ?? "GET",
    headers: h,
    body: o.cuerpo === undefined ? undefined : JSON.stringify(o.cuerpo),
  });
  const texto = await r.text();
  let body: unknown = texto;
  try {
    body = texto ? JSON.parse(texto) : null;
  } catch {
    /* deja el texto */
  }
  return { status: r.status, body };
}

const svc = (ruta: string, metodo = "GET", cuerpo?: unknown) =>
  http(`/rest/v1/${ruta}`, { key: SERVICE, metodo, cuerpo, prefer: "return=representation" });

async function svcOk(ruta: string, metodo = "GET", cuerpo?: unknown): Promise<Record<string, unknown>[]> {
  const r = await svc(ruta, metodo, cuerpo);
  if (r.status >= 300) throw new Error(`siembra falló ${metodo} ${ruta}: ${r.status} ${JSON.stringify(r.body)}`);
  return (r.body ?? []) as Record<string, unknown>[];
}

// --------------------------------------------------------------------------
// Control positivo: la llave pública SÍ lee `templates` (pública). Sin esto,
// una llave rota haría que todo saliera «denegado» y el informe mentiría.
// --------------------------------------------------------------------------
{
  const r = await http("/rest/v1/templates?select=id&limit=1", { key: ANON });
  if (r.status !== 200 || !Array.isArray(r.body) || r.body.length === 0) {
    console.error("ABORTA: el control positivo falló (la llave pública no lee templates).", r.status);
    process.exit(3);
  }
}

// --------------------------------------------------------------------------
// Usuario de prueba desechable (local). La contraseña se genera aquí y nunca
// se imprime.
// --------------------------------------------------------------------------
const sufijo = randomBytes(4).toString("hex");
const email = `ataque-lista-${sufijo}@sobrely.test`;
const password = randomBytes(18).toString("base64url");

const creado = await http("/auth/v1/admin/users", {
  key: SERVICE,
  metodo: "POST",
  cuerpo: { email, password, email_confirm: true },
});
if (creado.status >= 300) throw new Error(`no se creó el usuario: ${creado.status}`);
const USER_ID = (creado.body as { id: string }).id;

const login = await http("/auth/v1/token?grant_type=password", {
  key: ANON,
  metodo: "POST",
  cuerpo: { email, password },
});
const TOKEN = (login.body as { access_token?: string }).access_token;
if (!TOKEN) throw new Error(`no se obtuvo sesión: ${login.status}`);

const dueño = (ruta: string, metodo = "GET", cuerpo?: unknown) =>
  http(`/rest/v1/${ruta}`, { key: ANON, token: TOKEN, metodo, cuerpo, prefer: "return=representation" });

const planes = await svcOk("plans?select=id,code");
const planId = (code: string) => {
  const p = planes.find((x) => x.code === code);
  if (!p) throw new Error(`no existe el plan ${code}`);
  return p.id as string;
};

type Plan = "free" | "esencial" | "celebracion" | "premium";

/** Siembra (service_role) una invitación con su plan, estado y modo. */
async function sembrarInvitacion(plan: Plan, publicada: boolean, modo: "open" | "guest_list") {
  const [inv] = await svcOk("invitations", "POST", {
    user_id: USER_ID,
    title: `ataque ${plan} ${publicada ? "pub" : "borr"} ${modo}`,
    slug: `ataque-lista-${sufijo}-${randomBytes(3).toString("hex")}`,
    is_published: publicada,
    status: publicada ? "published" : "draft",
    rsvp_mode: modo,
  });
  if (plan !== "free") await sembrarPlan(inv.id as string, plan);
  return inv.id as string;
}

async function sembrarPlan(invitationId: string, plan: Plan) {
  await svcOk("invitation_entitlements", "POST", {
    invitation_id: invitationId,
    plan_id: planId(plan),
    status: "active",
    starts_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  });
}

async function sembrarInvitado(invitationId: string) {
  const [g] = await svcOk("invitation_guests", "POST", { invitation_id: invitationId, name: "Invitado sembrado" });
  return g as { id: string; access_token: string };
}

const leer = async (tabla: string, id: string, cols: string) =>
  (await svcOk(`${tabla}?id=eq.${id}&select=${cols}`))[0];

// --------------------------------------------------------------------------
// Casos
// --------------------------------------------------------------------------
type Caso = { nombre: string; esperado: "RECHAZADO" | "PASA"; correr: () => Promise<{ paso: boolean; detalle: string }> };
const casos: Caso[] = [];
const ataque = (nombre: string, correr: Caso["correr"]) => casos.push({ nombre, esperado: "RECHAZADO", correr });
const legitimo = (nombre: string, correr: Caso["correr"]) => casos.push({ nombre, esperado: "PASA", correr });

const err = (r: Res) => {
  const b = r.body as { code?: string; message?: string } | null;
  return `${r.status}${b && typeof b === "object" && "message" in b ? ` ${b.code ?? ""} ${b.message}` : ""}`;
};

/** PATCH a la invitación como dueño; el veredicto se lee de la base. */
async function patchInvitacion(id: string, cambio: Record<string, unknown>) {
  const r = await dueño(`invitations?id=eq.${id}`, "PATCH", cambio);
  const fila = await leer("invitations", id, Object.keys(cambio).join(","));
  const paso = Object.entries(cambio).every(([k, v]) => fila[k] === v);
  return { paso, detalle: err(r) };
}

for (const plan of ["esencial", "celebracion", "free"] as const) {
  ataque(`${plan} PUBLICADA abierta → PATCH rsvp_mode=guest_list`, async () => {
    const id = await sembrarInvitacion(plan, true, "open");
    return patchInvitacion(id, { rsvp_mode: "guest_list" });
  });
}

for (const plan of ["free", "esencial", "celebracion"] as const) {
  ataque(`${plan} BORRADOR en guest_list → PATCH is_published=true`, async () => {
    const id = await sembrarInvitacion(plan, false, "guest_list");
    return patchInvitacion(id, { is_published: true, status: "published" });
  });
}

ataque("PATCH de un solo golpe: borrador abierto esencial → publicada + guest_list", async () => {
  const id = await sembrarInvitacion("esencial", false, "open");
  return patchInvitacion(id, { is_published: true, rsvp_mode: "guest_list" });
});

ataque("INSERT de una invitación ya publicada en guest_list (sin plan)", async () => {
  const slug = `ataque-lista-${sufijo}-ins`;
  const r = await dueño("invitations", "POST", {
    user_id: USER_ID,
    title: "ataque insert",
    slug,
    is_published: true,
    status: "published",
    rsvp_mode: "guest_list",
  });
  const filas = await svcOk(`invitations?slug=eq.${slug}&select=id`);
  return { paso: filas.length > 0, detalle: err(r) };
});

for (const plan of ["esencial", "celebracion"] as const) {
  ataque(`INSERT invitado en invitación ${plan} PUBLICADA`, async () => {
    const id = await sembrarInvitacion(plan, true, "open");
    const r = await dueño("invitation_guests", "POST", { invitation_id: id, name: "Colado" });
    const filas = await svcOk(`invitation_guests?invitation_id=eq.${id}&select=id`);
    return { paso: filas.length > 0, detalle: err(r) };
  });
}

ataque("PATCH nombre de invitado en invitación esencial PUBLICADA", async () => {
  const id = await sembrarInvitacion("esencial", true, "open");
  const g = await sembrarInvitado(id);
  const r = await dueño(`invitation_guests?id=eq.${g.id}`, "PATCH", { name: "Renombrado" });
  return { paso: (await leer("invitation_guests", g.id, "name")).name === "Renombrado", detalle: err(r) };
});

for (const [plan, publicada] of [["esencial", true], ["free", false], ["celebracion", false]] as const) {
  ataque(`PATCH checked_in_at en invitado de ${plan} ${publicada ? "PUBLICADA" : "BORRADOR"}`, async () => {
    const id = await sembrarInvitacion(plan, publicada, "open");
    const g = await sembrarInvitado(id);
    const r = await dueño(`invitation_guests?id=eq.${g.id}`, "PATCH", { checked_in_at: new Date().toISOString() });
    return { paso: (await leer("invitation_guests", g.id, "checked_in_at")).checked_in_at !== null, detalle: err(r) };
  });
}

ataque("INSERT invitado YA con checked_in_at en borrador free", async () => {
  const id = await sembrarInvitacion("free", false, "guest_list");
  const r = await dueño("invitation_guests", "POST", { invitation_id: id, name: "Ingresado", checked_in_at: new Date().toISOString() });
  const filas = await svcOk(`invitation_guests?invitation_id=eq.${id}&select=id`);
  return { paso: filas.length > 0, detalle: err(r) };
});

ataque("PATCH invitation_id: mover un invitado de un borrador a una esencial PUBLICADA", async () => {
  const borrador = await sembrarInvitacion("free", false, "guest_list");
  const publicada = await sembrarInvitacion("esencial", true, "open");
  const g = await sembrarInvitado(borrador);
  const r = await dueño(`invitation_guests?id=eq.${g.id}`, "PATCH", { invitation_id: publicada });
  return { paso: (await leer("invitation_guests", g.id, "invitation_id")).invitation_id === publicada, detalle: err(r) };
});

// ---- Legítimos ------------------------------------------------------------

legitimo("borrador free: activa guest_list e inserta invitados", async () => {
  const id = await sembrarInvitacion("free", false, "open");
  const a = await patchInvitacion(id, { rsvp_mode: "guest_list" });
  const r = await dueño("invitation_guests", "POST", [
    { invitation_id: id, name: "Ana" },
    { invitation_id: id, name: "Beto" },
  ]);
  const filas = await svcOk(`invitation_guests?invitation_id=eq.${id}&select=id`);
  return { paso: a.paso && filas.length === 2, detalle: `${a.detalle} / ${err(r)}` };
});

legitimo("borrador esencial: edita un invitado", async () => {
  const id = await sembrarInvitacion("esencial", false, "guest_list");
  const g = await sembrarInvitado(id);
  const r = await dueño(`invitation_guests?id=eq.${g.id}`, "PATCH", { name: "Editado", invited_at: new Date().toISOString() });
  return { paso: (await leer("invitation_guests", g.id, "name")).name === "Editado", detalle: err(r) };
});

legitimo("premium BORRADOR en guest_list → publica", async () => {
  const id = await sembrarInvitacion("premium", false, "guest_list");
  return patchInvitacion(id, { is_published: true, status: "published" });
});

legitimo("premium PUBLICADA: inserta, hace check-in y lo revierte", async () => {
  const id = await sembrarInvitacion("premium", true, "guest_list");
  const r1 = await dueño("invitation_guests", "POST", { invitation_id: id, name: "Carla" });
  const g = ((r1.body as Record<string, unknown>[] | null) ?? [])[0] as { id: string } | undefined;
  if (!g) return { paso: false, detalle: `insert ${err(r1)}` };
  const r2 = await dueño(`invitation_guests?id=eq.${g.id}`, "PATCH", { checked_in_at: new Date().toISOString() });
  const marcado = (await leer("invitation_guests", g.id, "checked_in_at")).checked_in_at !== null;
  const r3 = await dueño(`invitation_guests?id=eq.${g.id}`, "PATCH", { checked_in_at: null });
  const revertido = (await leer("invitation_guests", g.id, "checked_in_at")).checked_in_at === null;
  return { paso: marcado && revertido, detalle: `${err(r1)} / ${err(r2)} / ${err(r3)}` };
});

legitimo("premium PUBLICADA en guest_list: edita el título", async () => {
  const id = await sembrarInvitacion("premium", true, "guest_list");
  return patchInvitacion(id, { title: "Título nuevo" });
});

legitimo("premium PUBLICADA en guest_list → vuelve a open", async () => {
  const id = await sembrarInvitacion("premium", true, "guest_list");
  return patchInvitacion(id, { rsvp_mode: "open" });
});

legitimo("borrador free en guest_list → vuelve a open", async () => {
  const id = await sembrarInvitacion("free", false, "guest_list");
  return patchInvitacion(id, { rsvp_mode: "open" });
});

legitimo("esencial BORRADOR abierta → publica en abierto", async () => {
  const id = await sembrarInvitacion("esencial", false, "open");
  return patchInvitacion(id, { is_published: true, status: "published" });
});

legitimo("despublica una invitación (cualquier plan)", async () => {
  const id = await sembrarInvitacion("esencial", true, "open");
  return patchInvitacion(id, { is_published: false, status: "draft" });
});

legitimo("borra un invitado de una esencial PUBLICADA (salida de la lista)", async () => {
  const id = await sembrarInvitacion("esencial", true, "open");
  const g = await sembrarInvitado(id);
  const r = await dueño(`invitation_guests?id=eq.${g.id}`, "DELETE");
  const filas = await svcOk(`invitation_guests?id=eq.${g.id}&select=id`);
  return { paso: filas.length === 0, detalle: err(r) };
});

legitimo("service_role (fulfillment): publica guest_list tras activar Premium", async () => {
  const id = await sembrarInvitacion("free", false, "guest_list");
  await sembrarPlan(id, "premium");
  const r = await svc(`invitations?id=eq.${id}`, "PATCH", { is_published: true, status: "published" });
  const fila = await leer("invitations", id, "is_published");
  return { paso: fila.is_published === true, detalle: err(r) };
});

legitimo("RPC pública get_guest_invitation + respond_guest (premium publicada)", async () => {
  const id = await sembrarInvitacion("premium", true, "guest_list");
  const g = await sembrarInvitado(id);
  const r1 = await http("/rest/v1/rpc/get_guest_invitation", { key: ANON, metodo: "POST", cuerpo: { p_token: g.access_token } });
  const r2 = await http("/rest/v1/rpc/respond_guest", {
    key: SERVICE,
    metodo: "POST",
    cuerpo: { p_token: g.access_token, p_confirmed_count: 1, p_message: null, p_answers: {} },
  });
  const estado = (await leer("invitation_guests", g.id, "status")).status;
  const vio = r1.status === 200 && r1.body !== null && typeof r1.body === "object";
  return { paso: vio && estado === "confirmed", detalle: `${err(r1)} / ${err(r2)} / status=${estado}` };
});

// --------------------------------------------------------------------------
let fallos = 0;
try {
  for (const c of casos) {
    let resultado: string;
    let detalle = "";
    try {
      const r = await c.correr();
      resultado = r.paso ? "PASA" : "RECHAZADO";
      detalle = r.detalle;
    } catch (e) {
      resultado = "ERROR";
      detalle = (e as Error).message;
    }
    const ok = resultado === c.esperado;
    if (!ok) fallos++;
    console.log(`${ok ? "OK  " : "FALLA"} [${c.esperado === "PASA" ? "legítimo" : "ataque  "}] ${c.nombre} → ${resultado} (${detalle})`);
  }
} finally {
  await svc(`invitations?user_id=eq.${USER_ID}`, "DELETE");
  await http(`/auth/v1/admin/users/${USER_ID}`, { key: SERVICE, metodo: "DELETE" });
}

console.log(`\n${casos.length - fallos}/${casos.length} casos como se esperaba.`);
process.exit(fallos === 0 ? 0 : 1);
