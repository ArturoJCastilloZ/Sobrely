import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TemplateMarketplace } from "@/components/dashboard/template-marketplace";
import type { PlantillaMarketplace } from "@/lib/templates/marketplace";

export const metadata: Metadata = { title: "Plantillas" };

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ evento?: string; q?: string; favoritas?: string }>;
}) {
  const { evento, q, favoritas } = await searchParams;
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("templates")
    // `preview_image_url` llevaba desde la `0001` sin pedirse aqui: la columna
    // existia, las miniaturas no se mostraban, y la galeria de un producto de
    // diseño no enseñaba ni un diseño.
    .select("id, slug, name, description, event_type, preview_image_url")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const list = (templates ?? []) as PlantillaMarketplace[];

  /*
    El filtro se aplica en cliente (§12: son 50 filas), pero el estado inicial
    se lee de la URL AQUI, en el servidor, para que un enlace con `?evento=` se
    pueda compartir y para que recargar no pierda el filtro.

    `evento` se VALIDA contra los tipos que existen de verdad en los datos, en
    vez de pasarse tal cual: un `?evento=cualquier-cosa` dejaria la rejilla
    vacia con todas las pastillas en «Todas», que se lee como un catalogo roto
    y no como un filtro invalido.
  */
  const tiposReales = new Set(
    list.map((t) => t.event_type).filter((t): t is string => Boolean(t)),
  );
  const eventoInicial = evento && tiposReales.has(evento) ? evento : null;

  /*
    Los favoritos se piden en su propia consulta y no con un join sobre
    `templates`: un join los volveria un filtro implicito y una plantilla sin
    favorito podria desaparecer del catalogo segun como resolviera PostgREST la
    relacion. Aqui el catalogo es siempre las 50 y los favoritos son una capa
    encima.

    Se consulta SIN `user_id` en el `where` a proposito: la politica
    `template_favorites_select_own` ya devuelve solo las del dueño —medido, ve
    1 de 2 filas con dos usuarios en la tabla—, asi que repetir el filtro aqui
    seria escribir en el cliente una condicion que ya impone la base. Sin
    sesion la consulta devuelve vacio y el catalogo funciona igual.
  */
  const { data: favs } = await supabase
    .from("template_favorites")
    .select("template_id");
  const favoritosIniciales = (favs ?? []).map((f) => f.template_id as string);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plantillas</h1>
          <p className="text-muted-foreground">
            Elige un diseño para empezar más rápido.
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        /*
          El estado vacio decia «Ejecuta la migración de seed de plantillas» —
          una instruccion de desarrollo mostrada a un cliente que paga. Ahora
          dice lo que el cliente puede HACER, y le deja una salida.

          Este es el catalogo VACIO de verdad, distinto del «ninguna coincide»
          que vive en el marketplace: sin plantillas no hay nada que filtrar,
          asi que ni el buscador ni las pastillas se pintan.
        */
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">Todavía no hay plantillas para mostrar</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Puedes empezar con una invitación en blanco y elegir la temática
            desde el editor.
          </p>
          {/*
            `buttonVariants` sobre el Link, y no `<Button asChild>`: el Button
            de este proyecto no implementa `asChild`, asi que envolverlo
            habria compilado en apariencia y roto el enlace.
          */}
          <Link href="/dashboard" className={cn(buttonVariants(), "mt-4")}>
            Crear invitación en blanco
          </Link>
        </div>
      ) : (
        <TemplateMarketplace
          plantillas={list}
          eventoInicial={eventoInicial}
          consultaInicial={q ?? ""}
          favoritosIniciales={favoritosIniciales}
          soloFavoritosInicial={favoritas === "1"}
        />
      )}
    </div>
  );
}
