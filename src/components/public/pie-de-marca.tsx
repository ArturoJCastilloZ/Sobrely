import type { BrandingLevel } from "@/lib/billing/types";
import { SITE_URL } from "@/lib/seo/site";

/**
 * Destino del pie «Hecho con Sobrely»: la home, que explica el producto y
 * lleva al catálogo y a precios. Las UTM solo dicen de dónde viene la visita
 * (invitación → pie); NO llevan el usuario, el slug ni el token del invitado,
 * que serían datos del cliente.
 */
export function enlaceDeMarca(base: string = SITE_URL): string {
  const url = new URL("/", base);
  url.searchParams.set("utm_source", "invitacion");
  url.searchParams.set("utm_medium", "pie");
  url.searchParams.set("utm_campaign", "hecho-con-sobrely");
  return url.toString();
}

/**
 * Pie de marca de la invitación pública. Lo que muestra cada plan lo decide
 * `branding` (`plans.ts`): `full` «Hecho con Sobrely», `reduced` solo
 * «Sobrely», más chico, y `none` nada. Este componente no cambia esa
 * promesa: solo convierte la marca, donde ya se ve, en un enlace.
 *
 * - `rel="noreferrer"`: la invitación vive en el mismo dominio y el enlace de
 *   invitado lleva el token en la ruta (`/g/<token>`). Sin esto el navegador
 *   mandaría esa URL como `Referer` a la home y a su analítica.
 * - Pestaña nueva: el invitado no pierde la invitación que estaba viendo.
 * - La opacidad va en el texto, no en el `<footer>`, para que el anillo de
 *   foco se vea entero; al enfocar o pasar el puntero la marca sube a opaca.
 *   No baja de 0.80 en ningún plan: es lo mínimo que da 4.5:1 (WCAG 1.4.3)
 *   sobre las 22 paletas medidas (peor caso `kawaii`, 4.66:1). Antes, 0.35 en
 *   `reduced` (≤ 2.1:1) y 0.60 en `full` (3.2–4.0:1 en las claras).
 * - El `sr-only` avisa de la pestaña nueva a quien no la ve abrirse.
 * - En la vista previa privada no hay enlace: ahí la invitación solo se mira,
 *   y los clics del propio anfitrión ensuciarían la atribución.
 */
export function PieDeMarca({
  branding,
  enlazar = true,
}: {
  branding: BrandingLevel;
  enlazar?: boolean;
}) {
  if (branding === "none") return null;
  const completo = branding === "full";
  const contenido = (
    <>
      {completo ? "Hecho con " : ""}
      Sobre<span style={{ color: "var(--inv-primary)" }}>ly</span>
    </>
  );
  const opacidad = "opacity-80";
  return (
    <footer
      className={
        completo
          ? "px-6 py-8 text-center text-xs @2xl/inv:text-sm @4xl/inv:py-12 @4xl/inv:text-base"
          : "px-6 py-6 text-center text-[10px] @2xl/inv:text-xs"
      }
    >
      {enlazar ? (
        <a
          href={enlaceDeMarca()}
          target="_blank"
          rel="noopener noreferrer"
          className={`${opacidad} -my-1 inline-block rounded-sm px-2 py-1 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current`}
        >
          {contenido}
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </a>
      ) : (
        <span className={opacidad}>{contenido}</span>
      )}
    </footer>
  );
}
