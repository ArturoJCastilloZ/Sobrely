"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { signOut } from "@/lib/auth/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Navegación del header del dashboard. En desktop muestra los enlaces en línea;
 * en móvil colapsa los secundarios en un menú para no desbordar el viewport (el
 * botón "Cerrar sesión" se salía de pantalla en celular).
 */
export function DashboardNav({
  showAdmin,
  email,
}: {
  showAdmin: boolean;
  email: string;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Desktop: enlaces en línea */}
      <div className="hidden items-center gap-3 sm:flex">
        {showAdmin ? (
          <Button
            render={<Link href="/admin" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
          >
            Admin
          </Button>
        ) : null}
        <Button
          render={<Link href="/dashboard/referrals" />}
          nativeButton={false}
          variant="ghost"
          size="sm"
        >
          Referidos
        </Button>
        <Button
          render={<Link href="/dashboard/billing" />}
          nativeButton={false}
          variant="ghost"
          size="sm"
        >
          Facturación
        </Button>
        <span className="text-sm text-muted-foreground">{email}</span>
        <ThemeToggle />
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Cerrar sesión
          </Button>
        </form>
      </div>

      {/* Móvil: tema + menú */}
      <div className="flex items-center gap-1 sm:hidden">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                aria-label="Menú"
                className="h-11 w-11 p-0"
              />
            }
          >
            <Menu className="size-7" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            {showAdmin ? (
              <DropdownMenuItem
                render={<Link href="/admin" />}
                className="px-3 py-2.5 text-base"
              >
                Admin
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              render={<Link href="/dashboard/referrals" />}
              className="px-3 py-2.5 text-base"
            >
              Referidos
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/dashboard/billing" />}
              className="px-3 py-2.5 text-base"
            >
              Facturación
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <DropdownMenuItem
                render={<button type="submit" className="w-full" />}
                variant="destructive"
                className="px-3 py-2.5 text-base"
              >
                Cerrar sesión
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
