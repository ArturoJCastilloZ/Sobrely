import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoLockup } from "@/components/brand/logo-lockup";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Link href="/" aria-label="Sobrely — inicio">
          <LogoLockup />
        </Link>
        <nav className="flex items-center gap-2">
          <Button
            render={<Link href="/pricing" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
          >
            Precios
          </Button>
          {user ? (
            <Button render={<Link href="/dashboard" />} nativeButton={false} size="sm">
              Ir al dashboard
            </Button>
          ) : (
            <>
              <Button
                render={<Link href="/login" />}
                nativeButton={false}
                variant="ghost"
                size="sm"
              >
                Iniciar sesión
              </Button>
              <Button render={<Link href="/register" />} nativeButton={false} size="sm">
                Crear cuenta
              </Button>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-20 text-center">
        <span className="rounded-full border border-brand-gold/30 bg-brand-cream/50 px-3 py-1 text-xs font-medium text-brand-gold-deep">
          Invitaciones digitales, sin complicaciones
        </span>
        <h1 className="font-display text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          Crea invitaciones digitales dinámicas y{" "}
          <span className="text-brand-gold-deep italic">personalizables</span>
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground">
          <strong className="font-semibold text-foreground">Sobrely</strong> es
          la plataforma para crear invitaciones digitales para bodas, XV años,
          cumpleaños, baby showers y eventos corporativos: elige un template,
          personaliza módulos y publica tu invitación en una URL única para
          compartirla y recibir confirmaciones de tus invitados.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            render={<Link href={user ? "/dashboard" : "/register"} />}
            nativeButton={false}
            size="lg"
            className="bg-brand-gold text-brand-ink hover:bg-brand-gold-deep hover:text-white"
          >
            {user ? "Ir al dashboard" : "Empieza gratis"}
          </Button>
          <Button
            render={<Link href="/login" />}
            nativeButton={false}
            size="lg"
            variant="outline"
          >
            Ya tengo cuenta
          </Button>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
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
