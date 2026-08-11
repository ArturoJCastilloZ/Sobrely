import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EditorNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">Invitación no encontrada</h1>
      <p className="text-muted-foreground">
        No existe o no tienes acceso a esta invitación.
      </p>
      <Button render={<Link href="/dashboard" />} nativeButton={false}>
        Volver al dashboard
      </Button>
    </div>
  );
}
