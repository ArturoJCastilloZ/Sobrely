import { templateToDocument } from "@/lib/invitations/template-render";
import type { PublicInvitation } from "@/lib/invitations/public-types";
import { FECHA_ESCAPARATE } from "@/lib/invitations/template-preview";

/**
 * La invitación de ESCAPARATE de una plantilla: la que ve `/plantilla/<slug>` (y de la que
 * salen sus miniaturas) y la que la vista rápida del catálogo parte para personalizar.
 *
 * Vive aquí y no en el `page.tsx` para que la página y `/api/plantillas/<slug>/documento`
 * produzcan EXACTAMENTE lo mismo, con la misma normalización que `createFromTemplate`: lo que
 * se ve al elegir una plantilla no puede diferir de lo que se recibe.
 */
export function invitacionDePlantilla(
  template: {
    name: string | null;
    event_type: string | null;
    theme_config: unknown;
    modules_config: unknown;
  },
  slug: string,
): PublicInvitation {
  const doc = templateToDocument(template);

  return {
    // Ids sintéticos: esta vista no persiste nada y los módulos interactivos
    // (RSVP, firmas) se renderizan en su forma estática, que es la que
    // corresponde a una vista previa.
    id: `plantilla-${slug}`,
    title: template.name ?? "Plantilla",
    slug,
    event_type: template.event_type ?? null,
    // Fecha FIJA de escaparate. Con `null` el contador cae a su estado vacío y
    // la miniatura sale con «Define la fecha del evento para activar la cuenta
    // regresiva» — copy dirigido al anfitrión, no arte para una galería.
    //
    // La cuenta atrás se calcula contra `now()`, así que por sí sola haría que
    // la misma plantilla diera una imagen distinta cada día. El determinismo
    // NO se arregla quitando la fecha, se arregla congelando el reloj en la
    // captura (`page.clock.setFixedTime`), que es lo que hace el script.
    event_date: FECHA_ESCAPARATE,
    theme_config: {
      ...(doc.theme as unknown as Record<string, unknown>),
      // Animaciones APAGADAS. No es estético: es lo que hace la captura
      // determinista. Medido en el editor, la entrada dura ~300 ms y arranca
      // con el módulo desplazado y en opacidad 0, así que un screenshot que
      // llegue temprano congela un fundido a medias — y con la misma
      // plantilla saldría una imagen distinta en cada corrida. Con esto,
      // `AnimatedModule` renderiza un contenedor plano siempre visible.
      animations: false,
    },
    owner_name: null,
    owner_username: "sobrely",
    // `premium` da branding "none": sin esto, las 50 miniaturas llevarían el
    // pie de "Hecho con Sobrely" quemado en la imagen.
    plan_code: "premium",
    modules: doc.modules.map((m, i) => ({
      id: `${slug}-${i}`,
      module_type: m.module_type,
      sort_order: m.sort_order,
      is_visible: m.is_visible,
      config: m.config,
    })),
  };
}
