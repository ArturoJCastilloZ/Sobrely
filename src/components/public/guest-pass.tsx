"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

/**
 * Pase de acceso del invitado: muestra el QR (que codifica su enlace único) y
 * permite descargarlo como imagen. Todo se genera LOCAL en el navegador con la
 * librería `qrcode` — cero llamadas externas.
 */
export function GuestPass({
  token,
  name,
  people,
}: {
  token: string;
  name: string;
  people: number;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const urlRef = useRef<string>("");

  useEffect(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/g/${token}`;
    urlRef.current = url;
    QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 512,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [token]);

  const peopleLabel = people === 1 ? "1 invitado" : `${people} invitados`;

  async function downloadPass() {
    if (!qrDataUrl) return;
    setDownloading(true);
    try {
      const W = 720;
      const H = 1040;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Fondo
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#f4f1ec";
      ctx.fillRect(24, 24, W - 48, H - 48);

      // Encabezado
      ctx.fillStyle = "#8a6d5a";
      ctx.fillRect(24, 24, W - 48, 96);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 34px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PASE DE ACCESO", W / 2, 86);

      // Nombre + invitados
      ctx.fillStyle = "#2a2a2a";
      ctx.font = "bold 44px system-ui, sans-serif";
      ctx.fillText(name, W / 2, 210);
      ctx.fillStyle = "#6a6a6a";
      ctx.font = "26px system-ui, sans-serif";
      ctx.fillText(peopleLabel, W / 2, 254);

      // QR
      const qr = new window.Image();
      await new Promise<void>((resolve, reject) => {
        qr.onload = () => resolve();
        qr.onerror = () => reject(new Error("qr load"));
        qr.src = qrDataUrl;
      });
      const qrSize = 460;
      ctx.drawImage(qr, (W - qrSize) / 2, 300, qrSize, qrSize);

      // Pie
      ctx.fillStyle = "#8a8a8a";
      ctx.font = "24px system-ui, sans-serif";
      ctx.fillText("Muestra este código en la entrada", W / 2, 830);
      ctx.fillStyle = "#b0a89f";
      ctx.font = "20px system-ui, sans-serif";
      ctx.fillText("Sobrely", W / 2, 980);

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
      );
      if (!blob) return;
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `pase-${name.replace(/\s+/g, "-").toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl bg-[var(--inv-card)] p-6 text-center @4xl/inv:max-w-md">
      <p className="text-sm font-medium uppercase tracking-wide opacity-70 @4xl/inv:text-base">
        Pase de acceso
      </p>
      {qrDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrDataUrl}
          alt="Código QR de acceso"
          className="mx-auto mt-3 h-52 w-52 rounded-lg bg-white p-2 @4xl/inv:h-64 @4xl/inv:w-64"
        />
      ) : (
        <div className="mx-auto mt-3 flex h-52 w-52 items-center justify-center rounded-lg bg-white/50 text-sm text-muted-foreground @4xl/inv:h-64 @4xl/inv:w-64">
          Generando…
        </div>
      )}
      <p className="mt-3 text-base opacity-80 @4xl/inv:text-lg">
        Muestra este QR en la entrada
      </p>
      <button
        type="button"
        onClick={downloadPass}
        disabled={!qrDataUrl || downloading}
        className="mt-4 inline-flex h-11 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--inv-text)_35%,transparent)] px-5 text-base font-medium transition-opacity hover:opacity-80 disabled:opacity-50 @4xl/inv:h-12 @4xl/inv:text-lg"
      >
        {downloading ? "Preparando…" : "Descargar pase"}
      </button>
    </div>
  );
}
