"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  deleteSignature,
  listSignaturesForOwner,
  setSignatureHidden,
  type OwnerSignatureRow,
} from "@/lib/signatures/actions";

/**
 * Moderar el libro de firmas.
 *
 * Existe porque el módulo abre una escritura PÚBLICA: cualquiera con el enlace
 * puede dejar un mensaje. Entregar eso sin forma de quitar nada no es una
 * feature incompleta, es un problema.
 *
 * **Ocultar se ofrece antes que borrar**, y no es un detalle de UI: una firma
 * subida de tono en una boda casi nunca hay que destruirla —basta con que no
 * se vea—, y ocultar es reversible. Borrar es el último recurso y por eso pide
 * confirmación.
 */
export function SignaturesModeration({
  invitationId,
}: {
  invitationId: string;
}) {
  const [firmas, setFirmas] = useState<OwnerSignatureRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [pending, startTransition] = useTransition();

  const reload = useCallback(async () => {
    setFirmas(await listSignaturesForOwner(invitationId));
    setCargando(false);
  }, [invitationId]);

  useEffect(() => {
    // Carga inicial. `reload()` hace setState solo DESPUÉS del await, no de
    // forma síncrona en el cuerpo del efecto, así que no cascadea renders.
    // Mismo patrón (y misma excepción) que `guest-manager`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  function alternarVisible(f: OwnerSignatureRow) {
    startTransition(async () => {
      const res = await setSignatureHidden(invitationId, f.id, !f.is_hidden);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(f.is_hidden ? "Firma visible." : "Firma oculta.");
      await reload();
    });
  }

  function borrar(f: OwnerSignatureRow) {
    // Irreversible: se pregunta. Ocultar, que es lo reversible, no pregunta.
    if (
      !window.confirm(
        `¿Borrar la firma de ${f.guest_name}? No se puede deshacer. Si solo no quieres que se vea, usa "Ocultar".`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteSignature(invitationId, f.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Firma borrada.");
      await reload();
    });
  }

  const ocultas = firmas.filter((f) => f.is_hidden).length;

  if (cargando) return null;

  return (
    <Card>
      <CardContent className="px-5 py-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Libro de firmas</h3>
          <span className="font-mono text-xs text-muted-foreground">
            {firmas.length} {firmas.length === 1 ? "firma" : "firmas"}
            {ocultas > 0 ? ` · ${ocultas} oculta${ocultas === 1 ? "" : "s"}` : ""}
          </span>
        </div>

        {firmas.length === 0 ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Todavía nadie ha firmado. Las firmas aparecen aquí en cuanto tus
            invitados dejen su mensaje.
          </p>
        ) : (
          <>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Cualquiera con el enlace puede firmar. Aquí puedes ocultar una
              firma sin borrarla — es reversible.
            </p>
            {!abierto ? (
              <Button
                size="sm"
                variant="outline"
                className="mt-4"
                onClick={() => setAbierto(true)}
              >
                Ver las {firmas.length}
              </Button>
            ) : (
              <ul className="mt-4 space-y-2">
                {firmas.map((f) => (
                  <li key={f.id} className="rounded-md border px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{f.guest_name}</span>
                      {f.is_hidden && <Badge variant="outline">Oculta</Badge>}
                    </div>
                    <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                      {f.message}
                    </p>
                    <div className="mt-2 flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => alternarVisible(f)}
                        disabled={pending}
                      >
                        {f.is_hidden ? "Mostrar" : "Ocultar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => borrar(f)}
                        disabled={pending}
                        className="text-destructive"
                      >
                        Borrar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
