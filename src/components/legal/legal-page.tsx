import Link from "next/link";
import { LogoLockup } from "@/components/brand/logo-lockup";

/**
 * Shell común para páginas legales (privacidad, términos). Header con el lockup,
 * contenedor de lectura y footer. Contenido = children (secciones).
 */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5">
        <Link href="/" aria-label="Sobrely — inicio">
          <LogoLockup />
        </Link>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Inicio
        </Link>
      </header>

      <article className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Última actualización: {updated}
        </p>
        {intro && (
          <p className="mt-4 leading-relaxed text-muted-foreground">{intro}</p>
        )}
        <div className="mt-8 space-y-8 leading-relaxed text-muted-foreground [&_a]:text-brand-gold [&_a]:underline [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-1 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
          {children}
        </div>
      </article>

      <footer className="mx-auto w-full max-w-3xl px-4 py-8 text-sm text-muted-foreground">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/privacidad" className="hover:text-foreground">
            Aviso de Privacidad
          </Link>
          <Link href="/terminos" className="hover:text-foreground">
            Términos y Condiciones
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Precios
          </Link>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} Sobrely</p>
      </footer>
    </main>
  );
}
