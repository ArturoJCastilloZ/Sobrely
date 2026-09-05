import { describe, expect, it } from "vitest";

import {
  attemptsLeft,
  generatePin,
  hashPin,
  isLocked,
  LOCK_MINUTES,
  type LockState,
  MAX_FAILED_ATTEMPTS,
  minutesUntilUnlock,
  normalizePin,
  PIN_LENGTH,
  verifyPin,
} from "./pin";

describe("normalizePin", () => {
  it("acepta seis dígitos", () => {
    expect(normalizePin("123456")).toBe("123456");
  });

  it("limpia lo que la gente teclea al dictar por teléfono", () => {
    expect(normalizePin("123 456")).toBe("123456");
    expect(normalizePin("123-456")).toBe("123456");
    expect(normalizePin(" 12 34-56 ")).toBe("123456");
  });

  it("conserva los ceros a la izquierda", () => {
    // Si en algún punto se tratara como número, `000123` se volvería `123` y
    // el PIN dejaría de verificar. Es texto de principio a fin.
    expect(normalizePin("000123")).toBe("000123");
  });

  it("rechaza lo que no son exactamente seis dígitos", () => {
    expect(normalizePin("12345")).toBeNull();
    expect(normalizePin("1234567")).toBeNull();
    expect(normalizePin("")).toBeNull();
  });

  it("rechaza lo que no es dígito", () => {
    expect(normalizePin("12345a")).toBeNull();
    expect(normalizePin("12.456")).toBeNull();
    expect(normalizePin("+12345")).toBeNull();
    // Dígitos árabes orientales: `\d` de otra implementación los aceptaría.
    expect(normalizePin("١٢٣٤٥٦")).toBeNull();
  });

  it("rechaza lo que ni siquiera es texto", () => {
    expect(normalizePin(123456)).toBeNull();
    expect(normalizePin(null)).toBeNull();
    expect(normalizePin(undefined)).toBeNull();
    expect(normalizePin({})).toBeNull();
  });
});

describe("generatePin", () => {
  it("siempre entrega seis dígitos, ceros incluidos", () => {
    for (let i = 0; i < 200; i++) {
      const pin = generatePin();
      expect(pin).toHaveLength(PIN_LENGTH);
      expect(pin).toMatch(/^[0-9]{6}$/);
      // Lo que genera tiene que pasar por la misma puerta que lo que se teclea.
      expect(normalizePin(pin)).toBe(pin);
    }
  });

  it("no repite el mismo PIN una y otra vez", () => {
    const vistos = new Set(Array.from({ length: 50 }, () => generatePin()));
    expect(vistos.size).toBeGreaterThan(40);
  });
});

describe("lectura del estado de bloqueo", () => {
  // La TRANSICIÓN (cobrar el intento, bloquear, limpiar) se mudó a la RPC
  // `claim_report_attempt` de la 0020, porque en TypeScript no puede ser
  // atómica y un lote concurrente se saltaba el bloqueo. Lo que queda de este
  // lado —y lo que se prueba aquí— es LEER el estado que la RPC devuelve.
  // El comportamiento de la transición se verifica contra la base.

  it("una liga sin bloqueo está abierta", () => {
    expect(isLocked({ failedAttempts: 0, lockedUntil: null })).toBe(false);
    expect(isLocked({ failedAttempts: 4, lockedUntil: null })).toBe(false);
  });

  it("un bloqueo en el futuro cierra; uno vencido no", () => {
    const estado: LockState = {
      failedAttempts: MAX_FAILED_ATTEMPTS,
      lockedUntil: "2026-09-05T10:15:00Z",
    };
    expect(isLocked(estado, new Date("2026-09-05T10:14:00Z"))).toBe(true);
    expect(isLocked(estado, new Date("2026-09-05T10:16:00Z"))).toBe(false);
  });

  it("minutesUntilUnlock redondea hacia arriba y nunca dice cero estando bloqueado", () => {
    const estado: LockState = {
      failedAttempts: MAX_FAILED_ATTEMPTS,
      lockedUntil: "2026-09-05T10:00:30Z",
    };
    // Faltan 30 segundos: decir "0 minutos" sería mentira.
    expect(minutesUntilUnlock(estado, new Date("2026-09-05T10:00:00Z"))).toBe(1);
    expect(LOCK_MINUTES).toBeGreaterThan(0);
  });

  it("sin bloqueo no hay minutos que esperar", () => {
    expect(
      minutesUntilUnlock({ failedAttempts: 1, lockedUntil: null }),
    ).toBe(0);
  });

  it("attemptsLeft descuenta y nunca baja de cero", () => {
    expect(attemptsLeft({ failedAttempts: 0, lockedUntil: null })).toBe(
      MAX_FAILED_ATTEMPTS,
    );
    expect(attemptsLeft({ failedAttempts: 1, lockedUntil: null })).toBe(
      MAX_FAILED_ATTEMPTS - 1,
    );
    // La RPC sigue contando más allá del tope; la UI no debe decir "-3".
    expect(
      attemptsLeft({ failedAttempts: MAX_FAILED_ATTEMPTS + 3, lockedUntil: null }),
    ).toBe(0);
  });
});

describe("hashPin / verifyPin", () => {
  it("un PIN verifica contra su propio hash", async () => {
    const hash = await hashPin("123456");
    expect(await verifyPin("123456", hash)).toBe(true);
  });

  it("un PIN distinto no verifica", async () => {
    const hash = await hashPin("123456");
    expect(await verifyPin("123457", hash)).toBe(false);
    expect(await verifyPin("000000", hash)).toBe(false);
  });

  it("el mismo PIN produce hashes distintos — hay sal por reporte", async () => {
    // Sin sal, dos eventos con el mismo PIN compartirían hash y romper uno
    // rompería el otro.
    const a = await hashPin("123456");
    const b = await hashPin("123456");
    expect(a).not.toBe(b);
    expect(await verifyPin("123456", a)).toBe(true);
    expect(await verifyPin("123456", b)).toBe(true);
  });

  it("guarda los parámetros junto al hash", async () => {
    const hash = await hashPin("123456");
    const partes = hash.split("$");
    expect(partes).toHaveLength(6);
    expect(partes[0]).toBe("scrypt");
    // Que estén guardados es lo que permite subir el costo después sin
    // invalidar los PIN ya emitidos.
    expect(Number(partes[1])).toBeGreaterThan(0);
  });

  it("nunca guarda el PIN en claro", async () => {
    const hash = await hashPin("123456");
    expect(hash).not.toContain("123456");
  });

  it("un hash corrupto devuelve false en vez de reventar", async () => {
    // Si esto tirara, un renglón dañado en la base sería un 500 en la cara del
    // visitante en vez de un "PIN incorrecto".
    for (const basura of [
      "",
      "no-es-un-hash",
      "scrypt$16384$8",
      "scrypt$x$y$z$c2FsdA==$aGFzaA==",
      "bcrypt$16384$8$1$c2FsdA==$aGFzaA==",
      "scrypt$16384$8$1$$",
    ]) {
      await expect(verifyPin("123456", basura)).resolves.toBe(false);
    }
  });
});
