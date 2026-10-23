import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Guardas ESTRUCTURALES de la Fase 3. `setPublished` y `createPlanCheckout` son
 * server actions que hablan con Supabase y Mercado Pago: no se pueden ejecutar
 * aquí. La decisión de dinero sí está probada (`decision-publicacion.test.ts`);
 * esto defiende que NADIE se salte esa decisión sin que una prueba lo note.
 *
 * Toda aserción se ancla a un trozo que se comprueba que EXISTE. Sin eso, un
 * ancla rota deja `expect("").not.toContain(...)` en verde mirando la nada (ya
 * pasó en `slot-de-media.test.ts`).
 */
const leer = (ruta: string) => readFileSync(ruta, "utf8");

function cuerpoDeFuncion(src: string, firma: string): string {
  const ini = src.indexOf(firma);
  expect(ini, `ancla no encontrada: ${firma}`).toBeGreaterThan(-1);
  // Hasta la siguiente declaración exportada o el final del archivo.
  const sig = src.indexOf("\nexport ", ini + firma.length);
  return src.slice(ini, sig === -1 ? undefined : sig);
}

describe("setPublished no puede volver a publicar gratis", () => {
  const actions = leer("src/lib/invitations/actions.ts");
  const setPublished = cuerpoDeFuncion(actions, "export async function setPublished(");

  it("el ancla existe y es la función entera, no un trozo vacío", () => {
    expect(setPublished.length).toBeGreaterThan(800);
    expect(setPublished).toContain("is_published: true");
  });

  it("NO escribe entitlements: la demo ya no se crea", () => {
    expect(setPublished).not.toContain("invitation_entitlements");
    expect(setPublished).not.toContain("upsert(");
    expect(setPublished).not.toContain("createAdminClient");
  });

  it("no usa el plan Free ni calcula una vigencia de demo", () => {
    expect(setPublished).not.toContain('getPlan("free")');
    expect(setPublished).not.toContain("resolveExpiry");
  });

  it("decide con `decidirPublicacion` y ANTES de escribir is_published", () => {
    const decide = setPublished.indexOf("decidirPublicacion(");
    const escribe = setPublished.indexOf("is_published: true");
    expect(decide).toBeGreaterThan(-1);
    expect(escribe).toBeGreaterThan(decide);
  });

  it("devuelve la señal autoritativa del contrato C1", () => {
    expect(setPublished).toContain("needsPayment: true");
    // Se conserva por compatibilidad hasta que nadie la lea.
    expect(setPublished).toContain("needsUpgrade: true");
  });

  it("el tipo del resultado expone needsPayment (para que el editor quite su cast)", () => {
    const tipo = actions.slice(
      actions.indexOf("export type SetPublishedResult"),
      actions.indexOf("export async function setPublished("),
    );
    expect(tipo).toContain("needsPayment?: boolean");
    expect(tipo).toContain("needsUpgrade?: boolean");
    expect(tipo).toContain("requiredPlan?: PlanCode");
  });
});

describe("el gate y el cobro comparten UNA regla de plan requerido", () => {
  const entitlements = leer("src/lib/billing/entitlements.ts");

  it("canPublishInvitation lee el contenido con `leerContenidoPublicable`", () => {
    const gate = cuerpoDeFuncion(entitlements, "export async function canPublishInvitation(");
    expect(gate).toContain("leerContenidoPublicable(");
    // Y no volvió a leer los módulos por su cuenta: dos lecturas pueden divergir.
    expect(gate).not.toContain('.from("invitation_modules")');
  });

  it("`planDePagoRequeridoParaInvitacion` parte de la MISMA lectura", () => {
    const f = cuerpoDeFuncion(entitlements, "export async function planDePagoRequeridoParaInvitacion(");
    expect(f).toContain("leerContenidoPublicable(");
    expect(f).toContain("planDePagoRequerido(");
  });

  it("el precio de la galería usa la regla compartida, no una copia", () => {
    const src = leer("src/lib/billing/precio-plantilla.ts");
    expect(src).toContain("planDePagoRequerido(");
    expect(src).not.toContain("isThemePackPremium");
  });
});

describe("createPlanCheckout no cobra un plan que no sirve", () => {
  const src = leer("src/lib/billing/actions.ts");
  const checkout = cuerpoDeFuncion(src, "export async function createPlanCheckout(");

  it("comprueba que el plan cubre la invitación ANTES de crear la orden", () => {
    const valida = checkout.indexOf("planCubreContenido(plan, contenido)");
    const creaOrden = checkout.indexOf('.from("orders")');
    expect(valida, "no se encontró la validación de cobertura").toBeGreaterThan(-1);
    expect(creaOrden, "no se encontró la creación de la orden").toBeGreaterThan(-1);
    expect(valida).toBeLessThan(creaOrden);
  });

  it("el monto sigue saliendo del precio del plan en el servidor, no del cliente", () => {
    expect(checkout).toContain("getEffectivePrice(plan)");
    expect(checkout).not.toMatch(/amount\s*[:=]\s*(?:opts|input|body)/);
  });
});
