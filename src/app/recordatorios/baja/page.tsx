import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { confirmarBajaRecordatorios } from "@/lib/recordatorios/acciones";
import { verificarBaja } from "@/lib/recordatorios/baja-token";

/**
 * Página del enlace «Dejar de recibir recordatorios». Pide un clic de
 * confirmación en vez de dar la baja al abrirse: abrir el enlace con GET no debe
 * tener efectos (escáneres y vistas previas de correo lo piden solos).
 *
 * La URL lleva el id de la persona y su token: `noindex` y sin `referrer`, para
 * que no se filtren ni a buscadores ni a ningún sitio al que se navegue desde aquí.
 */
export const metadata: Metadata = {
  title: "Recordatorios · Sobrely",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

export default async function BajaRecordatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; t?: string; hecho?: string; error?: string }>;
}) {
  const { u = "", t = "", hecho, error } = await searchParams;

  async function confirmar(formData: FormData) {
    "use server";
    const r = await confirmarBajaRecordatorios(formData);
    redirect(`/recordatorios/baja?${r.ok ? "hecho=1" : "error=1"}`);
  }

  const valido = verificarBaja(u, t, process.env.REMINDER_SECRET);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-12">
      <Card className="w-full">
        {hecho ? (
          <CardHeader>
            <CardTitle>Listo</CardTitle>
            <CardDescription>
              Ya no te enviaremos recordatorios. Si cambias de opinión, puedes volver a
              activarlos desde tu panel.
            </CardDescription>
          </CardHeader>
        ) : valido ? (
          <>
            <CardHeader>
              <CardTitle>¿Dejar de recibir recordatorios?</CardTitle>
              <CardDescription>
                No te volveremos a escribir sobre tus invitaciones sin publicar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={confirmar}>
                <input type="hidden" name="u" value={u} />
                <input type="hidden" name="t" value={t} />
                <Button type="submit" size="touch" className="w-full">
                  Dejar de recibir recordatorios
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <CardHeader>
            <CardTitle>{error ? "No pudimos darte de baja" : "Enlace no válido"}</CardTitle>
            <CardDescription>
              Este enlace no es válido o ya no funciona. Puedes desactivar los
              recordatorios desde tu panel, o escribirnos a contacto@sobrely.com.
            </CardDescription>
          </CardHeader>
        )}
      </Card>
    </main>
  );
}
