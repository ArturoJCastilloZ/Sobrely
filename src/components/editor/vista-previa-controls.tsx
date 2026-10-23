"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { crearVistaPrevia, revocarVistasPrevias } from "@/lib/previews/actions";
import {
  estadoDelBoton,
  mensajeDeLigaCopiada,
  mensajeDeRevocadas,
} from "@/lib/previews/ui";
import { textoDeDias, VIGENCIA_DIAS } from "@/lib/previews/vigencia";

/**
 * Vista previa privada (Fase 4): una liga para enseñarle la invitación a la pareja
 * o a la familia ANTES de publicarla y de pagar.
 *
 * Se muestra con la invitación publicada o no: sin publicar es justo cuando más
 * sirve. No lee tablas ni tokens: llama a `crearVistaPrevia` y copia la URL que
 * devuelve (contrato C5 v2 de `COORDINACION.md`).
 *
 * Tres decisiones de comportamiento, no de estilo:
 *   1. Con cambios SIN GUARDAR el botón se deshabilita y dice por qué. La vista
 *      previa muestra lo guardado; copiar una liga que no refleja lo que se ve en
 *      el editor sería enseñar una versión vieja sin avisar.
 *   2. Si el portapapeles falla, se MUESTRA la liga para copiarla a mano en vez de
 *      decir «copiada». Es probable en Safari: la escritura se rechaza si pasó
 *      demasiado tiempo desde el clic (aquí hay una espera al servidor), y este
 *      producto se usa sobre todo desde el teléfono.
 *   3. Revocar pide confirmación: deja de abrir TODAS las ligas ya compartidas.
 */
export function VistaPreviaControls({
  invitationId,
  dirty,
}: {
  invitationId: string;
  dirty: boolean;
}) {
  const [pendiente, startTransition] = useTransition();
  const [ligaParaCopiar, setLigaParaCopiar] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const idAviso = useId();

  const estado = estadoDelBoton({ dirty, pendiente });

  function crear() {
    startTransition(async () => {
      const r = await crearVistaPrevia(invitationId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      try {
        await navigator.clipboard.writeText(r.url);
        setLigaParaCopiar(null);
        toast.success(mensajeDeLigaCopiada(r.expiresAt));
      } catch {
        setLigaParaCopiar(r.url);
        toast.message("No se pudo copiar sola. Copia la liga de abajo.");
      }
    });
  }

  function revocar() {
    setConfirmando(false);
    startTransition(async () => {
      const r = await revocarVistasPrevias(invitationId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setLigaParaCopiar(null);
      toast.success(mensajeDeRevocadas(r.revocadas));
    });
  }

  return (
    <section className="space-y-2" aria-label="Vista previa privada">
      <h3 className="text-sm font-medium">Vista previa privada</h3>
      <p className="text-xs text-muted-foreground">
        Enséñala antes de publicar. La liga no permite confirmar asistencia y
        vence en {textoDeDias(VIGENCIA_DIAS)}.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="touch"
          variant="outline"
          disabled={estado.deshabilitado}
          aria-describedby={estado.motivo ? idAviso : undefined}
          onClick={crear}
        >
          {pendiente ? "Un momento…" : "Copiar liga de vista previa"}
        </Button>
        <Button
          type="button"
          size="touch"
          variant="ghost"
          disabled={pendiente}
          onClick={() => setConfirmando(true)}
        >
          Revocar ligas
        </Button>
      </div>

      {estado.motivo && (
        <p id={idAviso} className="text-xs text-muted-foreground">
          {estado.motivo}
        </p>
      )}

      {ligaParaCopiar && (
        <Input
          readOnly
          value={ligaParaCopiar}
          aria-label="Liga de vista previa para copiar"
          onFocus={(e) => e.currentTarget.select()}
        />
      )}

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar las ligas de vista previa?</AlertDialogTitle>
            <AlertDialogDescription>
              Las ligas que ya compartiste dejarán de abrir. Podrás crear otras
              nuevas cuando quieras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={revocar}>Revocar ligas</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
