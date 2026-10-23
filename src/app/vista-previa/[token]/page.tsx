import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicInvitationView } from "@/components/public/public-invitation";
import { resolverVistaPrevia } from "@/lib/previews/resolver";
import { cargarInvitacionDeVistaPrevia } from "@/lib/previews/cargar";
import { diasRestantes } from "@/lib/previews/token";

/**
 * Vista previa PRIVADA de una invitación (Fase 4): la invitación completa, tal
 * como la verían los invitados, sin haberla publicado ni pagado y sin RSVP real.
 * Es lo que le permite a alguien enseñarle su diseño a su pareja o a su familia
 * antes de decidir pagar.
 *
 * El token va en la RUTA y no en el slug porque el slug es único solo POR
 * USUARIO (`unique (user_id, slug)`): `/…/[slug]/preview` sería ambiguo entre
 * usuarios. El token se busca por su HASH (ver `resolverVistaPrevia`).
 *
 * Reglas de la ruta:
 *   - 404 UNIFORME: inválido, inexistente, vencida y revocada dan exactamente lo
 *     mismo; quien prueba tokens no aprende cuáles existieron.
 *   - Nunca se indexa, ni se cachea, ni se manda el `referrer`: el token es una
 *     credencial y no debe filtrarse por un enlace saliente ni quedar en una
 *     caché compartida.
 *   - Los módulos que escriben en la base (RSVP, firmas) se pintan estáticos.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vista previa · Sobrely",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
  referrer: "no-referrer",
};

export default async function VistaPreviaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const liga = await resolverVistaPrevia(admin, token);
  if (!liga.ok) notFound();

  const invitation = await cargarInvitacionDeVistaPrevia(admin, liga.invitationId);
  if (!invitation) notFound();

  const dias = diasRestantes(liga.expiresAt);

  return (
    <>
      {/*
        Pegajoso arriba y dentro del flujo (no `fixed`): ocupa su propio sitio y
        no tapa el primer bloque de la invitación. El margen superior seguro es
        para el notch en móvil.
      */}
      <div
        role="note"
        className="sticky top-0 z-50 border-b border-border bg-background/95 px-4 py-2 text-center text-sm backdrop-blur supports-[backdrop-filter]:bg-background/85"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))" }}
      >
        <strong className="font-semibold">Vista previa privada.</strong>{" "}
        <span className="text-muted-foreground">
          Así se verá tu invitación. Las confirmaciones y las firmas no funcionan
          aquí
          {dias > 0 ? `, y esta liga vence en ${dias} ${dias === 1 ? "día" : "días"}` : ""}.
        </span>
      </div>
      <PublicInvitationView invitation={invitation} vistaPrevia />
    </>
  );
}
