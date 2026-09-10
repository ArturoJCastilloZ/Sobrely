"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";

type TextRevealVariant = "text-rise" | "masked-text";

const wordRise: Variants = {
  hidden: { y: "0.6em", opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const wordMasked: Variants = {
  hidden: { y: "110%" },
  visible: { y: 0 },
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Ms tras el montaje en los que, si el observador nunca disparó, se revela
 *  igual. Red de seguridad: el texto SIEMPRE se ve, aunque el elemento nunca
 *  alcance el 60% de visibilidad o no haya IntersectionObserver. */
const RESCATE_MS = 1500;

/**
 * Contrato de visibilidad de UNA palabra.
 *
 * Depende SOLO de (índice, revelado): nunca de si la palabra estaba montada
 * cuando el contenedor se reveló. Ese era el defecto: el contenedor animaba
 * con `whileInView` + `viewport.once`, así que tras el primer disparo ya no
 * volvía a propagar la variante `visible`; las palabras que aparecían después
 * (al teclear el título en el editor, con `key={i}` reusando las viejas y
 * montando las nuevas) se quedaban en `hidden` —opacity 0, translateY— para
 * siempre. Ahora cada palabra lleva su propio `animate`, así que una palabra
 * que monta tarde con el bloque ya revelado nace animando hacia `visible`.
 */
export function palabraDeReveal(
  indice: number,
  revelado: boolean,
  stagger: number,
  duracion: number,
) {
  return {
    animate: revelado ? "visible" : "hidden",
    transition: {
      duration: duracion,
      ease: EASE,
      // El escalonado se calcula por índice, no con `staggerChildren` del
      // contenedor: así no depende de una animación de contenedor que solo
      // corre una vez.
      delay: revelado ? indice * stagger : 0,
    },
  };
}

/**
 * Word-by-word text reveal (Framer Motion). Legibility-safe: falls back to
 * plain text under reduced motion, and never introduces layout shift (words
 * keep their space; only transform/opacity animate).
 */
export function TextReveal({
  text,
  variant = "text-rise",
  className,
  once = true,
  stagger = 0.06,
}: {
  text: string;
  variant?: TextRevealVariant;
  className?: string;
  once?: boolean;
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const enVista = useInView(ref, { once, amount: 0.6 });
  const [rescate, setRescate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRescate(true), RESCATE_MS);
    return () => clearTimeout(t);
  }, []);

  if (reduce || !text) {
    return <span className={className}>{text}</span>;
  }

  const words = text.split(" ");
  const wordVariants = variant === "masked-text" ? wordMasked : wordRise;
  const duracion = variant === "masked-text" ? 0.6 : 0.5;
  const revelado = enVista || rescate;

  return (
    <span
      ref={ref}
      className={className}
      style={{ display: "inline-block" }}
      aria-label={text}
    >
      {words.map((word, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            display: "inline-block",
            overflow: variant === "masked-text" ? "hidden" : "visible",
            verticalAlign: "top",
          }}
        >
          <motion.span
            variants={wordVariants}
            initial="hidden"
            style={{ display: "inline-block" }}
            {...palabraDeReveal(i, revelado, stagger, duracion)}
          >
            {word}
          </motion.span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}
