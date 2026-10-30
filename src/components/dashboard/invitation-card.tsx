"use client";

import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLinkIcon, MoreHorizontalIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { deleteInvitation } from "@/lib/invitations/actions";
import {
  AVISO_DE_CADUCADA,
  ETIQUETA_DE_ESTADO,
  estadoDeInvitacion,
} from "@/lib/invitations/estado";

export type InvitationSummary = {
  id: string;
  title: string;
  slug: string;
  event_type: string | null;
  is_published: boolean;
  updated_at: string;
  rsvp_mode: "open" | "guest_list";
};

export function InvitationCard({
  invitation,
  username,
  entitlementActive,
}: {
  invitation: InvitationSummary;
  username: string;
  /**
   * Vigencia resuelta en el servidor por `is_entitlement_active`. `null` /
   * ausente = no se resolvió (p.ej. borrador, que no la necesita).
   */
  entitlementActive?: boolean | null;
}) {
  const [pending, startTransition] = useTransition();
  const [borrando, setBorrando] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteInvitation(invitation.id);
        toast.success("Invitación eliminada.");
      } catch (e) {
        // deleteInvitation hace redirect("/login") con la sesion caducada: sin
        // esto se iria al login pintando "No se pudo eliminar".
        unstable_rethrow(e);
        toast.error("No se pudo eliminar.");
      }
    });
  }

  const verUrl = `/${username}/${invitation.slug}`;

  const estado = estadoDeInvitacion({
    isPublished: invitation.is_published,
    entitlementActive: entitlementActive ?? null,
  });
  const caducada = estado === "caducada";

  return (
    <Card className="transition-shadow duration-(--ed-base) ease-(--ed-ease-out) hover:shadow-(--ed-shadow-panel)">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-[length:var(--ed-text-lg)]/(--ed-leading-lg) tracking-(--ed-tracking-lg)">
            {invitation.title}
          </CardTitle>
          <Badge
            variant={
              caducada
                ? "destructive"
                : estado === "publicada"
                  ? "default"
                  : "secondary"
            }
          >
            {ETIQUETA_DE_ESTADO[estado]}
          </Badge>
        </div>
        <CardDescription>
          /{invitation.slug}
          {invitation.event_type ? ` · ${invitation.event_type}` : ""}
        </CardDescription>
        {caducada && (
          <p className="text-[length:var(--ed-text-sm)]/(--ed-leading-sm) text-destructive">
            {AVISO_DE_CADUCADA}
          </p>
        )}
      </CardHeader>

      {/*
        Antes esta fila tenía hasta CINCO botones del mismo tamaño y peso, con
        "Eliminar" como par visual de "Editar". Ahora las dos acciones que se
        usan a diario quedan en la fila, y las demás bajan a un menú: un
        destructivo no compite por atención con la acción principal.
      */}
      {/*
        MÓVIL: los tres controles suben a 44 px (`touch` / `icon-touch`) y en
        escritorio vuelven a `sm` por breakpoint. Medido a 375x812: el dashboard
        tenía 27 de 28 controles por debajo del mínimo táctil, y la causa es
        ésta — `size="sm"` es `h-7`, o sea 28 px. El propio `button.tsx` declara
        que `touch` es obligatorio en CTAs primarios, y esta tarjeta es el CTA
        principal del producto.

        NO se esconde «Respuestas» en el menú para ganar sitio: el comentario de
        arriba dice que las dos acciones de diario se dejaron en la fila a
        propósito, y a 375 las dos caben en táctil (medido: ~222 px de los ~327
        disponibles).
      */}
      <CardContent className="flex items-center gap-2">
        <Button
          size="touch"
          className="lg:h-7 lg:gap-1 lg:px-2.5 lg:text-[0.8rem]"
          render={<Link href={`/editor/${invitation.id}`} />}
          nativeButton={false}
        >
          Editar
        </Button>
        <Button
          size="touch"
          variant="outline"
          className="lg:h-7 lg:gap-1 lg:px-2.5 lg:text-[0.8rem]"
          render={<Link href={`/dashboard/invitations/${invitation.id}`} />}
          nativeButton={false}
        >
          {invitation.rsvp_mode === "guest_list" ? "Invitados" : "Respuestas"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-touch"
                aria-label={`Más acciones para ${invitation.title}`}
                className="ml-auto lg:size-7"
              />
            }
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {estado === "publicada" && username && (
              <DropdownMenuItem
                render={
                  <a href={verUrl} target="_blank" rel="noopener noreferrer" />
                }
                className="gap-2.5"
              >
                <ExternalLinkIcon className="size-4" />
                Ver publicada
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              variant="destructive"
              className="gap-2.5"
              onClick={() => setBorrando(true)}
            >
              <Trash2Icon className="size-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>

      {/*
        La confirmación era un par de botones en línea que reemplazaban a la
        fila. Eso obliga a leer para entender qué se va a borrar, y el diálogo
        además puede DECIR la consecuencia: publicada, el enlace muere.
      */}
      <AlertDialog open={borrando} onOpenChange={setBorrando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar «{invitation.title}»?</AlertDialogTitle>
            <AlertDialogDescription>
              {invitation.is_published
                ? "Está publicada: su enlace dejará de funcionar para quien ya lo tenga, y se borran sus confirmaciones. No se puede deshacer."
                : "Se borra la invitación y todo su contenido. No se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending} />
            <AlertDialogAction disabled={pending} onClick={handleDelete}>
              {pending ? "Eliminando…" : "Eliminar invitación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
