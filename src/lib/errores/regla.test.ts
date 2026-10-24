import { describe, expect, it } from "vitest";
import {
  LARGO_MENSAJE,
  clasificarRuta,
  debeAlertar,
  esRuidoDeCliente,
  filtrarContexto,
  huellaDeError,
  limpiarMensaje,
} from "./regla";

describe("limpiarMensaje", () => {
  it.each([
    ["duplicate key value violates unique constraint (ana.lopez@gmail.com)", "ana.lopez@gmail.com"],
    ["fetch failed Authorization: Bearer abc123def456ghi789", "abc123def456ghi789"],
    ["token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.firmafirmafirma", "eyJhbGciOiJIUzI1NiJ9"],
    ["MP rechazó con APP_USR-1234567890-abcdef-secreto", "APP_USR-1234567890"],
    ["connect postgres://postgres:Sup3rClave@db.host.co:5432/postgres", "Sup3rClave"],
    ["no se pudo avisar al +52 81 1234 5678", "1234 5678"],
    ["GET https://api.x.com/pay?access_token=zzz999&email=a@b.com falló", "zzz999"],
    ["llave sb_secret_abcdefghijklmnop", "abcdefghijklmnop"],
    ["cadena opaca A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8", "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8"],
  ])("no deja pasar %s", (entrada, secreto) => {
    const limpio = limpiarMensaje(entrada);
    expect(limpio).not.toContain(secreto);
  });

  it("reemplaza los uuid por <id> y conserva el resto del mensaje", () => {
    expect(limpiarMensaje("orden 6f1b2c3d-0000-4000-8000-123456789abc sin entitlement")).toBe(
      "orden <id> sin entitlement",
    );
  });

  it("acepta Error y valores raros, quita saltos y recorta", () => {
    expect(limpiarMensaje(new Error("falló\n\tla cosa"))).toBe("falló la cosa");
    expect(limpiarMensaje(undefined)).toBe("undefined");
    const largo = limpiarMensaje("palabra ".repeat(200));
    expect(largo.length).toBeLessThanOrEqual(LARGO_MENSAJE);
    expect(largo.endsWith("…")).toBe(true);
  });
});

describe("huellaDeError", () => {
  it("agrupa el mismo error aunque cambien los números", () => {
    expect(huellaDeError("webhook_pago", "orden 123 falló en 45 ms")).toBe(
      huellaDeError("webhook_pago", "orden 999 falló en 7 ms"),
    );
  });
  it("separa por origen y por causa", () => {
    expect(huellaDeError("webhook_pago", "x")).not.toBe(huellaDeError("checkout", "x"));
    expect(huellaDeError("checkout", "x")).not.toBe(huellaDeError("checkout", "y"));
  });
});

describe("filtrarContexto", () => {
  it("deja solo claves permitidas con la forma esperada", () => {
    expect(
      filtrarContexto({
        order_id: "6f1b2c3d-0000-4000-8000-123456789abc",
        invitation_id: "no-es-uuid",
        http_status: 500,
        codigo: "23505",
        ruta: "/api/webhooks/mercadopago",
        email: "a@b.com",
        user_id: "6f1b2c3d-0000-4000-8000-123456789abc",
      }),
    ).toEqual({
      order_id: "6f1b2c3d-0000-4000-8000-123456789abc",
      http_status: 500,
      codigo: "23505",
      ruta: "/api/webhooks/mercadopago",
    });
  });
  it("rechaza una ruta con consulta o con un token real", () => {
    expect(filtrarContexto({ ruta: "/g/abc?x=1" }).ruta).toBeUndefined();
    expect(filtrarContexto(undefined)).toEqual({});
  });
});

describe("clasificarRuta", () => {
  it("dinero es crítico; lo demás, aviso", () => {
    expect(clasificarRuta("/api/webhooks/mercadopago")).toEqual({ origen: "webhook_pago", severidad: "critico" });
    expect(clasificarRuta("/api/cron/reconciliar-pagos")).toEqual({ origen: "reconciliar", severidad: "critico" });
    expect(clasificarRuta("/billing/checkout")).toEqual({ origen: "checkout", severidad: "critico" });
    expect(clasificarRuta("/auth/callback")).toEqual({ origen: "auth", severidad: "aviso" });
    expect(clasificarRuta("/editor/[invitationId]")).toEqual({ origen: "servidor", severidad: "aviso" });
  });
});

describe("debeAlertar", () => {
  it("solo críticos, una vez por huella y con tope por hora", () => {
    expect(debeAlertar({ severidad: "aviso", alertaPrevia: false, alertasEnLaUltimaHora: 0 })).toBe(false);
    expect(debeAlertar({ severidad: "critico", alertaPrevia: true, alertasEnLaUltimaHora: 0 })).toBe(false);
    expect(debeAlertar({ severidad: "critico", alertaPrevia: false, alertasEnLaUltimaHora: 10 })).toBe(false);
    expect(debeAlertar({ severidad: "critico", alertaPrevia: false, alertasEnLaUltimaHora: 9 })).toBe(true);
  });
});

describe("esRuidoDeCliente", () => {
  it("reconoce cortes de conexión del navegador y deja pasar fallos reales", () => {
    for (const m of ["The destination stream closed early.", "socket hang up", "read ECONNRESET", "aborted", "Premature close"]) {
      expect(esRuidoDeCliente(m), m).toBe(true);
    }
    for (const m of ["duplicate key value violates unique constraint", "fulfillment falló: order_update_failed", "Cannot read properties of undefined"]) {
      expect(esRuidoDeCliente(m), m).toBe(false);
    }
  });
});
