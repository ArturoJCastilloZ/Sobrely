import { describe, expect, it } from "vitest";
import {
  ETIQUETA_DE_ESTADO,
  estadoDeInvitacion,
  type EstadoDeInvitacion,
} from "@/components/dashboard/invitation-card";

/**
 * El panel del anfitrión tiene que decir la VERDAD: una invitación con
 * `is_published = true` cuyo entitlement caducó no la sirve
 * `get_public_invitation`, así que decirle «Publicada» al anfitrión le hace
 * creer que su enlace funciona.
 *
 * Casos anclados a producción (medido el 2026-09-09): de 7 publicadas, 2
 * (`invitacion-i7t0nb`, `invitacion-ol3b6q`) tienen `is_entitlement_active =
 * false` con demo Free vencida el 2026-08-26 → deben salir «Caducada».
 */
describe("estadoDeInvitacion", () => {
  it("publicada con entitlement vigente → publicada", () => {
    expect(
      estadoDeInvitacion({ isPublished: true, entitlementActive: true }),
    ).toBe("publicada");
  });

  it("publicada con entitlement CADUCADO → caducada", () => {
    expect(
      estadoDeInvitacion({ isPublished: true, entitlementActive: false }),
    ).toBe("caducada");
  });

  it("sin publicar → borrador, aunque el entitlement esté vigente", () => {
    expect(
      estadoDeInvitacion({ isPublished: false, entitlementActive: true }),
    ).toBe("borrador");
  });

  it("sin publicar y sin entitlement → borrador, NO caducada", () => {
    // Un borrador nunca es «Caducada»: nadie tiene su enlace todavía, así que
    // no hay nada roto que avisar.
    expect(
      estadoDeInvitacion({ isPublished: false, entitlementActive: false }),
    ).toBe("borrador");
  });

  it("vigencia irresoluble (null) NO degrada a caducada", () => {
    // `null` = la RPC falló. Marcar «Caducada» una invitación quizá viva es una
    // falsa alarma; solo el `false` explícito de la BD degrada.
    expect(
      estadoDeInvitacion({ isPublished: true, entitlementActive: null }),
    ).toBe("publicada");
  });

  it("una cuenta comped sale publicada: el comp entra por la RPC como true", () => {
    // `is_entitlement_active` (0013) devuelve true si el dueño es admin, aunque
    // NO exista fila en `invitation_entitlements`. Por eso esta función nunca
    // mira la tabla: si mirara, el admin caería en «Caducada».
    expect(
      estadoDeInvitacion({ isPublished: true, entitlementActive: true }),
    ).toBe("publicada");
  });

  it("las tres etiquetas están en español y son distintas", () => {
    const estados: EstadoDeInvitacion[] = [
      "borrador",
      "publicada",
      "caducada",
    ];
    const etiquetas = estados.map((e) => ETIQUETA_DE_ESTADO[e]);
    expect(etiquetas).toEqual(["Borrador", "Publicada", "Caducada"]);
    expect(new Set(etiquetas).size).toBe(3);
  });
});
