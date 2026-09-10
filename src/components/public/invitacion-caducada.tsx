import Link from "next/link";

import { LogoLockup } from "@/components/brand/logo-lockup";
import { Button } from "@/components/ui/button";

/**
 * Lo que ve un invitado cuando la invitación existe y está publicada, pero su
 * acceso caducó.
 *
 * Antes caía en el 404 genérico —«Esta invitación no existe o aún no ha sido
 * publicada»—, que le echa la culpa a quien abre el enlace: la persona tiene el
 * link correcto, lo recibió de quien la invitó, y la aplicación le dice que no
 * existe. Medido en producción: dos invitaciones así, y una con el evento a
 * once meses.
 *
 * NO se filtra ni un dato del evento: ni el nombre del anfitrión, ni la fecha,
 * ni el lugar, ni quién confirmó. El acceso caducó, así que el contenido sigue
 * cerrado; lo único que cambia es que el mensaje dice la verdad y le dice al
 * invitado qué hacer.
 */
export function InvitacionCaducada() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <LogoLockup />
      <h1 className="text-2xl font-bold">Esta invitación ha caducado</h1>
      <p className="max-w-sm text-muted-foreground">
        El enlace es correcto, pero su acceso venció. Pídele a quien te invitó
        que la reactive y podrás verla de nuevo.
      </p>
      <Button render={<Link href="/" />} nativeButton={false} variant="outline">
        Ir al inicio
      </Button>
    </div>
  );
}
