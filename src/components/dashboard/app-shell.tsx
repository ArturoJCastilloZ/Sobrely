import Link from "next/link";
import { LogoLockup } from "@/components/brand/logo-lockup";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

/**
 * Shell de la aplicación: header + sidebar + contenido.
 *
 * Lo comparten el panel y el admin. Antes cada uno tenía su propio layout casi
 * idéntico, y por eso entrar a Admin hacía DESAPARECER el sidebar: no era una
 * decisión, era una copia que se quedó atrás.
 *
 * El scroll es de la aplicación, no del documento. La caja exterior mide la
 * altura de la ventana y no desborda; sólo `<main>` scrollea. Sin esto el
 * sidebar se iba hacia arriba junto con el contenido, que es lo que delata a un
 * panel hecho como página web y no como herramienta.
 *
 * `min-h-0` en la fila no es decorativo: sin él, un hijo flex se niega a
 * encogerse por debajo de su contenido y el contenedor desborda igual, con el
 * `overflow-y-auto` puesto y sin efecto.
 */
export function AppShell({
  showAdmin,
  email,
  displayName,
  avatarUrl,
  badge,
  children,
}: {
  showAdmin: boolean;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  /** Distintivo junto al logo, p. ej. "Admin". */
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <header className="shrink-0 border-b">
        <div className="flex w-full items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" aria-label="Sobrely — inicio">
              <LogoLockup markClassName="h-7 w-7" wordClassName="text-lg" />
            </Link>
            {badge}
          </div>
          <DashboardNav
            showAdmin={showAdmin}
            email={email}
            displayName={displayName}
            avatarUrl={avatarUrl}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <DashboardSidebar showAdmin={showAdmin} />
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-8 lg:px-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
