/**
 * Línea base del embudo, medida contra la BD. SOLO LECTURA (únicamente GET) y
 * solo AGREGADOS: no imprime ids, correos ni nombres.
 *
 * Uso:
 *   node --env-file=.env.local scripts/medir-embudo.mjs
 *
 * Por qué existe: el plan del embudo (FUNNEL_PLAN.md, Fase 0) cambia precios y
 * auth, y sin una línea base nadie sabría si mejoró algo. Se vuelve a correr
 * después de cada fase y se compara contra la tabla de FUNNEL_PLAN §Fase 0.
 *
 * Qué cubre sin instrumentar nada: registro (`profiles`), plantilla elegida
 * (`invitations.template_id`), checkout iniciado y pago (`orders`), publicada
 * (`invitation_entitlements`). Las vistas salen de Vercel Web Analytics por ruta.
 *
 * Trampa conocida: la llave `sb_secret_` no es un JWT. Se manda SOLO como
 * `apikey`; mandarla también como `Authorization: Bearer` devuelve 401.
 */
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
}

async function leer(path) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const pedir = () =>
      fetch(`${base}/rest/v1/${path}&limit=1000&offset=${desde}`, {
        method: "GET",
        headers: { apikey: key },
      });
    let r = await pedir();
    // Se vieron 401 SUELTOS que no se reprodujeron (6 de 6 corridas después
    // salieron bien, con las mismas variables). Causa NO establecida: un
    // reintento, dicho en voz alta, en vez de aparentar que se entiende.
    if (r.status === 401) {
      console.error(`aviso: 401 transitorio en ${path.split("?")[0]}, reintentando`);
      r = await pedir();
    }
    if (!r.ok) throw new Error(`${path.split("?")[0]}: HTTP ${r.status}`);
    const lote = await r.json();
    filas.push(...lote);
    if (lote.length < 1000) break;
  }
  return filas;
}

const dia = 86_400_000;
const ahora = Date.now();
const hace = (fecha) => Math.round((ahora - new Date(fecha).getTime()) / dia);
const cuenta = (xs, f) =>
  xs.reduce((m, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {});

const [perfiles, invs, ents, planes, orders, invitados, rsvps] = await Promise.all([
  leer("profiles?select=id"),
  leer("invitations?select=id,user_id,template_id,is_published,event_date,created_at"),
  leer("invitation_entitlements?select=invitation_id,plan_id,status,expires_at"),
  leer("plans?select=id,code"),
  leer("orders?select=status,plan_id,invitation_id,created_at"),
  leer("invitation_guests?select=invitation_id"),
  leer("rsvp_responses?select=invitation_id"),
]);

const codigo = new Map(planes.map((p) => [p.id, p.code]));
const entDe = new Map(ents.map((e) => [e.invitation_id, e]));
const vigente = (e) =>
  e.status === "active" && (!e.expires_at || new Date(e.expires_at).getTime() > ahora);
const conInvitados = cuenta(invitados, (g) => g.invitation_id);
const conRsvp = cuenta(rsvps, (r) => r.invitation_id);

const usuariosConInv = new Set(invs.map((i) => i.user_id));
const publicadas = invs.filter((i) => i.is_published);
const demosVivas = publicadas.filter((i) => {
  const e = entDe.get(i.id);
  return e && codigo.get(e.plan_id) === "free" && vigente(e);
});

console.log(`host: ${new URL(base).hostname}  ·  medido ${new Date(ahora).toISOString()}`);
console.log("\n== EMBUDO");
console.log(`  cuentas (profiles)                       ${perfiles.length}`);
console.log(`  ... que crearon ≥1 invitación             ${usuariosConInv.size}  (${perfiles.length - usuariosConInv.size} NUNCA crearon una)`);
console.log(`  invitaciones creadas                      ${invs.length}  (desde plantilla: ${invs.filter((i) => i.template_id).length} · en blanco: ${invs.filter((i) => !i.template_id).length})`);
console.log(`  publicadas ahora (is_published)           ${publicadas.length}`);
console.log(`  alguna vez con entitlement                ${ents.length}  (${JSON.stringify(cuenta(ents, (e) => `${codigo.get(e.plan_id) ?? "?"}/${e.status}`))})`);
console.log(`  órdenes por estado                        ${JSON.stringify(cuenta(orders, (o) => o.status))}`);

console.log("\n== DEMOS (lo que la Fase 3 quita)");
console.log(`  demo Free VIGENTE ahora                   ${demosVivas.length}`);
console.log(`  ... con invitados cargados                ${demosVivas.filter((i) => conInvitados[i.id] > 0).length}`);
console.log(`  ... con respuestas RSVP                   ${demosVivas.filter((i) => conRsvp[i.id] > 0).length}`);
const freeEnts = ents.filter((e) => codigo.get(e.plan_id) === "free");
console.log(`  demos Free alguna vez (entitlements)      ${freeEnts.length}  · vencimientos hace: ${freeEnts.map((e) => (e.expires_at ? `${hace(e.expires_at)} d` : "sin fecha")).join(", ") || "—"}`);
console.log(`  publicadas SIN entitlement (comp/admin)   ${publicadas.filter((i) => !entDe.get(i.id)).length}`);

console.log("\n== ÓRDENES (¿alguna huérfana?)");
const huerfanas = orders.filter((o) => o.status === "paid" && !o.invitation_id);
console.log(`  pagadas con invitation_id NULO            ${huerfanas.length}  (su invitación se borró; el entitlement cae en cascada)`);
console.log(`  antigüedad de las órdenes (días)          ${orders.length ? `${Math.min(...orders.map((o) => hace(o.created_at)))}–${Math.max(...orders.map((o) => hace(o.created_at)))}` : "—"}`);
