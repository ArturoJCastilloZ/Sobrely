import { describe, it, expect } from "vitest";
import crypto from "node:crypto";

import { verifyMercadoPagoSignature } from "@/lib/billing/mp-signature";

const SECRET = "test-webhook-secret";
const REQUEST_ID = "req-123";
const DATA_ID = "PAY-9999";
const TS = "1700000000";

/** Firma válida para los datos de prueba (mismo manifiesto que el verificador). */
function validV1(dataId = DATA_ID): string {
  const manifest = `id:${dataId.toLowerCase()};request-id:${REQUEST_ID};ts:${TS};`;
  return crypto.createHmac("sha256", SECRET).update(manifest).digest("hex");
}

function header(v1: string, ts = TS): string {
  return `ts=${ts},v1=${v1}`;
}

describe("verifyMercadoPagoSignature", () => {
  it("acepta una firma válida", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header(validV1()),
        requestId: REQUEST_ID,
        dataId: DATA_ID,
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("acepta data.id con distinta capitalización (MP compara en minúsculas)", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header(validV1("pay-9999")),
        requestId: REQUEST_ID,
        dataId: "PAY-9999",
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("rechaza v1 alterado", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header("deadbeef"),
        requestId: REQUEST_ID,
        dataId: DATA_ID,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rechaza ts alterado (cambia el manifiesto)", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header(validV1(), "1699999999"),
        requestId: REQUEST_ID,
        dataId: DATA_ID,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rechaza secret incorrecto", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header(validV1()),
        requestId: REQUEST_ID,
        dataId: DATA_ID,
        secret: "otro-secret",
      }),
    ).toBe(false);
  });

  it("fail-closed: header ausente", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: null,
        requestId: REQUEST_ID,
        dataId: DATA_ID,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("fail-closed: secret ausente", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header(validV1()),
        requestId: REQUEST_ID,
        dataId: DATA_ID,
        secret: undefined,
      }),
    ).toBe(false);
  });

  it("fail-closed: dataId ausente", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header(validV1()),
        requestId: REQUEST_ID,
        dataId: null,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("fail-closed: header sin v1", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: `ts=${TS}`,
        requestId: REQUEST_ID,
        dataId: DATA_ID,
        secret: SECRET,
      }),
    ).toBe(false);
  });
});
