import type { ThemeConfig } from "@/lib/theme/theme";
import { themeCssVars } from "@/lib/theme/theme";
import { cn } from "@/lib/utils";

/**
 * Applies a per-invitation theme (colors, font, spacing) as CSS variables to
 * its subtree. Module previews read these variables (--inv-*) for accents,
 * background and text color.
 *
 * The optional background image behaves like a BACKDROP: it stays put at
 * viewport height while the content scrolls past it, and peeks through in
 * every section that has no background of its own. It is deliberately NOT
 * `background-attachment: fixed` — that breaks in Safari on iOS, and in the
 * editor the scrolling happens inside a panel rather than the window.
 */
export function ThemeScope({
  theme,
  className,
  /**
   * Height of the backdrop layer. Defaults to the small viewport height, which
   * is what the public page wants (the window is the scrollport). A caller
   * whose scrollport is a panel rather than the window passes its own length.
   */
  backdropHeight = "100svh",
  /**
   * Si el telón se queda pegado al scrollport (`true`, el comportamiento
   * público) o se ancla arriba del scope (`false`).
   *
   * Existe por el zoom del editor. `position: sticky` dentro de un ancestro
   * con `transform` calcula su desplazamiento en el espacio SIN escalar y
   * luego se escala, así que el telón DERIVA. Medido en el editor real, con
   * el mismo recorrido de scroll en ambos casos:
   *
   *   zoom 100% → top 49 → 16 → 16   (deriva 33: se pega)
   *   zoom 150% → top 50 → 166 → 332 (deriva 282: se va con el contenido)
   *
   * Derivar se ve como un fallo, no como un efecto. Con el zoom fuera del
   * 100 % el editor pasa a `false`: el telón se queda arriba y quieto, que es
   * predecible. La página pública no tiene `transform` y no se entera.
   */
  backdropSticky = true,
  children,
}: {
  theme: ThemeConfig;
  className?: string;
  backdropHeight?: string;
  backdropSticky?: boolean;
  children: React.ReactNode;
}) {
  const bgImage = theme.backgroundImage?.url;

  return (
    <div
      // `dark` here scopes the invitation to its own mode so the modules'
      // `dark:` niceties (card tints) match its surface — independent of the
      // viewer's app theme. `relative` is the containing block the backdrop
      // slides within.
      //
      // `overflow-x-clip` and NOT `overflow-x-hidden`: `hidden` makes this a
      // scroll container, and a `sticky` child of a scroll container that never
      // scrolls internally never moves — measured, the backdrop scrolled away
      // with the content (top went to -1500 after a 1500 scroll). `clip`
      // recorta exactly the same (same scrollWidth/clientWidth, no horizontal
      // scroll on the page) without creating that scroll container.
      //
      // ⚠️ This clip is NOT safe from callers, and it cannot be made safe here.
      // Measured: tailwind-merge puts `overflow-x-clip` and `overflow-hidden`
      // in the SAME group, so `cn("overflow-x-clip", "overflow-hidden")`
      // collapses to `overflow-hidden` — a caller does not compete with this
      // class, it DELETES it. Moving the clip to an inline `style` does not
      // save it either: a caller's `overflow-hidden` would still set
      // `overflow-y: hidden`, which makes this a scroll container just the
      // same. So the guard is mechanical instead of stylistic —
      // `backdrop-contract.test.ts` scans every file that renders
      // <ThemeScope> and fails if any of them passes an `overflow-*-hidden`.
      className={cn(
        // `inv-scope` es un gancho de CSS, no una utilidad de Tailwind: le da a
        // globals.css un selector estable para el par tipografico (Fase 11 P4)
        // sin tener que tocar los 14 titulos de previews.tsx uno por uno.
        // tailwind-merge no la toca porque no pertenece a ningun grupo suyo.
        "inv-scope relative overflow-x-clip",
        theme.mode === "dark" && "dark",
        className,
      )}
      style={themeCssVars(theme)}
    >
      {bgImage && (
        // The sticky wrapper is zero-height on purpose, so the backdrop takes
        // no space in the flow (the previous `absolute` layers took none
        // either, and the content must not be pushed down). Sticky still
        // slides within the scope because the scope is the containing block.
        <div
          aria-hidden
          data-testid="inv-backdrop"
          data-sticky={backdropSticky ? "si" : "no"}
          className={cn(
            "pointer-events-none top-0 z-0",
            // Ninguna de las dos empuja el contenido: la sticky es de alto
            // CERO con las capas absolutas dentro, y la anclada es `absolute`,
            // que tampoco ocupa flujo.
            //
            // La anclada cubre TODO el scope, no una altura de viewport. Se
            // probaron las tres y esta es la menos mala con el zoom activo:
            //   sticky        -> deriva (medido 282px sobre 663 de scroll)
            //   anclada arriba-> se va del todo (deriva 719 = TODO el
            //                    recorrido) y las secciones de abajo quedan
            //                    SIN fondo
            //   cubriendo todo-> estirada, pero nunca desnuda
            // Con el zoom fuera del 100% se está inspeccionando el layout, no
            // juzgando el fondo; que no falte pesa más que que no se estire.
            backdropSticky ? "sticky h-0" : "absolute inset-0",
          )}
        >
          <div
            className="absolute top-0 left-0 w-full bg-cover bg-center"
            style={{
              backgroundImage: `url("${bgImage}")`,
              height: backdropSticky ? backdropHeight : "100%",
            }}
          />
          {/* Overlay of the surface color keeps text legible over the photo. */}
          <div
            className="absolute top-0 left-0 w-full"
            style={{
              backgroundColor: theme.colors.background,
              opacity: theme.backgroundImage.overlay,
              height: backdropSticky ? backdropHeight : "100%",
            }}
          />
        </div>
      )}
      {children}
    </div>
  );
}
