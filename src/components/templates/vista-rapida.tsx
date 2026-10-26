"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { UseTemplateButton } from "@/components/dashboard/use-template-button";
import { PublicInvitationView } from "@/components/public/public-invitation";
import { BotonUsarComoInvitado } from "@/components/templates/boton-usar-como-invitado";
import { RegistrarVisita } from "@/components/analytics/registrar-visita";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/billing/config";
import type { PublicInvitation } from "@/lib/invitations/public-types";
import {
  NOMBRES_MAXIMO,
  aplicarNombresAModulos,
  datosIniciales,
  fechaAEventDate,
  limpiarFecha,
} from "@/lib/templates/datos-iniciales";
import { hrefVistaPlantilla, type PlantillaMarketplace } from "@/lib/templates/marketplace";
import { cn } from "@/lib/utils";

/**
 * Vista rápida con TUS NOMBRES (docs/auditoria-2026-10/14, fase 1): la invitación real de la
 * plantilla, en un marco de teléfono, que cambia mientras escribes tus nombres y la fecha.
 * «Usar con estos datos» abre el editor con eso ya puesto, sin reescribirlo.
 *
 * Pinta con `PublicInvitationView`, el MISMO componente que la invitación publicada y la ficha,
 * así que lo que se ve aquí es lo que se recibe. El documento de la plantilla se pide solo al
 * abrir (`/api/plantillas/<slug>/documento`) y se recuerda en memoria: la galería de 65 no
 * manda 65 configuraciones.
 */
const documentos = new Map<string, PublicInvitation>();

type Carga =
  | { estado: "cargando" }
  | { estado: "listo"; base: PublicInvitation }
  | { estado: "error" };

export function VistaRapida({
  plantilla,
  autenticado,
  onCerrar,
}: {
  plantilla: PlantillaMarketplace | null;
  autenticado: boolean;
  onCerrar: () => void;
}) {
  const abierta = plantilla !== null;
  const [nombres, setNombres] = useState("");
  const [fecha, setFecha] = useState("");

  return (
    <Dialog open={abierta} onOpenChange={(abre) => !abre && onCerrar()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto p-4 sm:p-6">
        {plantilla && (
          <Contenido
            // Una plantilla distinta empieza limpia; la misma conserva lo escrito mientras esté abierta.
            key={plantilla.slug}
            plantilla={plantilla}
            autenticado={autenticado}
            nombres={nombres}
            fecha={fecha}
            onNombres={setNombres}
            onFecha={setFecha}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Contenido({
  plantilla,
  autenticado,
  nombres,
  fecha,
  onNombres,
  onFecha,
}: {
  plantilla: PlantillaMarketplace;
  autenticado: boolean;
  nombres: string;
  fecha: string;
  onNombres: (v: string) => void;
  onFecha: (v: string) => void;
}) {
  const [carga, setCarga] = useState<Carga>(() => {
    const guardado = documentos.get(plantilla.slug);
    return guardado ? { estado: "listo", base: guardado } : { estado: "cargando" };
  });

  useEffect(() => {
    if (documentos.has(plantilla.slug)) return;
    const control = new AbortController();
    fetch(`/api/plantillas/${encodeURIComponent(plantilla.slug)}/documento`, {
      signal: control.signal,
    })
      .then((r) => (r.ok ? (r.json() as Promise<PublicInvitation>) : Promise.reject(new Error("http"))))
      .then((base) => {
        documentos.set(plantilla.slug, base);
        setCarga({ estado: "listo", base });
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setCarga({ estado: "error" });
      });
    return () => control.abort();
  }, [plantilla.slug]);

  const datos = useMemo(() => datosIniciales({ nombres, fecha }), [nombres, fecha]);

  const invitacion = useMemo<PublicInvitation | null>(() => {
    if (carga.estado !== "listo") return null;
    const { base } = carga;
    return {
      ...base,
      modules: datos?.nombres ? aplicarNombresAModulos(base.modules, datos.nombres) : base.modules,
      event_date: datos?.fecha ? fechaAEventDate(datos.fecha) : base.event_date,
    };
  }, [carga, datos]);

  const etiqueta = datos ? "Usar con estos datos" : "Usar esta plantilla";
  const fechaInvalida = fecha !== "" && limpiarFecha(fecha) === "";

  return (
    <>
      <RegistrarVisita evento="quick_view_open" valor={plantilla.slug} />
      <DialogHeader>
        <DialogTitle>{plantilla.name}</DialogTitle>
        <DialogDescription>
          Escribe tus nombres y la fecha para ver cómo te queda. No necesitas cuenta.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 sm:grid-cols-[17.5rem_1fr]">
        <div
          role="img"
          aria-label={`Vista previa de ${plantilla.name}`}
          // Solo se mira: `inert` saca del orden de tabulación y de los lectores de pantalla los
          // campos de confirmación de la invitación (su RSVP), que aquí no hacen nada.
          inert
          className="mx-auto h-[26rem] w-full max-w-[17.5rem] overflow-y-auto overscroll-contain rounded-[1.75rem] border-[6px] border-foreground/80 bg-muted shadow-sm sm:h-[32rem]"
        >
          {invitacion ? (
            <PublicInvitationView invitation={invitacion} vistaPrevia />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              {carga.estado === "error"
                ? "No pudimos cargar la vista previa. Puedes abrir la ficha completa."
                : "Cargando vista previa…"}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="vr-nombres">Tus nombres</Label>
            <Input
              id="vr-nombres"
              value={nombres}
              maxLength={NOMBRES_MAXIMO}
              autoComplete="off"
              placeholder="Sofía y Mateo"
              onChange={(e) => onNombres(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vr-fecha">Fecha del evento</Label>
            <Input
              id="vr-fecha"
              type="date"
              value={fecha}
              aria-invalid={fechaInvalida}
              onChange={(e) => onFecha(e.target.value)}
            />
            {fechaInvalida && (
              <p className="text-xs text-destructive">Escribe una fecha válida.</p>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {plantilla.precio ? (
              <>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatPrice(plantilla.precio.precio)}
                </span>{" "}
                para publicarla, pago único. Editar es gratis.
              </>
            ) : (
              "Editar es gratis; pagas solo al publicar."
            )}
          </p>

          <div className="mt-auto flex flex-col gap-2">
            {autenticado ? (
              <UseTemplateButton
                templateId={plantilla.id}
                datos={datos ?? undefined}
                etiqueta={etiqueta}
                className="h-11 lg:h-9"
              />
            ) : (
              <BotonUsarComoInvitado
                slug={plantilla.slug}
                datos={datos ?? undefined}
                etiqueta={etiqueta}
                className="h-11 lg:h-9"
              />
            )}
            <Link
              href={hrefVistaPlantilla(plantilla.slug)}
              className={cn(buttonVariants({ variant: "ghost" }), "h-11 w-full lg:h-9")}
            >
              Ver la ficha completa
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
