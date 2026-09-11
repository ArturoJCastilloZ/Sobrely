"use client";

import Link from "next/link";
import { CreditCardIcon, GiftIcon, LogOutIcon, ShieldCheckIcon } from "lucide-react";

import { Avatar, AvatarImage, AvatarFallback, initialsFrom } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/actions";

/**
 * Menú de cuenta.
 *
 * Sustituye al correo CRUDO que el header mostraba en un `<span>`. Un correo
 * suelto en la barra no es identidad: es un dato que el usuario no pidió ver, y
 * que además se desborda en pantallas medianas.
 *
 * El correo no desaparece —sigue siendo cómo la gente sabe con qué cuenta entró—
 * pero baja a la cabecera del menú, que es donde se consulta, no donde estorba.
 * Las iniciales salen del NOMBRE, nunca del correo: `initialsFrom` existe para
 * eso y trata `display_name` como nullable, que es como está en la BD.
 */
export function AccountMenu({
  email,
  displayName,
  avatarUrl,
  showAdmin,
}: {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  showAdmin: boolean;
}) {
  const nombre = displayName?.trim() || null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menú de cuenta"
        className="flex size-11 items-center justify-center rounded-full transition-colors duration-(--ed-fast) hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <Avatar>
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback>{initialsFrom(nombre)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <div className="flex flex-col gap-0.5 px-2.5 py-2">
          {nombre && (
            <span className="text-[length:var(--ed-text-sm)]/(--ed-leading-sm) font-(--ed-weight-medium) tracking-(--ed-tracking-sm)">
              {nombre}
            </span>
          )}
          {/* `break-all`: un correo largo sin esto ensancha el menú entero. */}
          <span className="text-[length:var(--ed-text-mini)]/(--ed-leading-mini) break-all text-muted-foreground">
            {email}
          </span>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link href="/dashboard/billing" />} className="gap-2.5 px-2.5 py-2">
          <CreditCardIcon className="size-4" />
          Facturación
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/dashboard/referrals" />} className="gap-2.5 px-2.5 py-2">
          <GiftIcon className="size-4" />
          Referidos
        </DropdownMenuItem>
        {showAdmin && (
          <DropdownMenuItem render={<Link href="/admin" />} className="gap-2.5 px-2.5 py-2">
            <ShieldCheckIcon className="size-4" />
            Admin
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <form action={signOut}>
          {/*
            `nativeButton`: el `render` de este item SÍ es un <button> nativo, y
            `Menu.Item` asume que NO lo es (`nativeButton` por defecto `false`,
            ver `NonNativeButtonProps` en @base-ui/react). Sin declararlo, Base
            UI aplica atributos y manejadores no nativos encima de un <button>
            de verdad —`role`, el `disabled` no nativo— y avisa por consola.
            Los items de arriba NO lo llevan y es correcto: su `render` es un
            <Link>, o sea un <a>, que no es un botón nativo.
            El <button> aquí no es opcional: va dentro de un <form action>, y
            sólo un botón nativo envía el formulario.
          */}
          <DropdownMenuItem
            render={<button type="submit" className="w-full" />}
            nativeButton
            variant="destructive"
            className="gap-2.5 px-2.5 py-2"
          >
            <LogOutIcon className="size-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
