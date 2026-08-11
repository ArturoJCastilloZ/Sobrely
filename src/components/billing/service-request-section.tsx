"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requestManualService } from "@/lib/services/actions";
import { formatPrice } from "@/lib/billing";
import type { AdditionalService } from "@/lib/billing/types";

/**
 * Sección "Servicios adicionales" del dashboard de facturación (Subfase 8.6).
 *
 * Flujo solicitud-primero: el usuario abre el servicio, escribe una nota
 * opcional y solicita. Se registra la solicitud y se muestran las instrucciones
 * de contacto (WhatsApp). El pago se arregla manualmente.
 */
export function ServiceRequestSection({
  services,
}: {
  services: readonly AdditionalService[];
}) {
  if (services.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Servicios adicionales</h2>
        <p className="text-sm text-muted-foreground">
          ¿Quieres que te ayudemos? Solicita un servicio asistido y te
          contactamos para dejarlo listo.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {services.map((s) => (
          <ServiceCard key={s.code} service={s} />
        ))}
      </div>
    </section>
  );
}

function ServiceCard({ service }: { service: AdditionalService }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [requested, setRequested] = useState(false);
  const [waUrl, setWaUrl] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const res = await requestManualService({
        serviceCode: service.code,
        contactNote: note,
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo registrar la solicitud.");
        return;
      }
      setRequested(true);
      setWaUrl(res.whatsappUrl);
      toast.success("Solicitud registrada. Te contactaremos pronto.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{service.name}</CardTitle>
        <CardDescription>{service.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm font-medium">
          {service.priceFrom ? "Desde " : ""}
          {formatPrice(service.price, service.currency)}
        </p>

        {requested ? (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium">¡Solicitud registrada!</p>
            <p className="text-muted-foreground">
              Te contactaremos para coordinar el servicio y el pago.
            </p>
            {waUrl ? (
              <Button
                render={<a href={waUrl} target="_blank" rel="noopener noreferrer" />}
                nativeButton={false}
                size="sm"
                className="mt-2"
              >
                Escríbenos por WhatsApp
              </Button>
            ) : null}
          </div>
        ) : open ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Cuéntanos qué necesitas (opcional)…"
              rows={3}
            />
            <div className="flex gap-2">
              <Button onClick={submit} disabled={pending} size="sm">
                {pending ? "Enviando…" : "Enviar solicitud"}
              </Button>
              <Button
                onClick={() => setOpen(false)}
                variant="ghost"
                size="sm"
                disabled={pending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setOpen(true)} variant="outline" size="sm">
            Solicitar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
