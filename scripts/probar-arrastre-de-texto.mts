/**
 * Comprueba el CONTRATO DEL DOM del arrastre de textos, en un navegador real.
 *
 *   node scripts/probar-arrastre-de-texto.mts
 *
 * Por qué existe: el arrastre no funcionaba y la suite estaba verde. La primera
 * versión ponía los manejadores en un `<div absolute inset-0>` encima de la
 * vista previa —copiando la forma de `sticker-editor-layer` sin copiar la
 * condición que la hace válida, que es que los stickers son sus PROPIOS
 * HIJOS—. Con ese overlay, el puntero sobre el título lo recibe el overlay y
 * `e.target.closest("[data-bloque]")` devuelve `null`: el arrastre no empieza
 * nunca. Ninguna prueba de render lo veía, porque el HTML era correcto.
 *
 * Y un SEGUNDO fallo, reportado despues del primero («sigue sin moverse»): la
 * seccion lleva `px-6`, y `cqw` **no** resuelve contra la caja de BORDE sino
 * contra la de CONTENIDO. Dividiendo por el rect entero el texto se quedaba
 * atras del cursor — medido, se arrastraban 90 px y se movia 80, el 88,5 %, que
 * es exactamente 370/418. Por eso la seccion de esta sonda TIENE PADDING: sin
 * el, el error no se manifiesta.
 *
 * Que comprueba, y que NO. Verifica lo que fallo: (1) que desde el CONTENEDOR
 * de los modulos el evento llega con `e.target` dentro de un `[data-bloque]`, y
 * (2) que el texto sigue al cursor 1:1. La logica va transplantada, asi que
 * **no** prueba el codigo de React — prueba que la forma del DOM y las cuentas
 * son las correctas. Lo que no cubre nadie automaticamente sigue siendo el
 * gesto en el editor real, que pide sesion.
 */
import { chromium } from "playwright-core";

const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: 700, height: 600 } });

await p.setContent(`
  <div id="canvas" style="position:relative">
    <div data-modulo="m1">
      <section id="sec" style="container-type:inline-size;min-height:240px;padding:48px 24px;background:#eee;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <h2 id="titulo" data-bloque="title" style="touch-action:none;background:#fff">Ana &amp; Carlos</h2>
      </section>
    </div>
  </div>
<script>
  let drag = null;
  window.__log = [];
  const canvas = document.getElementById("canvas");
  canvas.addEventListener("pointerdown", (e) => {
    const destino = e.target.closest("[data-bloque]");
    window.__log.push("target=" + (e.target.id || e.target.tagName) + " bloque=" + (destino ? destino.dataset.bloque : "NULL"));
    if (!destino) return;
    const sec = destino.closest("section");
    const cs = getComputedStyle(sec);
    // Caja de CONTENIDO, que es lo que mide cqw. Con el rect entero el texto
    // se queda atras del cursor tanto como pese el padding.
    const ancho = sec.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    drag = { ancho, inicio: { x: e.clientX, y: e.clientY } };
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = (e.clientX - drag.inicio.x) / drag.ancho;
    const dy = (e.clientY - drag.inicio.y) / drag.ancho;
    document.getElementById("titulo").style.transform =
      "translate(" + dx * 100 + "cqw, " + dy * 100 + "cqw)";
  });
  canvas.addEventListener("pointerup", () => { drag = null; });
</script>
`);

const caja = (await p.locator("#titulo").boundingBox())!;
const x0 = caja.x + caja.width / 2;
const y0 = caja.y + caja.height / 2;
const ARRASTRE = { x: 80, y: 40 };

await p.mouse.move(x0, y0);
await p.mouse.down();
await p.mouse.move(x0 + ARRASTRE.x, y0 + ARRASTRE.y, { steps: 6 });
await p.mouse.up();

const r = await p.evaluate(() => {
  const el = document.getElementById("titulo")!;
  const r1 = el.getBoundingClientRect();
  const prev = el.style.transform;
  el.style.transform = "none";
  const r0 = el.getBoundingClientRect();
  el.style.transform = prev;
  return {
    log: (window as unknown as { __log: string[] }).__log,
    transform: prev,
    dxPx: r1.left - r0.left,
    dyPx: r1.top - r0.top,
  };
});

await b.close();

console.log("pointerdown:", r.log.join(" | "));
console.log("transform escrito:", r.transform);
console.log(`desplazamiento en pantalla: ${r.dxPx} x ${r.dyPx} px`);

const alcanzaElBloque = r.log.some((l) => l.includes("bloque=title"));
const semueve =
  Math.abs(r.dxPx - ARRASTRE.x) < 2 && Math.abs(r.dyPx - ARRASTRE.y) < 2;

if (!alcanzaElBloque) {
  console.error("✗ el evento NO llega al bloque: algo lo esta tapando");
  process.exit(1);
}
if (!semueve) {
  console.error(
    `✗ se arrastro ${ARRASTRE.x}x${ARRASTRE.y} y el texto se movio ${r.dxPx}x${r.dyPx}`,
  );
  process.exit(1);
}
console.log(`✓ el evento llega al bloque y el texto se mueve los ${ARRASTRE.x}x${ARRASTRE.y} px arrastrados`);
