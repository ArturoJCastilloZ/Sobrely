"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  createReportLink,
  revokeReportLink,
  type ReportLinkInfo,
} from "@/lib/reports/actions";
import { MAX_FAILED_ATTEMPTS } from "@/lib/reports/constants";

/**
 * Generar, copiar y apagar la liga del reporte.
 *
 * El PIN se muestra UNA sola vez, al crearlo: la base solo guarda su hash, así
 * que no hay forma de volver a enseñarlo. Por eso la tarjeta insiste en
 * copiarlo ahora y ofrece regenerar en vez de "ver el PIN", que sería mentira.
 */
export function ReportShare({
  invitationId,
  link,
  siteUrl,
}: {
  invitationId: string;
  link: ReportLinkInfo | null;
  siteUrl: string;
}) {
  const [trabajando, setTrabajando] = useState(false);
  /** PIN recién emitido. Solo vive en memoria y se pierde al recargar. */
  const [pinNuevo, setPinNuevo] = useState<string | null>(null);
  const [actual, setActual] = useState<ReportLinkInfo | null>(link);

  const url = actual ? `${siteUrl}/r/${actual.token}` : null;

  async function generar() {
    setTrabajando(true);
    const res = await createReportLink(invitationId);
    setTrabajando(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setPinNuevo(res.pin);
    setActual({
      token: res.token,
      createdAt: new Date().toISOString(),
      viewCount: 0,
      lastViewedAt: null,
    });
    toast.success("Liga creada. Copia el PIN antes de cerrar.");
  }

  async function revocar() {
    setTrabajando(true);
    const res = await revokeReportLink(invitationId);
    setTrabajando(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setActual(null);
    setPinNuevo(null);
    toast.success("Liga desactivada.");
  }

  async function copiar(texto: string, queCosa: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(`${queCosa} copiado.`);
    } catch {
      // Sin permiso de portapapeles (o sin HTTPS) no se copia. Decirlo es mejor
      // que un botón que no hace nada.
      toast.error("No se pudo copiar. Selecciónalo a mano.");
    }
  }

  return (
    <Card>
      <CardContent className="px-5 py-1">
        <h3 className="text-sm font-semibold">Compartir el reporte</h3>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Una liga de solo lectura con las cifras del evento, para el banquete o
          el salón. Muestra totales — nunca la lista de invitados ni sus
          respuestas. Se abre con un PIN de 6 dígitos que tú les dictas aparte.
        </p>

        {!actual && (
          <Button
            onClick={generar}
            disabled={trabajando}
            size="sm"
            className="mt-4"
          >
            {trabajando ? "Creando…" : "Crear liga con PIN"}
          </Button>
        )}

        {actual && (
          <div className="mt-4 space-y-3">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Liga
              </div>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs">
                  {url}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copiar(url as string, "Liga")}
                >
                  Copiar
                </Button>
              </div>
            </div>

            {pinNuevo ? (
              <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
                <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  PIN — se muestra una sola vez
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 text-2xl font-semibold tabular-nums tracking-[0.3em]">
                    {pinNuevo}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copiar(pinNuevo, "PIN")}
                  >
                    Copiar
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Guárdalo ahora: no se puede volver a consultar, solo generar
                  uno nuevo.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                El PIN de esta liga ya no se puede consultar. Si lo perdiste,
                genera una liga nueva — la anterior deja de funcionar.
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {actual.viewCount === 0
                ? "Todavía nadie la ha abierto."
                : `Abierta ${actual.viewCount} ${
                    actual.viewCount === 1 ? "vez" : "veces"
                  }.`}{" "}
              Se bloquea sola tras {MAX_FAILED_ATTEMPTS} intentos fallidos.
            </p>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={generar}
                disabled={trabajando}
              >
                Generar liga nueva
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={revocar}
                disabled={trabajando}
                className="text-destructive"
              >
                Desactivar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
