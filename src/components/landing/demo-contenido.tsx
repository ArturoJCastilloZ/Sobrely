"use client";

import { useEffect, useMemo, useState } from "react";

import { UseTemplateButton } from "@/components/dashboard/use-template-button";
import { PublicInvitationView } from "@/components/public/public-invitation";
import { BotonUsarComoInvitado } from "@/components/templates/boton-usar-como-invitado";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublicInvitation } from "@/lib/invitations/public-types";
import {
  NOMBRES_MAXIMO,
  aplicarNombresAModulos,
  datosIniciales,
  fechaAEventDate,
  limpiarFecha,
} from "@/lib/templates/datos-iniciales";
import { PALETAS, aplicarPaleta, type PaletaClave } from "@/lib/templates/paletas";
import { cn } from "@/lib/utils";

export type PlantillaDemo = { id: string; slug: string; event_type: string };

const documentos = new Map<string, PublicInvitation>();

/**
 * La parte interactiva de la demo: un tipo de evento, tus nombres, la fecha y una paleta, y la
 * invitación REAL (`PublicInvitationView`, la misma que recibe un invitado) cambia al instante.
 * «Probar con mi evento» abre el editor con esos datos y esa paleta ya puestos (la pieza común
 * de `datos-iniciales.ts`; el servidor vuelve a limpiar todo). Sin cuenta.
 */
export function DemoContenido({
  plantillas,
  autenticado,
}: {
  plantillas: PlantillaDemo[];
  autenticado: boolean;
}) {
  const [slug, setSlug] = useState(plantillas[0]?.slug ?? "");
  const [nombres, setNombres] = useState("");
  const [fecha, setFecha] = useState("");
  const [paleta, setPaleta] = useState<PaletaClave | "">("");
  const [recibidos, setRecibidos] = useState<Record<string, PublicInvitation | "error">>({});

  const plantilla = plantillas.find((p) => p.slug === slug) ?? plantillas[0];

  const recibido = recibidos[slug] ?? documentos.get(slug);

  useEffect(() => {
    if (!slug || documentos.has(slug)) return;
    const control = new AbortController();
    fetch(`/api/plantillas/${encodeURIComponent(slug)}/documento`, { signal: control.signal })
      .then((r) => (r.ok ? (r.json() as Promise<PublicInvitation>) : Promise.reject(new Error("http"))))
      .then((base) => {
        documentos.set(slug, base);
        setRecibidos((r) => ({ ...r, [slug]: base }));
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setRecibidos((r) => ({ ...r, [slug]: "error" }));
      });
    return () => control.abort();
  }, [slug]);

  const datos = useMemo(() => datosIniciales({ nombres, fecha, paleta }), [nombres, fecha, paleta]);

  const invitacion = useMemo<PublicInvitation | null>(() => {
    if (!recibido || recibido === "error") return null;
    const base = recibido;
    return {
      ...base,
      theme_config: aplicarPaleta(base.theme_config ?? {}, datos?.paleta ?? ""),
      modules: datos?.nombres ? aplicarNombresAModulos(base.modules, datos.nombres) : base.modules,
      event_date: datos?.fecha ? fechaAEventDate(datos.fecha) : base.event_date,
    };
  }, [recibido, datos]);

  if (!plantilla) return null;
  const fechaInvalida = fecha !== "" && limpiarFecha(fecha) === "";

  return (
    <div className="grid gap-8 rounded-2xl border bg-card p-5 sm:p-8 md:grid-cols-[17.5rem_1fr] md:items-start">
      <div
        role="img"
        aria-label={`Vista previa de una invitación de ${plantilla.event_type}`}
        inert
        className="mx-auto h-[28rem] w-full max-w-[17.5rem] overflow-y-auto overscroll-contain rounded-[1.75rem] border-[6px] border-foreground/80 bg-muted shadow-sm sm:h-[32rem]"
      >
        {invitacion ? (
          <PublicInvitationView invitation={invitacion} vistaPrevia />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            {recibido === "error"
              ? "No pudimos cargar la vista previa. Prueba con otro evento."
              : "Cargando vista previa…"}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">¿Qué vas a celebrar?</legend>
          <div className="flex flex-wrap gap-2">
            {plantillas.map((p) => (
              <Opcion
                key={p.slug}
                nombre="demo-evento"
                activa={p.slug === plantilla.slug}
                onElegir={() => setSlug(p.slug)}
              >
                {p.event_type}
              </Opcion>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="demo-nombres">Tus nombres</Label>
            <Input
              id="demo-nombres"
              value={nombres}
              maxLength={NOMBRES_MAXIMO}
              autoComplete="off"
              placeholder="Sofía y Mateo"
              onChange={(e) => setNombres(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-fecha">Fecha del evento</Label>
            <Input
              id="demo-fecha"
              type="date"
              value={fecha}
              aria-invalid={fechaInvalida}
              onChange={(e) => setFecha(e.target.value)}
            />
            {fechaInvalida && <p className="text-xs text-destructive">Escribe una fecha válida.</p>}
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Colores</legend>
          <div className="flex flex-wrap gap-2">
            <Opcion nombre="demo-paleta" activa={paleta === ""} onElegir={() => setPaleta("")}>
              Los de la plantilla
            </Opcion>
            {PALETAS.map((p) => (
              <label
                key={p.clave}
                title={p.etiqueta}
                className={cn(
                  "flex size-11 cursor-pointer items-center justify-center rounded-full border-2",
                  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  paleta === p.clave ? "border-foreground" : "border-transparent",
                )}
              >
                <input
                  type="radio"
                  name="demo-paleta"
                  value={p.clave}
                  checked={paleta === p.clave}
                  onChange={() => setPaleta(p.clave)}
                  className="sr-only"
                />
                <span className="sr-only">{p.etiqueta}</span>
                <span
                  aria-hidden="true"
                  className="size-7 rounded-full border border-black/10"
                  style={{
                    background: `linear-gradient(135deg, ${p.background} 50%, ${p.primary} 50%)`,
                  }}
                />
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-2 flex flex-col gap-2 sm:max-w-xs">
          {autenticado ? (
            <UseTemplateButton
              templateId={plantilla.id}
              datos={datos ?? undefined}
              etiqueta="Probar con mi evento"
              className="h-11"
            />
          ) : (
            <BotonUsarComoInvitado
              slug={plantilla.slug}
              datos={datos ?? undefined}
              etiqueta="Probar con mi evento"
              className="h-11"
            />
          )}
          <p className="text-xs text-muted-foreground">
            Se abre el editor con lo que escribiste. No necesitas cuenta; la pides al publicar.
          </p>
        </div>
      </div>
    </div>
  );
}

function Opcion({
  nombre,
  activa,
  onElegir,
  children,
}: {
  nombre: string;
  activa: boolean;
  onElegir: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition-colors",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
        activa ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      <input type="radio" name={nombre} checked={activa} onChange={onElegir} className="sr-only" />
      {children}
    </label>
  );
}
