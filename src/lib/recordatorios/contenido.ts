import type { TipoRecordatorio } from "@/lib/recordatorios/ventanas";

/**
 * Texto de los correos. PURO.
 *
 * Tres reglas que no son de estilo:
 *   1. El título de la invitación lo escribe la persona: se ESCAPA en el HTML y
 *      se le quitan los saltos de línea en el asunto (un `\r\n` en un asunto es
 *      inyección de cabeceras).
 *   2. No se afirma nada falso para apurar a la persona. El de 7 días dice la
 *      verdad completa: para que los invitados la vean hay que publicarla, y
 *      publicar requiere un plan de pago.
 *   3. Todo correo lleva el enlace de baja y el motivo por el que llega. Sin eso
 *      no se envía: `armarCorreo` lo exige, no es opcional.
 */
export type CorreoArmado = { asunto: string; html: string; texto: string };

const MAX_TITULO = 80;

export function escaparHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Una sola línea, sin caracteres de control, acotado. «Tu invitación» si queda vacío. */
export function tituloSeguro(titulo: string): string {
  const limpio = titulo.replace(/[\u0000-\u001f\u007f\u00a0\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim();
  if (!limpio) return "tu invitación";
  return limpio.length > MAX_TITULO ? `${limpio.slice(0, MAX_TITULO - 1)}…` : limpio;
}

function textoDeDias(n: number): string {
  return n === 1 ? "1 día" : `${n} días`;
}

export function armarCorreo(e: {
  tipo: TipoRecordatorio;
  titulo: string;
  /** Días hasta el evento; solo se usa en `evento_7d`. */
  diasParaEvento: number | null;
  editorUrl: string;
  bajaUrl: string;
}): CorreoArmado {
  if (!e.bajaUrl) throw new Error("Un recordatorio no se arma sin enlace de baja.");
  if (!e.editorUrl) throw new Error("Un recordatorio no se arma sin enlace al editor.");

  const titulo = tituloSeguro(e.titulo);

  let asunto: string;
  let parrafos: string[];
  let boton: string;

  if (e.tipo === "evento_7d" && e.diasParaEvento !== null) {
    asunto = `Tu evento es en ${textoDeDias(e.diasParaEvento)} y «${titulo}» aún no está publicada`;
    parrafos = [
      `Tu evento es en ${textoDeDias(e.diasParaEvento)}, y «${titulo}» sigue como borrador: tus invitados todavía no pueden verla.`,
      "Para que la vean tienes que publicarla, y publicar requiere un plan de pago. Si ya la tienes lista, puedes hacerlo desde el editor.",
    ];
    boton = "Abrir mi invitación";
  } else if (e.tipo === "borrador_3d") {
    asunto = `¿Sigues con «${titulo}»?`;
    parrafos = [
      `Hace unos días que no abres «${titulo}». Tu borrador sigue guardado tal como lo dejaste.`,
      "Cuando quieras, retómala donde te quedaste.",
    ];
    boton = "Continuar mi invitación";
  } else {
    asunto = `«${titulo}» te espera`;
    parrafos = [
      `Dejaste «${titulo}» a medias. Tu borrador sigue guardado tal como lo dejaste.`,
      "Puedes retomarla en un minuto.",
    ];
    boton = "Continuar mi invitación";
  }

  const motivo =
    "Recibes este correo porque pediste recordatorios sobre tus invitaciones sin publicar en Sobrely. " +
    "Como máximo te escribimos una vez al día.";

  const texto = [
    ...parrafos,
    "",
    `${boton}: ${e.editorUrl}`,
    "",
    "—",
    motivo,
    `Dejar de recibir recordatorios: ${e.bajaUrl}`,
  ].join("\n");

  const html = [
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1c1917;line-height:1.5">',
    ...parrafos.map((p) => `<p style="margin:0 0 16px">${escaparHtml(p)}</p>`),
    `<p style="margin:24px 0"><a href="${escaparHtml(e.editorUrl)}" style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px">${escaparHtml(boton)}</a></p>`,
    '<hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0">',
    `<p style="margin:0 0 8px;font-size:12px;color:#57534e">${escaparHtml(motivo)}</p>`,
    `<p style="margin:0;font-size:12px"><a href="${escaparHtml(e.bajaUrl)}" style="color:#57534e">Dejar de recibir recordatorios</a></p>`,
    "</div>",
  ].join("");

  return { asunto, html, texto };
}
