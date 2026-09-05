"use client";

import { useEffect, useState, useTransition } from "react";

import {
  listSignatures,
  signGuestbook,
  type SignatureRow,
} from "@/lib/signatures/actions";
import { MAX_MESSAGE_LENGTH, MAX_NAME_LENGTH } from "@/lib/signatures/sanitize";
import type { SignaturesConfig } from "@/lib/modules/types";

/**
 * El libro de firmas en la página pública: se firma y se lee.
 *
 * Las firmas se cargan en el cliente y no en el servidor a propósito. La página
 * pública es cacheable y el muro cambia durante la fiesta: si viniera renderizado
 * con la página, un invitado vería el muro congelado en el momento en que se
 * generó, y la gracia del libro es ver aparecer los mensajes.
 */
export function SignatureWall({
  invitationId,
  config,
}: {
  invitationId: string;
  config: SignaturesConfig;
}) {
  const [firmas, setFirmas] = useState<SignatureRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<null | { pendiente: boolean }>(null);
  const [enviando, startTransition] = useTransition();

  useEffect(() => {
    let vivo = true;
    listSignatures(invitationId).then((rows) => {
      if (!vivo) return;
      setFirmas(rows);
      setCargando(false);
    });
    return () => {
      vivo = false;
    };
  }, [invitationId]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setError(null);
    startTransition(async () => {
      const res = await signGuestbook(invitationId, {
        guestName: nombre,
        message: mensaje,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setListo({ pendiente: res.pendiente });
      setNombre("");
      setMensaje("");
      // Con moderación la firma no se ve todavía; recargar el muro solo
      // confundiría ("¿dónde quedó la mía?").
      if (!res.pendiente) setFirmas(await listSignatures(invitationId));
    });
  }

  const restantes = MAX_MESSAGE_LENGTH - mensaje.length;

  return (
    <section className="px-6 py-10 @2xl/inv:py-14">
      <div className="mx-auto max-w-xl">
        <h2 className="text-center text-2xl font-semibold @2xl/inv:text-3xl">
          {config.title}
        </h2>
        {config.description && (
          <p className="mt-2 text-center text-sm opacity-75">
            {config.description}
          </p>
        )}

        {listo ? (
          <div className="mt-6 rounded-lg border p-4 text-center">
            <p className="text-sm font-medium">¡Gracias por firmar!</p>
            <p className="mt-1 text-xs opacity-70">
              {listo.pendiente
                ? "Los anfitriones la revisarán antes de publicarla."
                : "Tu mensaje ya está en el muro."}
            </p>
            <button
              type="button"
              className="mt-3 text-xs underline underline-offset-2 opacity-70"
              onClick={() => setListo(null)}
            >
              Firmar otra vez
            </button>
          </div>
        ) : (
          <form onSubmit={enviar} className="mt-6 space-y-3">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              maxLength={MAX_NAME_LENGTH}
              aria-label="Tu nombre"
              // `text-base` en móvil evita el zoom automático de iOS al enfocar.
              className="w-full rounded-md border bg-transparent px-3 py-2 text-base md:text-sm"
            />
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Tu mensaje"
              rows={4}
              maxLength={MAX_MESSAGE_LENGTH}
              aria-label="Tu mensaje"
              className="w-full rounded-md border bg-transparent px-3 py-2 text-base md:text-sm"
            />
            <div className="flex items-center justify-between gap-3">
              {/* El contador solo aparece cerca del tope: mostrarlo siempre
                  presiona a escribir corto, que no es lo que se busca aquí. */}
              <span className="text-xs opacity-60">
                {restantes <= 60 ? `${restantes} caracteres` : ""}
              </span>
              <button
                type="submit"
                disabled={enviando}
                className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {enviando ? "Enviando…" : config.buttonLabel}
              </button>
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
          </form>
        )}

        <div className="mt-8 space-y-3">
          {cargando ? (
            <p className="text-center text-xs opacity-60">Cargando firmas…</p>
          ) : firmas.length === 0 ? (
            <p className="text-center text-xs opacity-60">
              Todavía no hay firmas. Sé el primero.
            </p>
          ) : (
            firmas.map((f) => (
              <figure key={f.id} className="rounded-lg border px-4 py-3">
                {/* `whitespace-pre-line`: quien firmó en tres renglones lo hizo
                    a propósito y el saneado los conserva. */}
                <blockquote className="whitespace-pre-line text-sm">
                  {f.message}
                </blockquote>
                <figcaption className="mt-1.5 text-xs opacity-70">
                  — {f.guest_name}
                </figcaption>
              </figure>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
