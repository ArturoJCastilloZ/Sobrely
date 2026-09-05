/**
 * Invitar por WhatsApp con `wa.me` — enlace pre-llenado que abre el chat en el
 * teléfono del ANFITRIÓN, con el mensaje listo para enviar.
 *
 * Por qué así y no con la API oficial de Meta: `wa.me` es un enlace, no una
 * integración. No hay servidor de terceros en medio, no hay costo por mensaje,
 * no se registra ninguna plantilla, y **ningún dato del cliente sale hacia
 * Meta** — el anfitrión envía desde su propio WhatsApp, como si lo escribiera a
 * mano. Es el 80 % del valor del competidor sin ninguna de sus obligaciones.
 */

/** País por defecto cuando el organizador teclea un número sin lada: México. */
export const DEFAULT_COUNTRY_CODE = "52";

/** Rango de E.164: mínimo razonable y máximo normativo de 15 dígitos. */
const MIN_DIGITS = 8;
const MAX_DIGITS = 15;

/**
 * Lleva lo que el organizador teclea a los dígitos que `wa.me` espera: código
 * de país al frente, sin `+`, sin espacios ni separadores.
 *
 * Acepta lo que la gente escribe de verdad: `55 1234 5678`, `(55) 1234-5678`,
 * `+52 55 1234 5678`, `0052...`. Devuelve `null` si no queda un número usable
 * — devolver basura abriría un chat con un desconocido.
 */
export function normalizePhone(
  raw: string | null | undefined,
  defaultCountry: string = DEFAULT_COUNTRY_CODE,
): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  // El `+` solo cuenta si abre el número; en medio es basura.
  const hadPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  // Prefijo internacional marcado a la vieja usanza (00 …) = igual que un `+`.
  let international = hadPlus;
  if (!international && digits.startsWith("00")) {
    digits = digits.slice(2);
    international = true;
  }

  if (!international) {
    // Nacional de 10 dígitos (México y varios más): se le antepone la lada.
    if (digits.length === 10) {
      digits = defaultCountry + digits;
    } else if (digits.length === 11 && digits.startsWith("1")) {
      // "1 55 1234 5678" — el 1 de larga distancia nacional, ya en desuso.
      digits = defaultCountry + digits.slice(1);
    }
  }

  // México: el "1" que WhatsApp exigía después del 52 quedó atrás. Se quita
  // para dejar el formato actual (52 + 10 dígitos) y no duplicar contactos.
  if (digits.length === 13 && digits.startsWith("521")) {
    digits = "52" + digits.slice(3);
  }

  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null;
  return digits;
}

/** ¿Este texto rinde un número al que se le puede escribir? */
export function isReachableByWhatsApp(raw: string | null | undefined): boolean {
  return normalizePhone(raw) !== null;
}

/**
 * Mensaje que el anfitrión verá pre-cargado. Se le habla al invitado por su
 * nombre y se le da SU enlace, no el genérico: es lo que hace que la lista
 * nominal valga la pena.
 */
export function inviteMessage(input: {
  guestName: string;
  eventTitle: string;
  link: string;
  hostName?: string | null;
}): string {
  const { guestName, eventTitle, link, hostName } = input;
  const saludo = `Hola ${guestName.trim()}`;
  const cuerpo = hostName?.trim()
    ? `${hostName.trim()} te invita a ${eventTitle.trim()}.`
    : `Te invitamos a ${eventTitle.trim()}.`;
  return `${saludo}, ${cuerpo}\n\nAquí está tu invitación y tu confirmación:\n${link}`;
}

/**
 * Mensaje de RECORDATORIO. Es otro texto, no el mismo con otro asunto.
 *
 * Quien recibe esto ya tuvo su invitación y no ha contestado, así que repetirle
 * "te invitamos a X" se lee como que el anfitrión no lleva la cuenta. El
 * recordatorio reconoce que ya se la mandó, pide lo único que falta —la
 * confirmación— y explica POR QUÉ importa: sin el número no se cierra el
 * banquete. Y no regaña: quien no contestó casi siempre lo dejó pendiente, no
 * lo ignoró.
 *
 * Va sin fecha límite a propósito: la invitación puede tener una y puede no
 * tenerla, y anunciar una que no existe sería inventar.
 */
export function reminderMessage(input: {
  guestName: string;
  eventTitle: string;
  link: string;
  hostName?: string | null;
}): string {
  const { guestName, eventTitle, link, hostName } = input;
  const quien = hostName?.trim() ? `${hostName.trim()} sigue` : "Seguimos";
  return (
    `Hola ${guestName.trim()}, ¿alcanzaste a ver la invitación de ${eventTitle.trim()}?\n\n` +
    `${quien} esperando tu confirmación para cerrar el número de lugares. ` +
    `Se contesta en un momento, aquí mismo:\n${link}`
  );
}

/**
 * Enlace `wa.me` con el mensaje pre-llenado. `null` cuando el teléfono no
 * sirve, para que quien llame decida qué mostrar en vez de abrir un chat roto.
 */
export function whatsappInviteUrl(input: {
  phone: string | null | undefined;
  guestName: string;
  eventTitle: string;
  link: string;
  hostName?: string | null;
}): string | null {
  const digits = normalizePhone(input.phone);
  if (!digits) return null;
  const text = encodeURIComponent(inviteMessage(input));
  return `https://wa.me/${digits}?text=${text}`;
}

/**
 * Enlace `wa.me` de RECORDATORIO. Mismo mecanismo que la invitación, otro
 * texto — se separan para que cambiar uno no toque el otro por accidente.
 */
export function whatsappReminderUrl(input: {
  phone: string | null | undefined;
  guestName: string;
  eventTitle: string;
  link: string;
  hostName?: string | null;
}): string | null {
  const digits = normalizePhone(input.phone);
  if (!digits) return null;
  const text = encodeURIComponent(reminderMessage(input));
  return `https://wa.me/${digits}?text=${text}`;
}
