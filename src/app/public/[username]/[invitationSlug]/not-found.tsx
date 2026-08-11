import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PublicNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-lg font-bold tracking-tight">
        Sobre<span className="text-primary">ly</span>
      </span>
      <h1 className="text-2xl font-bold">Invitación no disponible</h1>
      <p className="max-w-sm text-muted-foreground">
        Esta invitación no existe o aún no ha sido publicada.
      </p>
      <Button render={<Link href="/" />} nativeButton={false} variant="outline">
        Ir al inicio
      </Button>
    </div>
  );
}
