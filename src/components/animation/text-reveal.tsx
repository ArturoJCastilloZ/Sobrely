"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

type TextRevealVariant = "text-rise" | "masked-text";

const container: Variants = {
  hidden: {},
  visible: (stagger: number) => ({
    transition: { staggerChildren: stagger },
  }),
};

const wordRise: Variants = {
  hidden: { y: "0.6em", opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const wordMasked: Variants = {
  hidden: { y: "110%" },
  visible: { y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

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
  if (reduce || !text) {
    return <span className={className}>{text}</span>;
  }

  const words = text.split(" ");
  const wordVariants = variant === "masked-text" ? wordMasked : wordRise;

  return (
    <motion.span
      className={className}
      style={{ display: "inline-block" }}
      variants={container}
      custom={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.6 }}
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
          <motion.span variants={wordVariants} style={{ display: "inline-block" }}>
            {word}
          </motion.span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </motion.span>
  );
}
