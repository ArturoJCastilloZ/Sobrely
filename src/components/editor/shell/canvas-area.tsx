"use client";

import { PreviewPane } from "@/components/editor/preview-pane";
import { useDocumento } from "@/lib/editor/contexto-documento";
import { parcheDeDesplazamiento } from "@/lib/modules/types";

/**
 * El lienzo.
 *
 * ⚠️ REGLA DURA DE ESTE ARCHIVO, y es el objetivo entero de la Fase 1:
 *
 *     `CanvasArea` NO consume `useSeleccion()`. Ni el, ni nada que cuelgue de
 *     el mientras el lienzo siga siendo de solo lectura.
 *
 * Por que: hasta ahora la seleccion vivia en el MISMO componente que montaba el
 * preview, asi que un clic en otra seccion del riel repintaba la invitacion
 * entera —los doce modulos, sus imagenes y sus animaciones— para cambiar un
 * borde de 1px en una lista. Con la seleccion en su propio contexto y el lienzo
 * sin suscribirse a el, ese repintado desaparece.
 *
 * Esto NO es un detalle de rendimiento que se pueda relajar luego: la Fase 2
 * mete seleccion, hover y arrastre sobre el lienzo, y ahi el coste de repintar
 * doce modulos deja de medirse en milisegundos y pasa a verse.
 *
 * Cuando la Fase 2 traiga la capa de seleccion, ira como un HERMANO superpuesto
 * —su propio componente, suscrito a la seleccion— y no dentro de este arbol.
 *
 * Lo vigila `desacople-canvas.test.ts`.
 */
export function CanvasArea() {
  const { modules, theme, invitation, aplicar } = useDocumento();

  return (
    // Canvas: el protagonista. Antes vivia a la derecha, con un parrafo gris
    // encima que decia "Vista previa en tiempo real".
    <main className="flex min-h-[60svh] min-w-0 flex-1 flex-col overflow-y-auto bg-muted/40 p-4 max-lg:pb-[calc(var(--ed-barra-movil)+1rem)] lg:min-h-0">
      <PreviewPane
        modules={modules}
        theme={theme}
        eventDate={invitation.event_date}
        onStickersChange={(stickers) =>
          aplicar({ type: "updateTheme", patch: { stickers } })
        }
        // El arrastre escribe por la MISMA via que los paneles
        // (`updateConfig`), asi que hereda el autoguardado, el bloqueo
        // optimista y el deshacer sin nada nuevo. `claveDeFusion` funde por
        // `config:<id>:textOffsets`, asi que un arrastre entero es UN paso
        // de ⌘Z y no uno por pixel.
        onOffset={(moduloId, bloque, d) => {
          const m = modules.find((x) => x.id === moduloId);
          if (!m) return;
          const patch = parcheDeDesplazamiento(
            m.module_type === "hero",
            (m.config as Record<string, unknown>)?.textOffsets,
            bloque,
            d,
          );
          // `null` = bloque que no encaja con la forma del modulo. Se
          // ignora en vez de escribir en un sitio inventado.
          if (patch) aplicar({ type: "updateConfig", id: moduloId, patch });
        }}
      />
    </main>
  );
}
