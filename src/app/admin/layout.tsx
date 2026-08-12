import Link from "next/link";
import { LogoLockup } from "@/components/brand/logo-lockup";
import { requireAdmin } from "@/lib/auth/admin";
import { Button } from "@/components/ui/button";

/**
 * Layout del panel admin (Fase 8.7). Gate duro server-side: `requireAdmin()`
 * redirige a quien no sea admin antes de renderizar cualquier contenido.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-muted/30">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link href="/admin" aria-label="Sobrely — inicio">
              <LogoLockup markClassName="h-7 w-7" wordClassName="text-lg" />
            </Link>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Admin
            </span>
          </div>
          <Button
            render={<Link href="/dashboard" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
          >
            ← Dashboard
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
