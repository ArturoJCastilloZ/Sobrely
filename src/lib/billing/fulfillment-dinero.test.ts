import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Los dos defectos de dinero del fulfillment. No se pueden probar por
 * comportamiento —`fulfillment.ts` es `server-only` y habla con la base de
 * PRODUCCIÓN— así que se fija la FORMA de las dos decisiones que cuestan
 * dinero, ancladas al nodo sintáctico y con los comentarios quitados.
 *
 * La lógica que SÍ es pura (no degradar un plan superior) está probada por
 * comportamiento en `no-degradar-entitlement.test.ts`.
 */

const SRC = readFileSync(new URL("./fulfillment.ts", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n]*/g, "");

/** Recorta del ancla al cierre, y falla si no encuentra alguno. */
function tramo(desde: string, hasta: string): string {
  const i = SRC.indexOf(desde);
  expect(i, `no se encontró el ancla «${desde}»`).toBeGreaterThan(-1);
  const j = SRC.indexOf(hasta, i);
  expect(j, `no se encontró el cierre «${hasta}»`).toBeGreaterThan(i);
  return SRC.slice(i, j + hasta.length);
}

describe("un fallo al actualizar la orden NO se reporta como éxito", () => {
  const bloque = tramo("const { data: ordenTocada", "order_update_sin_filas");

  it("sólo el 23505 se trata como duplicado benigno", () => {
    // Antes cualquier `updErr` devolvía `ok: true`, el webhook respondía 200,
    // MP dejaba de reintentar y la orden se quedaba en `pending`: pagado sin
    // acceso. Es el patrón que el propio archivo ya usaba bien más abajo.
    expect(bloque).toMatch(/updErr\.code === "23505"/);
    const i23505 = bloque.indexOf('updErr.code === "23505"');
    const tras = bloque.slice(i23505);
    // El `ok: true` tiene que estar DENTRO de la rama del 23505, y el `ok:
    // false` fuera de ella.
    expect(tras).toMatch(/ok:\s*true/);
    expect(bloque).toMatch(/ok:\s*false[\s\S]*order_update_failed/);
  });

  it("y un update de 0 filas también falla", () => {
    expect(bloque).toMatch(/ordenTocada\.length === 0/);
    expect(bloque).toMatch(/\.select\("id"\)/);
  });
});

describe("un reembolso sólo revoca el acceso de SU propio plan", () => {
  const bloque = tramo('newStatus === "refunded" &&', "orderStatus: \"refunded\", entitlementActivated: false };");

  it("filtra por plan_id, no sólo por invitation_id", () => {
    // EL defecto: reembolsar el plan barato tumbaba la invitación pagada con el
    // caro, y encima la despublicaba.
    const revoke = bloque.slice(bloque.indexOf('.from("invitation_entitlements")'));
    expect(revoke).toMatch(/\.eq\("invitation_id",\s*order\.invitation_id\)/);
    expect(revoke).toMatch(/\.eq\("plan_id",\s*order\.plan_id\)/);
    expect(revoke).toMatch(/\.eq\("status",\s*"active"\)/);
  });

  it("sin plan_id no revoca nada", () => {
    // Quitarle el acceso a quien sí pagó es peor que dejar un reembolso sin
    // reflejar: lo segundo un humano lo ve y lo arregla.
    expect(bloque).toMatch(/if \(!order\.plan_id\)/);
    expect(bloque).toMatch(/refund_sin_plan_id_revision_manual/);
  });

  it("y NO despublica si no revocó nada", () => {
    // La despublicación tiene que venir DESPUÉS del early-return de «revocados
    // vacío»; si no, se despublicaría una invitación cuyo acceso pagó otra orden.
    const iVacio = bloque.indexOf("revocados.length === 0");
    const iDespublica = bloque.indexOf("is_published: false");
    expect(iVacio).toBeGreaterThan(-1);
    expect(iDespublica).toBeGreaterThan(iVacio);
    expect(bloque).toMatch(/entitlement_de_otro_plan_no_se_revoca/);
  });
});

describe("el entitlement no se escribe a ciegas", () => {
  it("la decisión de no degradar se delega a la función pura", () => {
    expect(SRC).toMatch(/decidirEntitlement\(/);
    expect(SRC).toMatch(/decision\.accion === "no-degradar"/);
  });

  it("y un upsert de 0 filas hace fallar el webhook", () => {
    // Cobrado y sin acceso es el peor desenlace: mejor que MP reintente.
    const bloque = tramo("const { data: entFilas", "entitlement_upsert_sin_filas");
    expect(bloque).toMatch(/\.select\("invitation_id"\)/);
    expect(bloque).toMatch(/entFilas\.length === 0/);
    expect(bloque).toMatch(/ok:\s*false/);
  });
});

describe("la ruta del webhook traduce el fallo a un reintento", () => {
  it("`ok: false` produce 500, que es lo que hace que MP reintente", () => {
    const ruta = readFileSync(
      new URL("../../app/api/webhooks/mercadopago/route.ts", import.meta.url),
      "utf8",
    ).replace(/\/\/[^\n]*/g, "");
    // Sin esto, todo lo de arriba es decorativo: `ok: false` tiene que acabar
    // en un status que MP reintente.
    const i = ruta.indexOf("!result.ok");
    expect(i).toBeGreaterThan(-1);
    expect(ruta.slice(i, i + 260)).toMatch(/status:\s*500/);
  });
});
