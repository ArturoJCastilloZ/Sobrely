import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoLockup } from "@/components/brand/logo-lockup";

/** Header + footer compartidos de las páginas del blog. */
export function BlogShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5">
        <Link href="/" aria-label="Sobrely — inicio">
          <LogoLockup />
        </Link>
        <nav className="flex items-center gap-2">
          <Button
            render={<Link href="/blog" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
          >
            Blog
          </Button>
          <Button
            render={<Link href="/pricing" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
          >
            Precios
          </Button>
          <Button render={<Link href="/register" />} nativeButton={false} size="sm">
            Crear cuenta
          </Button>
        </nav>
      </header>

      {children}

      <footer className="mx-auto w-full max-w-3xl px-4 py-6 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link href="/blog" className="hover:text-foreground">
            Blog
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Precios
          </Link>
          <Link href="/privacidad" className="hover:text-foreground">
            Aviso de Privacidad
          </Link>
          <Link href="/terminos" className="hover:text-foreground">
            Términos y Condiciones
          </Link>
        </div>
        <p className="mt-2">© {new Date().getFullYear()} Sobrely</p>
      </footer>
    </main>
  );
}
