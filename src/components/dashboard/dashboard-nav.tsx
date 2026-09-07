"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AccountMenu } from "@/components/dashboard/account-menu";
import { signOut } from "@/lib/auth/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Navegación del header del dashboard.
 *
 * Desde `lg` la navegación vive en el sidebar, así que aquí solo quedan tema y
 * cuenta. Por debajo de `lg` no hay sidebar —a propósito: un cajón lateral para
 * cinco enlaces en un teléfono es complejidad sin retorno— así que el menú de
 * navegación se conserva tal cual estaba. Resolvía un problema real: el botón
 * "Cerrar sesión" se salía de pantalla en celular.
 */
export function DashboardNav({
  showAdmin,
  email,
  displayName,
  avatarUrl,
}: {
  showAdmin: boolean;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <ThemeToggle />

      {/* Móvil y tablet: navegación, porque no hay sidebar. */}
      <div className="lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" aria-label="Menú" className="size-11 p-0" />}
          >
            <Menu className="size-6" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem render={<Link href="/dashboard" />} className="px-3 py-2.5">
              Mis eventos
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/templates" />} className="px-3 py-2.5">
              Plantillas
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/animations" />} className="px-3 py-2.5">
              Animaciones
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/dashboard/billing" />} className="px-3 py-2.5">
              Facturación
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/referrals" />} className="px-3 py-2.5">
              Referidos
            </DropdownMenuItem>
            {showAdmin ? (
              <DropdownMenuItem render={<Link href="/admin" />} className="px-3 py-2.5">
                Admin
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <form action={signOut}>
              <DropdownMenuItem
                render={<button type="submit" className="w-full" />}
                variant="destructive"
                className="px-3 py-2.5"
              >
                Cerrar sesión
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desde lg: la navegación está en el sidebar; aquí solo la cuenta. */}
      <div className="hidden lg:block">
        <AccountMenu
          email={email}
          displayName={displayName}
          avatarUrl={avatarUrl}
          showAdmin={showAdmin}
        />
      </div>
    </div>
  );
}
