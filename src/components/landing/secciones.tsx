import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Secciones de la portada debajo del hero. Antes la página saltaba del titular a los chips y
 * a las preguntas frecuentes: no decía cómo se usa ni qué hace distinto a Sobrely.
 */

const PASOS = [
  {
    titulo: "Elige un diseño",
    texto:
      "Explora las plantillas por tipo de evento y abre la que te guste. No necesitas cuenta para empezar.",
  },
  {
    titulo: "Personalízalo",
    texto:
      "Cambia textos, fotos, colores y secciones, y ve cómo queda en el celular mientras editas.",
  },
  {
    titulo: "Publica y comparte",
    texto:
      "Pagas una sola vez al publicar y compartes un enlace único. Tus invitados confirman su asistencia desde ahí.",
  },
] as const;

/** Tres pasos en lista numerada (no tres tarjetas iguales): cada fila se lee de corrido. */
export function ComoFunciona() {
  return (
    <section
      aria-labelledby="como-funciona"
      className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-16 lg:grid-cols-[1fr_1.4fr] lg:gap-16"
    >
      <div>
        <h2
          id="como-funciona"
          className="font-display text-balance text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Tu invitación lista en tres pasos
        </h2>
        <p className="mt-3 max-w-sm text-muted-foreground">
          Armas todo sin pagar y decides después si la publicas.
        </p>
      </div>
      <ol className="divide-y divide-border border-y border-border">
        {PASOS.map((p, i) => (
          <li key={p.titulo} className="flex gap-5 py-6">
            <span
              aria-hidden="true"
              className="w-8 shrink-0 font-display text-4xl font-bold leading-none text-brand-gold-deep tabular-nums dark:text-brand-gold"
            >
              {i + 1}
            </span>
            <div>
              <h3 className="font-semibold text-foreground">{p.titulo}</h3>
              <p className="mt-1 text-muted-foreground">{p.texto}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Esquema de ejemplo de un código QR (no es un código real). Tres marcas de esquina y un
 * patrón fijo: basta para que el pase se lea como pase sin parecer un QR escaneable.
 */
const PATRON = [
  "111111101011111111",
  "100000101100100001",
  "101110100110101101",
  "101110101001101101",
  "101110100101101101",
  "100000101110100001",
  "111111101010111111",
  "000000001101000000",
  "110101110010110110",
  "001010001101001001",
  "101101110010111010",
  "000000001001010101",
  "111111101110010110",
  "100000100101101001",
  "101110101010011010",
  "101110100111100101",
  "100000101001011010",
  "111111101100110111",
].map((fila) => [...fila].map((c) => c === "1"));

function EsquemaQr() {
  const n = PATRON.length;
  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      role="img"
      aria-label="Ejemplo ilustrativo de un código QR"
      className="size-36 text-brand-ink"
      shapeRendering="crispEdges"
    >
      {PATRON.flatMap((fila, y) =>
        fila.map((on, x) =>
          on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null,
        ),
      )}
    </svg>
  );
}

const VENTAJAS = [
  "Con Premium, cada invitado recibe su pase con código QR.",
  "Confirmaciones de asistencia en un solo panel.",
  "Ves cuántas personas asistirán.",
] as const;

/** Lo que diferencia a Sobrely, antes solo en la descripción SEO y en una respuesta del FAQ. */
export function PaseQr() {
  return (
    <section
      aria-labelledby="pase-qr"
      className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.2fr_1fr]"
    >
      <div>
        <h2
          id="pase-qr"
          className="font-display text-balance text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Controla la entrada con un pase QR
        </h2>
        <p className="mt-3 max-w-lg text-muted-foreground">
          Con la lista de invitados del plan Premium, cada persona lleva su pase en el celular y tú
          lo revisas en la puerta, sin listas de papel.
        </p>
        <ul className="mt-6 space-y-2.5">
          {VENTAJAS.map((v) => (
            <li key={v} className="flex gap-3 text-foreground">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-gold" />
              {v}
            </li>
          ))}
        </ul>
      </div>
      <div className="mx-auto w-full max-w-xs rounded-2xl border border-border bg-card p-6 shadow-[0_18px_40px_-22px_rgb(17_24_39/0.4)] sm:rotate-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Pase de entrada · ejemplo
        </p>
        <p className="mt-2 font-display text-lg font-bold">Familia Hernández</p>
        <p className="text-sm text-muted-foreground">4 invitados</p>
        <div className="mt-5 flex justify-center rounded-xl bg-white p-3">
          <EsquemaQr />
        </div>
      </div>
    </section>
  );
}

/** Cierre de la página: repite la acción principal para quien llegó hasta aquí sin decidir. */
export function CtaFinal({ conSesion, micro }: { conSesion: boolean; micro: string }) {
  return (
    <section
      aria-labelledby="cta-final"
      className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-4 py-16 text-center"
    >
      <h2
        id="cta-final"
        className="font-display text-balance text-2xl font-bold tracking-tight sm:text-3xl"
      >
        Empieza con tu primera invitación
      </h2>
      <Button
        render={<Link href={conSesion ? "/dashboard" : "/plantillas"} />}
        nativeButton={false}
        size="lg"
        className="bg-brand-gold text-brand-ink hover:bg-brand-gold-deep hover:text-white"
      >
        {conSesion ? "Ir al dashboard" : "Empezar a diseñar"}
      </Button>
      {!conSesion && <p className="text-sm text-muted-foreground">{micro}</p>}
    </section>
  );
}
