"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deleteInvitation } from "@/lib/invitations/actions";

export type InvitationSummary = {
  id: string;
  title: string;
  slug: string;
  event_type: string | null;
  is_published: boolean;
  updated_at: string;
};

export function InvitationCard({
  invitation,
  username,
}: {
  invitation: InvitationSummary;
  username: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{invitation.title}</CardTitle>
          <Badge variant={invitation.is_published ? "default" : "secondary"}>
            {invitation.is_published ? "Publicada" : "Borrador"}
          </Badge>
        </div>
        <CardDescription>
          /{invitation.slug}
          {invitation.event_type ? ` · ${invitation.event_type}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Button
          size="sm"
          render={<Link href={`/editor/${invitation.id}`} />}
          nativeButton={false}
        >
          Editar
        </Button>
        <Button
          size="sm"
          variant="outline"
          render={<Link href={`/dashboard/invitations/${invitation.id}`} />}
          nativeButton={false}
        >
          Respuestas
        </Button>
        {invitation.is_published && username && (
          <Button
            size="sm"
            variant="outline"
            render={
              <a
                href={`/public/${username}/${invitation.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            nativeButton={false}
          >
            Ver ↗
          </Button>
        )}
        {confirming ? (
          <>
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={handleDelete}
            >
              {pending ? "Eliminando…" : "Confirmar"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Cancelar
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirming(true)}
          >
            Eliminar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
