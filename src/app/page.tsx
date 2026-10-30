import type { Metadata } from "next";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoLockup } from "@/components/brand/logo-lockup";
import { createClient } from "@/lib/supabase/server";
import { JsonLd } from "@/components/seo/json-ld";
import { EVENT_LANDING_LIST } from "@/lib/seo/event-landings";
import { LOCAL_BUSINESS_LD, WEBSITE_LD } from "@/lib/seo/site";
import { LocalLine } from "@/components/seo/local-line";
import { billingPitch } from "@/lib/billing/value-prop";
import { HeroPlantillas, type PlantillaHero } from "@/components/landing/hero-plantillas";
import { ComoFunciona, CtaFinal, PaseQr } from "@/components/landing/secciones";
import { DemoEnVivo } from "@/components/landing/demo-en-vivo";
import { MuestraEventos, type PlantillaMuestra } from "@/components/landing/muestra-eventos";
import { metadatosSociales } from "@/lib/seo/social";

export const metadata: Metadata = {
  // Homepage: título absoluto (ignora el template "%s · Sobrely") con keywords.
  title: {
    absolute: "Invitaciones digitales para boda, XV años y más — Sobrely",
  },
  // 151 caracteres: Google trunca cerca de 155 y la anterior medía 210, así que
  // se cortaba en resultados. Abre con el QR porque es la consulta que más
  // impresiones trae según Search Console, y es lo que nos diferencia.
  description:
    "Invitaciones digitales con pase QR y control de acceso en la entrada. Confirmación de asistencia en un panel. Para bodas, XV años y eventos de empresa.",
  alternates: { canonical: "/" },
  ...metadatosSociales({
    titulo: "Invitaciones digitales para boda, XV años y más — Sobrely",
    descripcion:
      "Invitaciones digitales con pase QR y control de acceso en la entrada. Confirmación de asistencia en un panel. Para bodas, XV años y eventos de empresa.",
    ruta: "/",
  }),
};

// Preguntas frecuentes: contenido visible + FAQPage JSON-LD (deben coincidir).
const FAQS: { q: string; a: string }[] = [
  {
    q: "¿Qué es una invitación digital?",
    a: "Es una invitación que se comparte por un enlace en lugar de en papel. Tus invitados la abren en el celular, ven todos los detalles del evento (fecha, ubicación, itinerario) y confirman su asistencia en línea.",
  },
  {
    q: "¿Para qué eventos puedo usar Sobrely?",
    a: "Para bodas, XV años, cumpleaños, baby showers y eventos corporativos. Eliges un diseño según el tipo de evento y lo personalizas a tu gusto.",
  },
  {
    q: "¿Cuánto cuesta hacer una invitación digital?",
    a: billingPitch().faqAnswer,
  },
  {
    q: "¿Mis invitados necesitan instalar una app?",
    a: "No. La invitación se abre en cualquier navegador con solo el enlace; tus invitados no descargan nada.",
  },
  {
    q: "¿Puedo saber quién confirmó su asistencia?",
    a: "Sí. Recibes las confirmaciones en tu panel y ves cuántas personas asistirán. Con la lista de invitados del plan Premium también puedes darle a cada invitado un pase con código QR para el control de acceso en la entrada.",
  },
];

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pitch = billingPitch();

  // Tres plantillas reales para el hero (XV años, boda, cumpleaños). Pública por RLS; si la
  // consulta falla o faltan, el hero se queda sin imagen y centrado, nunca se rompe.
  const { data: filas } = await supabase
    .from("templates")
    .select("id, slug, name, event_type, preview_image_url")
    .eq("is_active", true)
    .in("event_type", ["XV años", "Boda", "Cumpleaños", "Baby shower", "Corporativo"])
    .order("name");
  // OJO: sin `.not("preview_image_url", "is", null)` en la consulta. Ese filtro dejaba fuera a las
  // plantillas sin imagen guardada y el conteo de «Ver N plantillas» salía menor que el que muestra
  // la galería (en la base local: 10 por tipo en vez de 13/12/12/12/11). El filtro va solo donde
  // hace falta una imagen: elegir la portada de cada tipo.
  const porEvento = (tipo: string) =>
    (filas ?? []).find((f) => f.event_type === tipo && f.preview_image_url) as
      | PlantillaHero
      | undefined;
  const [xv, boda, cumple] = [porEvento("XV años"), porEvento("Boda"), porEvento("Cumpleaños")];
  const vistaPrevia = xv && boda && cumple ? ([xv, boda, cumple] as const) : null;
  // La tira de la sección de eventos: una por tipo, en este orden, las que existan.
  const muestra = ["Boda", "XV años", "Cumpleaños", "Baby shower", "Corporativo"]
    .map((tipo) => {
      const p = porEvento(tipo);
      return p ? { ...p, total: (filas ?? []).filter((f) => f.event_type === tipo).length } : undefined;
    })
    .filter((p): p is PlantillaMuestra => Boolean(p));

  // La demo usa una plantilla por tipo de evento (las mismas de la tira de arriba).
  const demo = muestra.map((m) => {
    const fila = (filas ?? []).find((f) => f.slug === m.slug);
    return { id: String(fila?.id ?? ""), slug: m.slug, event_type: m.event_type };
  }).filter((d) => d.id);

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Link href="/" aria-label="Sobrely — inicio">
          <LogoLockup />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {/*
            Oculto por debajo de `sm`: este header ya desbordaba 88 px a 375 con
            cuatro botones (medido). En móvil la galería la ofrece el botón
            principal del hero, dos dedos más abajo, así que aquí no se pierde
            navegación.
          */}
          <Button
            render={<Link href="/plantillas" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
          >
            Plantillas
          </Button>
          {/* Oculto en móvil por el mismo desborde (ahora con el interruptor de tema, +40 px);
              el enlace al blog sigue en el pie. */}
          <Button
            render={<Link href="/blog" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
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
          {user ? (
            <Button render={<Link href="/dashboard" />} nativeButton={false} size="sm">
              Ir al dashboard
            </Button>
          ) : (
            <>
              {/*
                «Iniciar sesión» se esconde por debajo de `sm`, y no es una
                decision estetica: MEDIDO a 375x812 en produccion, el `nav` del
                header mide 340 px y la pagina desbordaba 88 px en horizontal
                (scrollWidth 463 contra clientWidth 375). Esta es la unica de
                las cuatro paginas con este header que lleva CUATRO botones
                —`/pricing` 208 px, `/blog` 231, la landing de evento 174, las
                tres sin desborde—, asi que el defecto es del acumulado, no del
                componente.

                Se elige ESTE y no otro porque es el unico REDUNDANTE en movil:
                el hero ofrece «Ya tengo cuenta» dos dedos mas abajo. Quitar
                «Precios» o «Blog» habria costado navegacion que no esta
                duplicada en ningun sitio.
              */}
              <Button
                render={<Link href="/login" />}
                nativeButton={false}
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
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

      <section
        className={
          vistaPrevia
            ? "mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-8"
            : "mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-20 text-center"
        }
      >
        <div
          className={
            vistaPrevia
              ? "flex flex-col items-center gap-6 text-center lg:items-start lg:text-left"
              : "contents"
          }
        >
          <span className="rounded-full border border-brand-gold/40 bg-brand-gold/10 px-3 py-1 text-xs font-medium text-brand-gold-deep dark:text-brand-gold">
            Invitaciones digitales, sin complicaciones
          </span>
          <h1
            className={`font-display text-balance text-4xl font-bold tracking-tight ${
              vistaPrevia ? "sm:text-5xl" : "sm:text-6xl"
            }`}
          >
            Crea invitaciones digitales dinámicas y{" "}
            <span className="text-brand-gold-deep italic">personalizables</span>
          </h1>
          <p className="max-w-xl text-balance text-muted-foreground">
            Elige un diseño, personalízalo y compártelo con un enlace. Tus invitados
            confirman su asistencia y entran con un pase QR.
          </p>
          {/*
            UN solo botón dominante. Sin sesión va a la GALERÍA (elegir una plantilla abre el
            editor sin pedir cuenta; la cuenta se pide al publicar). «Ya tengo cuenta» pasa a
            enlace de texto: antes competía con el botón principal con el mismo peso, y el
            encabezado ya trae «Iniciar sesión».
          */}
          <div className="flex flex-col items-center gap-3 sm:flex-row lg:items-center">
            <Button
              render={<Link href={user ? "/dashboard" : "/plantillas"} />}
              nativeButton={false}
              size="lg"
              className="bg-brand-gold text-brand-ink hover:bg-brand-gold-deep hover:text-white"
            >
              {user ? "Ir al dashboard" : "Empezar a diseñar"}
            </Button>
            {!user && (
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Ya tengo cuenta
              </Link>
            )}
          </div>
          {/* El mecanismo de cobro, donde se decide: "Empieza gratis" a secas no
              dice si hay tarjeta, prueba o versión recortada. */}
          {!user && <p className="text-sm text-muted-foreground">{pitch.micro}</p>}
        </div>
        {vistaPrevia && <HeroPlantillas items={[...vistaPrevia]} />}
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-12">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          ¿Qué vas a celebrar?
        </h2>
        <p className="mx-auto mt-2 max-w-prose text-center text-muted-foreground">
          Elige el tipo de evento y verás plantillas listas para editar.
        </p>
        {muestra.length > 0 && <MuestraEventos items={muestra} />}
        <ul className="mt-4 flex flex-wrap justify-center gap-3">
          {EVENT_LANDING_LIST.map((e) => (
            <li key={e.slug}>
              <Link
                href={`/${e.slug}`}
                className="inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                {e.eyebrow}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {demo.length > 0 && (
        <section className="mx-auto w-full max-w-4xl px-4 pb-12">
          <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Pruébala con tu evento
          </h2>
          <p className="mx-auto mt-2 mb-6 max-w-prose text-center text-muted-foreground">
            Escribe tus nombres y la fecha, elige tus colores y mira cómo queda la invitación.
          </p>
          <DemoEnVivo plantillas={demo} autenticado={!!user} />
        </section>
      )}

      <ComoFunciona />
      <PaseQr />

      <section className="mx-auto w-full max-w-3xl px-4 py-16">
        <JsonLd data={[LOCAL_BUSINESS_LD, WEBSITE_LD, FAQ_LD]} />
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Preguntas frecuentes
        </h2>
        <dl className="mt-8 space-y-6">
          {FAQS.map((f) => (
            <div key={f.q} className="border-b border-border pb-6">
              <dt className="font-semibold text-foreground">{f.q}</dt>
              <dd className="mt-2 text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <CtaFinal conSesion={!!user} micro={pitch.micro} />

      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link href="/blog" className="hover:text-foreground">
            Blog
          </Link>
          <Link href="/privacidad" className="hover:text-foreground">
            Aviso de Privacidad
          </Link>
          <Link href="/terminos" className="hover:text-foreground">
            Términos y Condiciones
          </Link>
        </div>
        <LocalLine className="mt-2" />
        <p className="mt-1">© {new Date().getFullYear()} Sobrely</p>
      </footer>
    </main>
  );
}
