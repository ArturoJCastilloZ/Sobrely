import { cn } from "@/lib/utils";

/**
 * Isotipo de marca (sobre + corazón) en oro/champán. SVG inline para nitidez y
 * cero requests extra. `id` único por si se renderiza más de una vez en la página.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 132"
      className={className}
      role="img"
      aria-label="Sobrely"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="sobrely-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#a9822f" />
        </linearGradient>
        <linearGradient id="sobrely-flap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0d488" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
      </defs>
      <path
        d="M18 42 L18 118 Q18 126 26 130 L102 130 Q110 130 110 122 L110 74 L67 98 L18 118 Z"
        fill="url(#sobrely-body)"
      />
      <path
        d="M18 42 Q18 35 24 31 L92 4 Q99 1 99 9 L99 62 L110 74 L67 98 L18 74 Z"
        fill="url(#sobrely-flap)"
      />
      <path
        d="M18 74 L67 98 L110 74"
        fill="none"
        stroke="#8a6522"
        strokeWidth="1.4"
        opacity="0.55"
      />
      <path
        d="M58 50 C53 42 39 42 35 52 C31 62 38 70 58 84 C78 70 85 62 81 52 C77 42 63 42 58 50 Z"
        fill="#211d17"
      />
    </svg>
  );
}

/** Lockup horizontal: isotipo + wordmark "Sobrely". Para headers/nav. */
export function LogoLockup({
  className,
  markClassName = "h-8 w-8",
  wordClassName = "text-xl",
}: {
  className?: string;
  markClassName?: string;
  wordClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <BrandMark className={markClassName} />
      <span
        className={cn(
          "font-display font-bold tracking-tight leading-none",
          wordClassName,
        )}
      >
        Sobre<span className="text-brand-gold">ly</span>
      </span>
    </span>
  );
}
