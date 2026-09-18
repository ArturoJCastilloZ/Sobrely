"use client";

import { Button } from "@/components/ui/button";
import { useDocumento } from "@/lib/editor/contexto-documento";

import { BarraMovil, VeloDeHoja } from "./barra-movil";
import { CanvasArea } from "./canvas-area";
import { PanelPropiedades } from "./panel-propiedades";
import { RielSecciones } from "./riel-secciones";
import { TopBar } from "./top-bar";

/**
 * Conflicto de version. Es un banner FIJO y no solo un toast: el toast se
 * va (o el usuario lo cierra) y entonces sigue editando creyendo que se
 * guarda, que es el fallo silencioso que este bloqueo viene a cerrar.
 * Se le dice lo que pasa, lo que se hizo por el y la unica salida segura.
 *
 * Va en su propio componente para que `EditorLayout` no tenga que suscribirse
 * al documento solo por esto.
 */
function BannerConflicto() {
  const { conflicto } = useDocumento();
  if (!conflicto) return null;
  return (
    <div
      role="alert"
      // `warning` y no `destructive`: esto no es una operacion que fallo,
      // es un "detente". Y es el token que SI tiene el par superficie +
      // primer plano con contraste AA verificado por prueba
      // (`semantic-colors.test.ts`); `destructive` no tiene `-surface`,
      // asi que `bg-destructive-surface` no existiria y el banner saldria
      // transparente.
      className="shrink-0 border-b border-warning/40 bg-warning-surface px-4 py-3 text-sm"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/*
          `text-warning` y NO `text-warning-fg`: `-fg` es la mitad que va
          sobre el color SOLIDO, no sobre el `-surface`. Medido en el
          navegador con el tema oscuro, `warning-fg` daba
          `rgb(42, 26, 0)` sobre un fondo `rgb(42, 32, 8)` — el mismo
          color, texto INVISIBLE. El emparejamiento bueno ya lo afirma
          `semantic-colors.test.ts`: "el color solido es legible como
          TEXTO sobre su propia superficie", en claro y en oscuro.
        */}
        <span className="font-medium text-warning">
          Otra pestaña guardó cambios más nuevos.
        </span>
        <span className="text-muted-foreground">
          Dejamos de guardar para no borrar ese trabajo. Tus cambios siguen
          en pantalla; recarga para ver la versión más nueva.
        </span>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => window.location.reload()}
        >
          Recargar
        </Button>
      </div>
    </div>
  );
}

/**
 * Tres columnas: riel de secciones, canvas y panel de propiedades.
 *
 * UN SOLO ARBOL, no dos. Antes el preview se montaba DOS VECES en
 * escritorio —uno en la pestana movil oculta por CSS y otro en la columna
 * derecha—, con sus dos capas de stickers escuchando punteros. Si aqui se
 * hiciera "tres columnas en desktop, pestanas en movil" con clases, el
 * doble montaje seguiria. Este arbol pasa de fila a columna y el preview
 * existe una vez.
 *
 * Y desaparecen las pestanas, que mezclaban tres cosas distintas en un
 * mismo control —nivel de documento (Tema, Ajustes), nivel de bloque
 * (Modulos) y un modo (Vista previa)— y llegaban a cinco `flex-1` en
 * 420px, truncandose.
 *
 * ⚠️ Este componente NO llama a ningun hook de contexto, y es deliberado: asi
 * nunca repinta. Cada pieza se suscribe por su cuenta a lo que necesita, que
 * es lo que permite que un clic en el riel no toque el lienzo.
 */
export function EditorLayout() {
  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <TopBar />
      <BannerConflicto />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <RielSecciones />
        <CanvasArea />
        <PanelPropiedades />
        <VeloDeHoja />
        <BarraMovil />
      </div>
    </div>
  );
}
