"use client";

import { useEffect, useRef, useState } from "react";

import { bloquePorId } from "@/lib/editor/bloques";
import {
  sanearTexto,
  topeDeCampo,
  valorDeCampo,
} from "@/lib/editor/texto-directo";
import { useLienzo } from "@/lib/editor/contexto-lienzo";
import { useSeleccion } from "@/lib/editor/contexto-seleccion";
import { subirUnNivel, type Seleccion } from "@/lib/editor/seleccion";
import type { EditorModule } from "@/lib/invitations/editor-types";
import { MODULE_META } from "@/lib/modules/types";

type Caja = { top: number; left: number; ancho: number; alto: number };

/**
 * Rect de `el` en coordenadas SIN ESCALAR, relativas a `cont`.
 *
 * Funciones PURAS y fuera del componente a proposito. Estaban dentro, en
 * `useCallback`, y el React Compiler lo rechaza con razon: leen `ref.current`,
 * que no es una dependencia que pueda inferir, asi que no podia conservar la
 * memoizacion manual. Sacandolas, no hay nada que memoizar ni deps que puedan
 * mentir.
 */
function medir(cont: HTMLElement | null, el: Element | null, zoom: number): Caja | null {
  if (!el || !cont || !zoom) return null;
  const r = el.getBoundingClientRect();
  const c = cont.getBoundingClientRect();
  // La division por el zoom es la clave: esta capa vive DENTRO del marco
  // escalado por `transform`, asi que si se posicionara con los pixeles que
  // devuelve `getBoundingClientRect` —que ya vienen escalados— la escala se
  // aplicaria DOS VECES y el recuadro se iria del elemento.
  return {
    top: (r.top - c.top) / zoom,
    left: (r.left - c.left) / zoom,
    ancho: r.width / zoom,
    alto: r.height / zoom,
  };
}

/** El nodo del DOM que corresponde a una seleccion, o `null`. */
function nodoDe(cont: HTMLElement | null, sel: Seleccion): Element | null {
  if (!cont || sel === null) return null;
  const modulo = cont.querySelector(`[data-modulo="${CSS.escape(sel.moduloId)}"]`);
  if (!modulo) return null;
  if (sel.tipo === "modulo") return modulo;
  return modulo.querySelector(`[data-bloque="${CSS.escape(sel.bloque)}"]`);
}

/**
 * Selección visual sobre el lienzo.
 *
 * ── Por qué esta capa NO recibe punteros ──────────────────────────────
 *
 * El plan marcaba el hit-testing como el riesgo nº1 de la fase, y con razón:
 * hay precedente medido en este repo. El paginador necesitó `z-40` porque
 * `elementFromPoint` sobre sus flechas devolvía la capa de stickers y **los
 * botones no recibían el clic**.
 *
 * Aquí eso no puede pasar, porque la capa es `pointer-events-none` y sólo
 * DIBUJA. La selección se detecta por BURBUJEO en el contenedor de los módulos,
 * que es exactamente el patrón que ya usan las dos capas que funcionan:
 * `sticker-editor-layer` (`none` en la capa, `auto` en cada sticker) y
 * `useMovimientoLibre` (manejadores en el contenedor, no en un overlay — su
 * primera versión SÍ usó un overlay y `closest("[data-bloque]")` daba null, así
 * que el arrastre no empezaba nunca).
 *
 * Consecuencia: no se toca la escalera de z existente
 * (contenido 10 < stickers 30 < paginador 40 < modal 50). Esta capa vive en
 * `z-20`: por encima del contenido para que el recuadro se vea, por debajo de
 * los stickers para no taparlos — y da igual, porque no recibe punteros.
 *
 * ── Por qué se divide por el zoom ─────────────────────────────────────
 *
 * El marco se escala con `transform: scale`. Esta capa vive DENTRO de ese
 * marco, así que también se escala. Si se posicionara con los píxeles que
 * devuelve `getBoundingClientRect` —que ya vienen escalados— la escala se
 * aplicaría DOS VECES y el recuadro se iría del elemento en cuanto el zoom no
 * fuera 100 %. Se divide por `zoom` para volver a coordenadas sin escalar.
 *
 * Es justo para esto para lo que la Fase 1 subió el zoom al contexto del lienzo.
 */
export function CapaDeSeleccion({
  contenedor,
  modules,
  onTexto,
}: {
  /** El contenedor de los módulos. Es donde se escucha, y el origen de coordenadas. */
  contenedor: React.RefObject<HTMLDivElement | null>;
  modules: EditorModule[];
  /**
   * Commit de una edición de texto: `(moduloId, campo, valor)`.
   *
   * Viaja como prop y no se toma de `useDocumento()` a propósito: es el MISMO
   * patrón que `onOffset`, y mantiene esta capa sin suscribirse al documento.
   * Escribe por la vía de siempre (`updateConfig`), así que hereda el
   * autoguardado, el bloqueo optimista y el deshacer sin nada nuevo.
   */
  onTexto?: (moduloId: string, campo: string, valor: string) => void;
}) {
  const { seleccion, seleccionar } = useSeleccion();
  /**
   * Bloque en EDICIÓN, o `null`. Es distinto de «seleccionado»: seleccionar
   * dibuja un recuadro, editar pone el cursor dentro del texto.
   */
  const [editando, setEditando] = useState<{
    moduloId: string;
    bloque: string;
    campo: string;
    tope: number | null;
  } | null>(null);
  /** El valor con el que se entró, para poder cancelar con `Esc`. */
  const valorOriginal = useRef("");
  const onTextoRef = useRef(onTexto);
  useEffect(() => {
    onTextoRef.current = onTexto;
  }, [onTexto]);
  const { zoom } = useLienzo();
  const [cajaSel, setCajaSel] = useState<Caja | null>(null);
  const [cajaHover, setCajaHover] = useState<Caja | null>(null);
  const capa = useRef<HTMLDivElement | null>(null);

  // ---- Detección del clic, por BURBUJEO ---------------------------------
  useEffect(() => {
    const cont = contenedor.current;
    if (!cont) return;

    function alPulsar(e: MouseEvent) {
      const t = e.target as Element | null;
      const modulo = t?.closest?.("[data-modulo]");
      // Fuera de un módulo no se hace nada. En particular NO se deselecciona:
      // el paginador y los controles de zoom viven dentro de esta columna, y
      // pulsarlos no debería vaciar el inspector.
      if (!modulo) return;
      const moduloId = modulo.getAttribute("data-modulo");
      if (!moduloId) return;

      const bloque = t?.closest?.("[data-bloque]");
      // El bloque tiene que ser de ESTE módulo. Sin comprobarlo, un módulo
      // anidado dentro de otro devolvería el ancla del de fuera.
      const suyo = bloque && modulo.contains(bloque) ? bloque : null;
      const id = suyo?.getAttribute("data-bloque");

      seleccionar(
        id ? { tipo: "bloque", moduloId, bloque: id } : { tipo: "modulo", moduloId },
      );
    }

    function alPasar(e: MouseEvent) {
      const t = e.target as Element | null;
      const modulo = t?.closest?.("[data-modulo]");
      if (!modulo) return setCajaHover(null);
      const bloque = t?.closest?.("[data-bloque]");
      setCajaHover(medir(cont, bloque && modulo.contains(bloque) ? bloque : modulo, zoom));
    }

    // Con NOMBRE y no una flecha anónima: un manejador anónimo no se puede
    // retirar, así que el `removeEventListener` de abajo no lo alcanzaría y
    // quedaría colgado. Aquí el nodo muere con el componente y el único efecto
    // sería `setCajaHover(null)`, o sea inofensivo — pero un listener que no se
    // limpia es justo el patrón que luego se copia a un sitio donde sí importa.
    function alSalir() {
      setCajaHover(null);
    }

    cont.addEventListener("click", alPulsar);
    cont.addEventListener("mousemove", alPasar);
    cont.addEventListener("mouseleave", alSalir);
    return () => {
      cont.removeEventListener("click", alPulsar);
      cont.removeEventListener("mousemove", alPasar);
      cont.removeEventListener("mouseleave", alSalir);
    };
  }, [contenedor, seleccionar, zoom]);

  // ---- Edición directa de texto -----------------------------------------
  //
  // El ciclo completo, y por qué cada paso es como es:
  //
  //  1. ENTRAR — se lee el valor de `config`, NO del DOM, y se planta como
  //     texto plano dentro del bloque. Hace falta porque el DOM puede no ser
  //     el texto: la portada anima su título con `TextReveal`, que lo parte en
  //     un `<span>` por letra. Editar ESA estructura la destrozaría.
  //  2. TECLEAR — no se despacha nada. El módulo no repinta (su `config` no ha
  //     cambiado y el `memo` corta), así que el DOM se queda quieto bajo el
  //     cursor. Despachar por tecla haría que React reemplazara el nodo en
  //     mitad de la escritura y el cursor saltaría al principio.
  //  3. SALIR — se sanea y se despacha UNA vez. React vuelve a montar la
  //     estructura buena desde `config`. Un paso de ⌘Z por edición, que es lo
  //     que el usuario reconoce como «un cambio» — no una letra.
  //
  // `Esc` cancela y restaura; `Enter` confirma. `Enter` no inserta salto porque
  // ninguno de estos campos es multilínea en el render.
  useEffect(() => {
    const cont = contenedor.current;
    if (!cont) return;

    function entrar(sel: Seleccion) {
      if (sel === null || sel.tipo !== "bloque") return;
      const m = modules.find((x) => x.id === sel.moduloId);
      if (!m) return;
      const b = bloquePorId(m.module_type, sel.bloque);
      // Sin `campo` no se edita. Es el caso del encabezado de `rsvp` —que es
      // título Y descripción juntos— y de las figuras de vestimenta. Adivinar
      // el campo escribiría en el sitio equivocado.
      if (!b?.campo) return;

      const nodo = nodoDe(cont, sel);
      if (!(nodo instanceof HTMLElement)) return;

      const valor = valorDeCampo(m.config, b.campo);
      valorOriginal.current = valor;
      nodo.textContent = valor;
      nodo.setAttribute("contenteditable", "plaintext-only");
      nodo.setAttribute("spellcheck", "true");
      nodo.focus();

      // Cursor al final, no al principio: se entra a seguir escribiendo.
      const r = document.createRange();
      r.selectNodeContents(nodo);
      r.collapse(false);
      const s = window.getSelection();
      s?.removeAllRanges();
      s?.addRange(r);

      setEditando({
        moduloId: sel.moduloId,
        bloque: sel.bloque,
        campo: b.campo,
        tope: topeDeCampo(m.module_type, b.campo),
      });
    }

    function alDobleClic(e: MouseEvent) {
      const t = e.target as Element | null;
      const modulo = t?.closest?.("[data-modulo]");
      const bloque = t?.closest?.("[data-bloque]");
      if (!modulo || !bloque || !modulo.contains(bloque)) return;
      const moduloId = modulo.getAttribute("data-modulo");
      const id = bloque.getAttribute("data-bloque");
      if (!moduloId || !id) return;
      // El doble clic del navegador selecciona la palabra; se limpia para que
      // el cursor quede donde lo pone `entrar`.
      e.preventDefault();
      entrar({ tipo: "bloque", moduloId, bloque: id });
    }

    cont.addEventListener("dblclick", alDobleClic);
    return () => cont.removeEventListener("dblclick", alDobleClic);
  }, [contenedor, modules]);

  // ---- Salir de la edición: confirmar o cancelar -------------------------
  useEffect(() => {
    const cont = contenedor.current;
    if (!cont || !editando) return;
    const nodo = nodoDe(cont, {
      tipo: "bloque",
      moduloId: editando.moduloId,
      bloque: editando.bloque,
    });
    if (!(nodo instanceof HTMLElement)) return;

    function limpiar(el: HTMLElement) {
      el.removeAttribute("contenteditable");
      el.removeAttribute("spellcheck");
    }

    function confirmar() {
      if (!(nodo instanceof HTMLElement) || !editando) return;
      // El saneado corre sobre lo que se va a GUARDAR, no sobre lo que se
      // teclea: `contenteditable="plaintext-only"` tiene soporte desigual y el
      // atributo se puede quitar desde la consola. La barrera de verdad es esta.
      const valor = sanearTexto(nodo.textContent ?? "", editando.tope);
      limpiar(nodo);
      setEditando(null);
      // Sólo se despacha si CAMBIÓ. Entrar y salir sin tocar nada no debe
      // ensuciar el documento ni apilar un paso de deshacer vacío.
      if (valor !== valorOriginal.current) {
        onTextoRef.current?.(editando.moduloId, editando.campo, valor);
      } else {
        // React no va a repintar (nada cambió), así que el texto plano que se
        // plantó al entrar se quedaría. Se restaura a mano.
        nodo.textContent = valorOriginal.current;
      }
    }

    function cancelar() {
      if (!(nodo instanceof HTMLElement)) return;
      nodo.textContent = valorOriginal.current;
      limpiar(nodo);
      setEditando(null);
    }

    function alTeclado(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        // Se detiene aquí: sin esto el manejador de ventana también lo vería y
        // subiría un nivel de selección además de cancelar.
        e.stopPropagation();
        cancelar();
        return;
      }
      if (e.key === "Enter") {
        // Ninguno de estos campos es multilínea en el render, así que un salto
        // sólo produciría un texto guardado que no se parece a lo que se ve.
        e.preventDefault();
        confirmar();
      }
    }

    function alPegar(e: ClipboardEvent) {
      // Se intercepta el pegado y se inserta TEXTO PLANO a mano. No se confía
      // en `plaintext-only`: su soporte varía entre navegadores, y un pegado de
      // Word metería cientos de kB de estilos en el `config` jsonb.
      e.preventDefault();
      const bruto = e.clipboardData?.getData("text/plain") ?? "";
      const limpio = sanearTexto(bruto, null);
      if (limpio) document.execCommand("insertText", false, limpio);
    }

    nodo.addEventListener("keydown", alTeclado);
    nodo.addEventListener("blur", confirmar);
    nodo.addEventListener("paste", alPegar);
    return () => {
      nodo.removeEventListener("keydown", alTeclado);
      nodo.removeEventListener("blur", confirmar);
      nodo.removeEventListener("paste", alPegar);
    };
  }, [contenedor, editando]);

  // ---- `Esc` sube un nivel ----------------------------------------------
  useEffect(() => {
    function alTeclado(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // Dentro de un campo, `Esc` es del campo (cerrar un desplegable, revertir
      // un valor). Secuestrarlo aquí rompería esos controles.
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      ) {
        return;
      }
      seleccionar(subirUnNivel(seleccion));
    }
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [seleccion, seleccionar]);

  // ---- Seguir al elemento seleccionado ----------------------------------
  //
  // Se remide con un `ResizeObserver` sobre el contenedor y no una sola vez:
  // el recuadro tiene que seguir al elemento cuando cambia el texto, cuando se
  // mueve el zoom o cuando otra sección de arriba crece. Una lectura única se
  // queda desfasada y el recuadro flota sobre nada, que es peor que no pintarlo.
  useEffect(() => {
    const cont = contenedor.current;
    if (!cont) return;
    const releer = () => setCajaSel(medir(cont, nodoDe(cont, seleccion), zoom));
    releer();
    const obs = new ResizeObserver(releer);
    obs.observe(cont);
    return () => obs.disconnect();
  }, [contenedor, seleccion, modules, zoom]);

  const etiqueta = (() => {
    if (seleccion === null) return null;
    const m = modules.find((x) => x.id === seleccion.moduloId);
    if (!m) return null;
    const nombre = MODULE_META[m.module_type].label;
    if (seleccion.tipo === "modulo") return nombre;
    const b = bloquePorId(m.module_type, seleccion.bloque);
    return b ? `${nombre} · ${b.etiqueta}` : nombre;
  })();

  return (
    <div
      ref={capa}
      aria-hidden
      // `pointer-events-none` en la CAPA ENTERA. Ver la nota de arriba: es lo
      // que hace que esta fase no pueda romper el arrastre de textos ni los
      // stickers. Si alguien le pone `auto`, `desacople-canvas.test.ts` se
      // queja — y con razón.
      className="pointer-events-none absolute inset-0 z-20"
    >
      {cajaHover && !igual(cajaHover, cajaSel) && (
        <div
          className="absolute rounded-[2px] ring-1 ring-primary/40"
          style={posicion(cajaHover)}
        />
      )}
      {cajaSel && (
        <div
          className="absolute rounded-[2px] ring-2 ring-primary"
          style={posicion(cajaSel)}
        >
          {etiqueta && (
            <span className="absolute -top-[18px] left-0 max-w-full truncate rounded-t-[3px] bg-primary px-1.5 py-px text-[10px] leading-4 font-medium text-primary-foreground">
              {etiqueta}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const posicion = (c: Caja) => ({
  top: c.top,
  left: c.left,
  width: c.ancho,
  height: c.alto,
});

/** Para no pintar el recuadro de hover encima del de selección. */
function igual(a: Caja | null, b: Caja | null): boolean {
  if (!a || !b) return false;
  return (
    Math.abs(a.top - b.top) < 1 &&
    Math.abs(a.left - b.left) < 1 &&
    Math.abs(a.ancho - b.ancho) < 1 &&
    Math.abs(a.alto - b.alto) < 1
  );
}
