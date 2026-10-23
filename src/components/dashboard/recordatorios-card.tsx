"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { guardarPreferenciaRecordatorios } from "@/lib/recordatorios/acciones";

/**
 * El interruptor de recordatorios por correo. Empieza APAGADO para quien nunca ha
 * decidido: el consentimiento es un acto de la persona, no un valor por omisión.
 *
 * Si guardar falla, el interruptor vuelve a como estaba y se avisa. Dejarlo en la
 * posición nueva mostraría «activado» sin que haya quedado registrado, que en
 * este caso es peor que no responder: la persona creería haber aceptado (o dejado
 * de aceptar) algo que el servidor no tiene.
 *
 * `texto` viene de `TEXTO_CONSENTIMIENTO` (el MISMO que respalda la versión
 * guardada), por prop para no importar un módulo de servidor en el cliente.
 */
export function RecordatoriosCard({
  inicial,
  texto,
}: {
  inicial: boolean;
  texto: string;
}) {
  const [activo, setActivo] = useState(inicial);
  const [pendiente, startTransition] = useTransition();
  const idTexto = useId();

  function cambiar(siguiente: boolean) {
    const anterior = activo;
    setActivo(siguiente);
    startTransition(async () => {
      const r = await guardarPreferenciaRecordatorios(siguiente);
      if (!r.ok) {
        setActivo(anterior);
        toast.error(r.error);
        return;
      }
      toast.success(
        siguiente ? "Te enviaremos recordatorios." : "Ya no te enviaremos recordatorios.",
      );
    });
  }

  return (
    <section
      aria-label="Recordatorios por correo"
      className="flex items-start gap-3 rounded-lg border p-4"
    >
      <Switch
        checked={activo}
        disabled={pendiente}
        onCheckedChange={cambiar}
        aria-labelledby={idTexto}
        className="mt-0.5"
      />
      <div className="space-y-1">
        <p id={idTexto} className="text-sm font-medium">
          Recordatorios por correo
        </p>
        <p className="text-xs text-muted-foreground">{texto}</p>
      </div>
    </section>
  );
}
