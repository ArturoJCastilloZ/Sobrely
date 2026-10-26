"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, CircleIcon } from "lucide-react";

import { ImageUploader } from "@/components/editor/image-uploader";
import { PublicInvitationView } from "@/components/public/public-invitation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { progresoEsencial } from "@/lib/analytics/borrador-completo";
import {
  accionFecha,
  accionLugar,
  accionNombres,
  fechaParaInput,
  fotoActual,
  lugarActual,
  nombresActuales,
  type Accion,
} from "@/lib/editor/asistente-datos";
import { useAsistente } from "@/lib/editor/contexto-asistente";
import { useDocumento } from "@/lib/editor/contexto-documento";
import type { PublicInvitation } from "@/lib/invitations/public-types";
import { NOMBRES_MAXIMO } from "@/lib/templates/datos-iniciales";
import { PALETAS, aplicarPaleta, type PaletaClave } from "@/lib/templates/paletas";
import { cn } from "@/lib/utils";

const PASOS = ["Evento", "Datos", "Foto", "Revisar"] as const;

/**
 * Asistente inicial de 4 pasos (fase 5 de la propuesta visual): evento y colores, datos, foto y
 * revisión, con la invitación a la vista todo el rato. Es una capa guiada SOBRE EL MISMO
 * documento del editor: cada campo despacha la misma acción que el panel correspondiente (con
 * su historial, su autoguardado y su deshacer), y al cerrarlo la persona está en el editor
 * completo, que nunca deja de estar disponible. No bloquea nada: se puede cerrar en cualquier
 * paso y «Publicar» sigue siendo una decisión de la persona.
 */
export function AsistenteInicial() {
  const { abierto, cerrar } = useAsistente();
  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && cerrar()}>
      <DialogContent
        showClose={false}
        className="h-[min(94dvh,46rem)] w-[calc(100vw-1rem)] max-w-4xl gap-0 overflow-hidden p-0"
      >
        {abierto && <Cuerpo onCerrar={cerrar} />}
      </DialogContent>
    </Dialog>
  );
}

function Cuerpo({ onCerrar }: { onCerrar: () => void }) {
  const doc = useDocumento();
  const { invitation, modules, theme, aplicar, portadaDePlantilla, uploadCtx, alternarPublicado } = doc;
  const [paso, setPaso] = useState(0);
  // El tema con el que se abrió: «Los de la plantilla» vuelve a él.
  const temaInicial = useRef(theme);
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titulo.current?.focus();
  }, [paso]);

  const despachar = (acciones: Accion[]) => acciones.forEach((a) => aplicar(a));

  const vista = useMemo<PublicInvitation>(
    () => ({
      id: invitation.id,
      title: invitation.title,
      slug: invitation.slug,
      event_type: invitation.event_type,
      event_date: invitation.event_date || null,
      theme_config: theme as unknown as Record<string, unknown>,
      owner_name: null,
      owner_username: "",
      plan_code: null,
      modules: modules.map((m) => ({ ...m })),
    }),
    [invitation, modules, theme],
  );

  const pasos = useMemo(
    () =>
      progresoEsencial({
        fechaDelEvento: invitation.event_date,
        modulos: modules,
        portadaDeLaPlantilla: portadaDePlantilla,
      }),
    [invitation.event_date, modules, portadaDePlantilla],
  );

  const paletaActiva = PALETAS.find(
    (p) => p.background === theme.colors.background && p.primary === theme.colors.primary,
  )?.clave;

  function elegirPaleta(clave: PaletaClave | "") {
    const base = clave ? aplicarPaleta(theme as unknown as Record<string, unknown>, clave) : temaInicial.current;
    const t = base as unknown as typeof theme;
    aplicar({
      type: "updateTheme",
      patch: { colors: t.colors, mode: t.mode, backgroundImage: t.backgroundImage },
    });
  }

  const lugar = lugarActual(modules);
  const foto = fotoActual(modules);
  const ultimo = paso === PASOS.length - 1;

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] md:grid-cols-[19rem_1fr] md:grid-rows-1">
      <div className="flex items-center justify-center border-b bg-muted/40 p-3 md:border-r md:border-b-0 md:p-6">
        <div
          role="img"
          aria-label="Vista previa de tu invitación"
          inert
          className="h-[11rem] w-[10rem] overflow-y-auto overscroll-contain rounded-[1.25rem] border-4 border-foreground/80 bg-muted md:h-full md:max-h-[34rem] md:w-full md:max-w-[17rem] md:rounded-[1.75rem] md:border-[6px]"
        >
          <PublicInvitationView invitation={vista} vistaPrevia />
        </div>
      </div>

      <div className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
          <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" aria-label="Pasos">
            {PASOS.map((p, i) => (
              <li
                key={p}
                aria-current={i === paso ? "step" : undefined}
                className={cn("font-medium", i === paso ? "text-foreground" : "text-muted-foreground")}
              >
                {i + 1}. {p}
              </li>
            ))}
          </ol>
          <Button variant="ghost" size="sm" className="h-11 shrink-0 sm:h-8" onClick={onCerrar}>
            Ir al editor
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <DialogTitle ref={titulo} tabIndex={-1} className="font-display text-xl outline-none">
            {paso === 0 && "Tu evento y tus colores"}
            {paso === 1 && "Los datos de tu evento"}
            {paso === 2 && "Una foto para la portada"}
            {paso === 3 && "Revisa tu invitación"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            {paso === 0 && "Elige los colores. Todo lo demás lo puedes cambiar después en el editor."}
            {paso === 1 && "Lo que escribas aquí aparece al instante en la invitación."}
            {paso === 2 && "Es opcional. Puedes subirla ahora o más tarde."}
            {paso === 3 && "Estos son los puntos esenciales. Puedes publicar cuando quieras."}
          </DialogDescription>

          {paso === 0 && (
            <div className="mt-5 flex flex-col gap-5">
              <p className="text-sm">
                <span className="font-medium">{invitation.event_type || "Tu evento"}</span>
                <span className="text-muted-foreground"> · </span>
                <Link
                  href={`/plantillas${invitation.event_type ? `?evento=${encodeURIComponent(invitation.event_type)}` : ""}`}
                  className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Elegir otra plantilla
                </Link>
              </p>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">Colores</legend>
                <div className="flex flex-wrap gap-2">
                  <Opcion nombre="asistente-paleta" activa={!paletaActiva} onElegir={() => elegirPaleta("")}>
                    Los de la plantilla
                  </Opcion>
                  {PALETAS.map((p) => (
                    <label
                      key={p.clave}
                      title={p.etiqueta}
                      className={cn(
                        "flex size-11 cursor-pointer items-center justify-center rounded-full border-2",
                        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                        paletaActiva === p.clave ? "border-foreground" : "border-transparent",
                      )}
                    >
                      <input
                        type="radio"
                        name="asistente-paleta"
                        checked={paletaActiva === p.clave}
                        onChange={() => elegirPaleta(p.clave)}
                        className="sr-only"
                      />
                      <span className="sr-only">{p.etiqueta}</span>
                      <span
                        aria-hidden="true"
                        className="size-7 rounded-full border border-black/10"
                        style={{ background: `linear-gradient(135deg, ${p.background} 50%, ${p.primary} 50%)` }}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {paso === 1 && (
            <div className="mt-5 flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="as-nombres">Tus nombres</Label>
                <Input
                  id="as-nombres"
                  defaultValue={nombresActuales(modules, portadaDePlantilla)}
                  maxLength={NOMBRES_MAXIMO}
                  autoComplete="off"
                  placeholder="Sofía y Mateo"
                  onChange={(e) => despachar(accionNombres(modules, portadaDePlantilla, e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="as-fecha">Fecha del evento</Label>
                <Input
                  id="as-fecha"
                  type="date"
                  value={fechaParaInput(invitation.event_date)}
                  onChange={(e) => aplicar(accionFecha(e.target.value))}
                />
              </div>
              {lugar && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="as-lugar">Nombre del lugar</Label>
                    <Input
                      id="as-lugar"
                      value={lugar.nombre}
                      maxLength={160}
                      autoComplete="off"
                      placeholder="Hacienda Los Laureles"
                      onChange={(e) => despachar(accionLugar(modules, "venueName", e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="as-direccion">Dirección</Label>
                    <Input
                      id="as-direccion"
                      value={lugar.direccion}
                      maxLength={300}
                      autoComplete="off"
                      onChange={(e) => despachar(accionLugar(modules, "address", e.target.value))}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {paso === 2 && (
            <div className="mt-5 flex flex-col gap-3">
              {foto ? (
                <>
                  <ImageUploader
                    value={foto.url}
                    ctx={uploadCtx}
                    label="Subir foto"
                    onChange={(url) =>
                      aplicar({ type: "updateConfig", id: foto.id, patch: { imageUrl: url } })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Se guarda comprimida. Si tu plantilla no muestra foto en la portada, la podrás
                    colocar desde el editor.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Esta plantilla no tiene portada con foto. Puedes agregar imágenes desde el editor.
                </p>
              )}
            </div>
          )}

          {paso === 3 && (
            <ul className="mt-5 space-y-3" aria-label="Lo esencial de tu invitación">
              {pasos.map((p) => (
                <li key={p.clave} className="flex items-start gap-2.5 text-sm">
                  {p.hecho ? (
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                  ) : (
                    <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span>
                    <span className={cn("font-medium", p.hecho && "text-muted-foreground")}>
                      {p.etiqueta}
                      <span className="sr-only">{p.hecho ? ": listo" : ": pendiente"}</span>
                    </span>
                    {!p.hecho && <span className="block text-xs text-muted-foreground">{p.ayuda}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 sm:px-6">
          <Button variant="ghost" className="h-11 sm:h-9" disabled={paso === 0} onClick={() => setPaso(paso - 1)}>
            Atrás
          </Button>
          {ultimo ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-11 sm:h-9"
                onClick={() => {
                  onCerrar();
                  alternarPublicado();
                }}
              >
                Publicar
              </Button>
              <Button className="h-11 sm:h-9" onClick={onCerrar}>
                Seguir en el editor
              </Button>
            </div>
          ) : (
            <Button className="h-11 sm:h-9" onClick={() => setPaso(paso + 1)}>
              {paso === 2 && !foto?.url ? "Omitir" : "Siguiente"}
            </Button>
          )}
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
