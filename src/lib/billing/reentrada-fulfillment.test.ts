import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  puedeQuedarEntitlementPendiente,
  hayEntitlementPendiente,
} from "./reentrada-fulfillment";

/**
 * Dominio DINERO. El desenlace que esto impide es el peor del producto: el
 * cliente paga y no tiene acceso.
 *
 * El defecto: `isRedundantTransition` mira el estado de la ORDEN, pero el
 * trabajo pendiente puede ser el ENTITLEMENT. Como el `UPDATE` a `paid`
 * commitea ANTES de escribir el acceso, el reintento de Mercado Pago —que es
 * todo el argumento de seguridad del `ok: false`— entraba al guard y se cortaba
 * con `ok: true`. El rescate apuntaba a una puerta cerrada.
 */

const ORDEN_PAGADA_DE_PLAN = {
  nuevoEstado: "paid",
  productType: "plan",
  invitationId: "11111111-1111-1111-1111-111111111111",
  planId: "22222222-2222-2222-2222-222222222222",
};

describe("cuándo vale la pena mirar el entitlement antes de cortar", () => {
  it("una orden de plan recién pagada SÍ puede tener acceso pendiente", () => {
    expect(puedeQuedarEntitlementPendiente(ORDEN_PAGADA_DE_PLAN)).toBe(true);
  });

  it("un estado que no es `paid` no deja entitlement pendiente", () => {
    // Acotado a propósito: en `refunded` lo que podría faltar es despublicar,
    // y eso no deja a nadie sin lo que pagó (el gate público exige
    // `is_entitlement_active`).
    for (const nuevoEstado of ["refunded", "pending", "failed", "cancelled"]) {
      expect(
        puedeQuedarEntitlementPendiente({
          ...ORDEN_PAGADA_DE_PLAN,
          nuevoEstado,
        }),
      ).toBe(false);
    }
  });

  it("una orden que no es de plan no crea entitlement, así que no hay nada que reintentar", () => {
    expect(
      puedeQuedarEntitlementPendiente({
        ...ORDEN_PAGADA_DE_PLAN,
        productType: "credito",
      }),
    ).toBe(false);
  });

  it("sin invitación o sin plan no se puede escribir el acceso", () => {
    expect(
      puedeQuedarEntitlementPendiente({
        ...ORDEN_PAGADA_DE_PLAN,
        invitationId: null,
      }),
    ).toBe(false);
    expect(
      puedeQuedarEntitlementPendiente({
        ...ORDEN_PAGADA_DE_PLAN,
        planId: null,
      }),
    ).toBe(false);
  });
});

describe("qué cuenta como trabajo pendiente, con el entitlement ya leído", () => {
  it("sin fila es trabajo pendiente: es el caso «pagó y no tiene acceso»", () => {
    expect(hayEntitlementPendiente(null)).toBe(true);
  });

  it("una fila que no está `active` tampoco da acceso", () => {
    expect(hayEntitlementPendiente({ status: "revoked" })).toBe(true);
    expect(hayEntitlementPendiente({ status: "pending" })).toBe(true);
    expect(hayEntitlementPendiente({ status: null })).toBe(true);
  });

  it("una fila `active` NO es trabajo pendiente, aunque sea de otro plan", () => {
    // Es la decisión deliberada de `decidirEntitlement` de no degradar un plan
    // superior. Reentrar aquí volvería a intentar justo lo que ya se decidió
    // no hacer.
    expect(hayEntitlementPendiente({ status: "active" })).toBe(false);
  });
});

/**
 * Y el cableado. Lo de arriba es puro; esto fija que `fulfillment.ts` de verdad
 * lo consulta ANTES de cortar por idempotencia — sin esto, toda la lógica de
 * arriba sería decorativa. Se leen los comentarios fuera para que una aserción
 * no pueda anclar en la prosa que explica el arreglo.
 */
const SRC = readFileSync(new URL("./fulfillment.ts", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n]*/g, "");

describe("el guard de idempotencia no corta a ciegas", () => {
  const i = SRC.indexOf("isRedundantTransition(order.status");
  const j = SRC.indexOf("const { data: ordenTocada", i);

  it("el tramo del guard existe y llega hasta el update de la orden", () => {
    expect(i, "no se encontró el guard de idempotencia").toBeGreaterThan(-1);
    expect(j, "no se encontró el update de la orden").toBeGreaterThan(i);
  });

  const bloque = SRC.slice(i, j);

  it("consulta el entitlement dentro del guard, antes del corte", () => {
    expect(bloque).toMatch(/puedeQuedarEntitlementPendiente\(/);
    expect(bloque).toMatch(/hayEntitlementPendiente\(/);
    expect(bloque).toMatch(/from\("invitation_entitlements"\)/);
  });

  it("el `ok: true` idempotente está DESPUÉS de decidir, no antes", () => {
    const corte = bloque.indexOf("idempotent: true");
    const decision = bloque.indexOf("hayEntitlementPendiente(");
    expect(decision).toBeGreaterThan(-1);
    expect(corte).toBeGreaterThan(decision);
  });

  it("un fallo al leer el entitlement es fail-closed, no un corte alegre", () => {
    expect(bloque).toMatch(/ok:\s*false[\s\S]*reentrada_lookup_failed/);
  });
});
