"use client";

import { useEffect, useRef, useState } from "react";
import { checkInByToken } from "@/lib/guests/actions";
import { extractTokenFromScan } from "@/lib/guests/schemas";
import { Button } from "@/components/ui/button";

type Feedback =
  | { kind: "success"; name: string; people: number }
  | { kind: "already"; name: string; people: number }
  | { kind: "error"; message: string };

/**
 * Escáner de check-in en la puerta. Usa html5-qrcode (decodifica LOCAL con la
 * cámara, sin llamadas externas). Al leer un QR válido registra el ingreso vía
 * la acción del dueño (RLS). Evita re-escaneos repetidos del mismo código.
 */
export function CheckInScanner() {
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const lastRef = useRef<{ token: string; at: number }>({ token: "", at: 0 });

  async function handleDecoded(text: string) {
    const token = extractTokenFromScan(text);
    if (!token) return;
    // Anti-rebote: ignora el mismo token dentro de 3s.
    const now = Date.now();
    if (lastRef.current.token === token && now - lastRef.current.at < 3000) {
      return;
    }
    lastRef.current = { token, at: now };
    setBusy(true);
    const res = await checkInByToken(token);
    setBusy(false);
    if (!res.ok) {
      setFeedback({ kind: "error", message: res.error });
      return;
    }
    setFeedback({
      kind: res.guest.alreadyCheckedIn ? "already" : "success",
      name: res.guest.name,
      people: res.guest.maxGuests,
    });
  }

  async function start() {
    setFeedback(null);
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("checkin-reader");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded: string) => void handleDecoded(decoded),
        () => {},
      );
      setScanning(true);
    } catch {
      setFeedback({
        kind: "error",
        message:
          "No se pudo abrir la cámara. Revisa los permisos o usa el registro manual.",
      });
    }
  }

  async function stop() {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        await scanner.stop();
        await scanner.clear();
      } catch {
        /* noop */
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div
        id="checkin-reader"
        className="mx-auto w-full max-w-sm overflow-hidden rounded-lg border bg-black/50"
      />

      <div className="flex justify-center gap-2">
        {scanning ? (
          <Button variant="outline" onClick={stop}>
            Detener cámara
          </Button>
        ) : (
          <Button onClick={start}>Abrir cámara</Button>
        )}
      </div>

      {busy && (
        <p className="text-center text-sm text-muted-foreground">
          Registrando ingreso…
        </p>
      )}

      {feedback && (
        <div
          className={
            "mx-auto max-w-sm rounded-lg p-4 text-center " +
            (feedback.kind === "success"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : feedback.kind === "already"
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                : "bg-destructive/15 text-destructive")
          }
        >
          {feedback.kind === "error" ? (
            <p className="font-medium">{feedback.message}</p>
          ) : (
            <>
              <p className="text-lg font-semibold">{feedback.name}</p>
              <p className="text-sm">
                {feedback.people === 1
                  ? "1 invitado"
                  : `${feedback.people} invitados`}
                {" · "}
                {feedback.kind === "already"
                  ? "ya había ingresado"
                  : "ingreso registrado ✓"}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
