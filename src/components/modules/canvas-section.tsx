import Image from "next/image";
import type { CanvasConfig, CanvasLayer } from "@/lib/modules/types";

/**
 * Render de una "sección libre": un lienzo con proporción fija donde las capas
 * se colocan por coordenadas fraccionarias.
 *
 * PRUEBA DE CONCEPTO — el punto técnico que se quiere demostrar:
 *
 * El competidor resuelve el posicionamiento libre fijando secciones de 900 px
 * de alto, es decir renunciando a ser responsive y escalando un lienzo rígido.
 * Aquí no hace falta, por dos decisiones:
 *
 *  1. La sección declara una PROPORCIÓN (`aspect-ratio`), no una altura. Así
 *     una posición de `x: 0.5, y: 0.3` significa exactamente lo mismo en un
 *     celular de 360 px y en un monitor de 1400 px.
 *  2. Los tamaños de texto van en `cqw` — porcentaje del ancho del CONTENEDOR,
 *     no del viewport. El texto escala con la sección, y como es una unidad
 *     relativa no rompe el zoom del usuario (a diferencia de `vw`, que sí
 *     puede hacer fallar el criterio WCAG 1.4.4).
 *
 * Lo que esta técnica NO resuelve: el texto no reflowea, se escala. Un párrafo
 * largo colocado libremente se vuelve ilegiblemente chico en móvil en vez de
 * acomodarse. Sirve para títulos y frases cortas; no para cuerpo de texto.
 */

function LayerBox({ layer }: { layer: CanvasLayer }) {
  const common: React.CSSProperties = {
    position: "absolute",
    left: `${layer.x * 100}%`,
    top: `${layer.y * 100}%`,
    width: `${layer.w * 100}%`,
    transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
  };

  if (layer.kind === "image") {
    if (!layer.url) return null;
    return (
      <div style={common}>
        {/* `unoptimized`: la URL viene del bucket del usuario y el tamaño
            final lo decide la fracción, no un breakpoint. */}
        <Image
          src={layer.url}
          alt=""
          width={800}
          height={800}
          unoptimized
          aria-hidden="true"
          className="h-auto w-full select-none"
          draggable={false}
        />
      </div>
    );
  }

  if (!layer.text.trim()) return null;
  return (
    <div
      style={{
        ...common,
        color: layer.color,
        textAlign: layer.align,
        fontSize: `${layer.fontSize}cqw`,
        lineHeight: 1.15,
      }}
      className="font-display whitespace-pre-wrap break-words"
    >
      {layer.text}
    </div>
  );
}

export function CanvasSection({ config }: { config: CanvasConfig }) {
  const hasContent = config.layers.some((l) =>
    l.kind === "image" ? Boolean(l.url) : Boolean(l.text.trim()),
  );

  return (
    <section className="px-4 py-8">
      {config.title ? (
        <h2 className="mb-4 text-center font-display text-2xl font-semibold">
          {config.title}
        </h2>
      ) : null}
      <div
        // `containerType: inline-size` es lo que habilita las unidades `cqw`
        // de los textos: sin esto el tamaño no escalaría con la sección.
        style={{
          containerType: "inline-size",
          aspectRatio: config.aspect.replace("/", " / "),
          background: config.background || undefined,
        }}
        className="relative mx-auto w-full max-w-xl overflow-hidden rounded-xl"
      >
        {config.layers.map((layer) => (
          <LayerBox key={layer.id} layer={layer} />
        ))}
        {!hasContent ? (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Sección libre vacía. Agrega un texto o una imagen y colócalos donde
            quieras.
          </p>
        ) : null}
      </div>
    </section>
  );
}
