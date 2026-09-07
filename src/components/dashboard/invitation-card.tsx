"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLinkIcon, MoreHorizontalIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
}: {
  invitation: InvitationSummary;
  username: string;
}) {
  const [pending, startTransition] = useTransition();
  const [borrando, setBorrando] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteInvitation(invitation.id);
        toast.success("Invitación eliminada.");
      } catch {
        toast.error("No se pudo eliminar.");
      }
    });
  }

  const verUrl = `/${username}/${invitation.slug}`;

  return (
    <Card className="transition-shadow duration-(--ed-base) ease-(--ed-ease-out) hover:shadow-(--ed-shadow-panel)">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-[length:var(--ed-text-lg)]/(--ed-leading-lg) tracking-(--ed-tracking-lg)">
            {invitation.title}
          </CardTitle>
          <Badge variant={invitation.is_published ? "default" : "secondary"}>
            {invitation.is_published ? "Publicada" : "Borrador"}
          </Badge>
        </div>
        <CardDescription>
          /{invitation.slug}
          {invitation.event_type ? ` · ${invitation.event_type}` : ""}
        </CardDescription>
      </CardHeader>

      {/*
        Antes esta fila tenía hasta CINCO botones del mismo tamaño y peso, con
        "Eliminar" como par visual de "Editar". Ahora las dos acciones que se
        usan a diario quedan en la fila, y las demás bajan a un menú: un
        destructivo no compite por atención con la acción principal.
      */}
      <CardContent className="flex items-center gap-2">
        <Button size="sm" render={<Link href={`/editor/${invitation.id}`} />} nativeButton={false}>
          Editar
        </Button>
        <Button
          size="sm"
          variant="outline"
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
                size="icon-sm"
                aria-label={`Más acciones para ${invitation.title}`}
                className="ml-auto"
              />
            }
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {invitation.is_published && username && (
              <DropdownMenuItem
                render={<a href={verUrl} target="_blank" rel="noopener noreferrer" />}
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
