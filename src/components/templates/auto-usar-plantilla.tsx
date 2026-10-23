"use client";

import { useEffect, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createFromTemplate } from "@/lib/invitations/actions";
import { reclamarLanzamiento } from "@/lib/templates/lanzamiento-unico";

/**
 * Memoria del MÓDULO, no del componente: ver `lanzamiento-unico.ts`. Un `ref`
 * nace de nuevo con cada instancia y Next monta una instancia nueva al
 * reconstruir el árbol tras la acción (medido: dos invitaciones iguales).
 */
const memoriaDelModulo = new Map<string, number>();

function almacenDeSesion(): Pick<Storage, "getItem" | "setItem"> | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Crea la invitación con la plantilla que la persona ya había elegido, al
 * volver de registrarse o iniciar sesión.
 *
 * Solo se monta cuando el SERVIDOR lo decide: `?usar=1` en la URL Y un inicio
 * de sesión de hace segundos (ver `esInicioReciente`). Este componente no
 * decide nada; no debe montarse por la sola presencia del parámetro.
 *
 * Que recargar, volver atrás o un remonte no creen dos invitaciones:
 *   1. La redirección al editor REEMPLAZA la entrada del historial que traía
 *      `?usar=1`, así que «atrás» no regresa a esta página. No se quita el
 *      parámetro con `history.replaceState`: medido, esa navegación interna de
 *      Next pisa la redirección de la acción y la persona se quedaba aquí.
 *   2. `reclamarLanzamiento` deja pasar UNA sola ejecución por plantilla y
 *      minuto, con memoria que sobrevive a remontes y a recargas.
 * La creación es una server action (POST), no un GET: un enlace o un prefetch
 * no pueden dispararla.
 */
export function AutoUsarPlantilla({
  templateId,
  nombre,
}: {
  templateId: string;
  nombre: string;
}) {
  const [fallo, setFallo] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!reclamarLanzamiento(`sobrely:usar:${templateId}`, memoriaDelModulo, almacenDeSesion())) {
      return;
    }

    startTransition(async () => {
      try {
        // `reemplazar`: la redirección al editor SUSTITUYE esta entrada del
        // historial (la del `?usar=1`), así que «atrás» no vuelve aquí.
        await createFromTemplate(templateId, { reemplazar: true });
      } catch (e) {
        // La acción termina en `redirect()`, que llega aquí como excepción
        // NEXT_REDIRECT aunque la navegación SÍ ocurre; sin esto se pintaba el
        // aviso de error sobre una invitación que se había creado bien.
        unstable_rethrow(e);
        setFallo(true);
        toast.error(
          "No se pudo preparar tu invitación. Usa el botón «Usar esta plantilla» para intentarlo de nuevo.",
        );
      }
    });
  }, [templateId]);

  // Si falló, se quita el telón y queda la vista de siempre con su botón.
  if (fallo) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-background/95 px-6 text-center backdrop-blur"
    >
      <Loader2
        aria-hidden="true"
        className="size-8 animate-spin text-muted-foreground motion-reduce:animate-none"
      />
      <p className="font-display text-xl font-semibold tracking-tight">
        Preparando tu invitación
      </p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Estamos cargando «{nombre}» en tu editor.
      </p>
    </div>
  );
}
