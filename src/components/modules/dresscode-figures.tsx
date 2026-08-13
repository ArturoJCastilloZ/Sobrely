import type { DresscodeLevel } from "@/lib/modules/types";

type LevelInfo = {
  jacket: string;
  jacketDark: string;
  shirt: string;
  accent: string;
  neck: "bowtie" | "tie" | "none";
  dress: string;
  dressDark: string;
  dressLight: string;
  ruffles: boolean;
  longDress: boolean;
  men: string;
  women: string;
};

/** Original, flat mannequin-style outfits per dress code (no external art). */
export const DRESS_INFO: Record<Exclude<DresscodeLevel, "custom">, LevelInfo> = {
  etiqueta: {
    jacket: "#1a1712",
    jacketDark: "#000",
    shirt: "#ffffff",
    accent: "#0d0d0d",
    neck: "bowtie",
    dress: "#6d4fb0",
    dressDark: "#4b3480",
    dressLight: "#8b6fd0",
    ruffles: true,
    longDress: true,
    men: "Esmoquin o frac negro, camisa blanca y moño.",
    women: "Vestido largo de gala.",
  },
  formal: {
    jacket: "#1f1f1f",
    jacketDark: "#000",
    shirt: "#ffffff",
    accent: "#2b2b2b",
    neck: "tie",
    dress: "#2a9b76",
    dressDark: "#166a51",
    dressLight: "#49b795",
    ruffles: true,
    longDress: true,
    men: "Traje oscuro con corbata y zapatos formales.",
    women: "Vestido largo o midi elegante.",
  },
  "semi-formal": {
    jacket: "#41618f",
    jacketDark: "#2c4670",
    shirt: "#ffffff",
    accent: "#1e2b45",
    neck: "tie",
    dress: "#4d76bd",
    dressDark: "#345591",
    dressLight: "#6d93d2",
    ruffles: false,
    longDress: false,
    men: "Traje; corbata opcional.",
    women: "Vestido coctel o midi.",
  },
  casual: {
    jacket: "#b7ccd0",
    jacketDark: "#93aeb3",
    shirt: "#eef4f5",
    accent: "#c9a267",
    neck: "none",
    dress: "#d5c3e0",
    dressDark: "#b49fc6",
    dressLight: "#e6dbee",
    ruffles: false,
    longDress: false,
    men: "Camisa y pantalón; sin corbata.",
    women: "Vestido corto u outfit relajado.",
  },
};

function Hanger() {
  return (
    <>
      <path d="M80 20 a5 5 0 1 1 4 4" fill="none" stroke="#9a9a9a" strokeWidth="2" />
      <path d="M84 24 L80 34" stroke="#9a9a9a" strokeWidth="2" />
    </>
  );
}

function Suit({ info }: { info: LevelInfo }) {
  const pant = info.neck === "none" ? info.accent : info.jacket;
  return (
    <svg viewBox="0 0 160 240" className="h-44 w-auto @2xl/inv:h-56 @4xl/inv:h-72" role="img" aria-label="Atuendo caballeros">
      <Hanger />
      {/* shoes */}
      <path d="M52 226 q-6 4 -14 3 q-2 -6 4 -9 l12 0 z" fill="#2a2620" />
      <path d="M92 226 q6 4 14 3 q2 -6 -4 -9 l-12 0 z" fill="#2a2620" />
      {/* trousers with crease */}
      <path d="M58 150 L78 150 L74 226 L60 226 Z" fill={pant} />
      <path d="M82 150 L102 150 L100 226 L86 226 Z" fill={pant} />
      <path d="M68 156 L67 224 M92 156 L93 224" stroke="#000" strokeWidth="1" opacity="0.18" />
      {/* jacket shoulders + body */}
      <path d="M56 62 L68 50 Q80 44 92 50 L104 62 L102 152 L58 152 Z" fill={info.jacket} />
      {/* sleeves */}
      <path d="M56 62 L46 70 L44 148 L60 148 L60 66 Z" fill={info.jacket} />
      <path d="M104 62 L114 70 L116 148 L100 148 L100 66 Z" fill={info.jacket} />
      <path d="M60 66 L60 148 M100 66 L100 148" stroke="#000" strokeWidth="1" opacity="0.15" />
      {/* right-side shade */}
      <path d="M80 47 L92 50 L104 62 L102 152 L80 152 Z" fill="#000" opacity="0.07" />
      {/* shirt + collar */}
      <path d="M70 54 L80 62 L90 54 L86 116 L74 116 Z" fill={info.shirt} />
      <path d="M70 54 L78 66 L80 62 Z" fill="#e6e6e6" />
      <path d="M90 54 L82 66 L80 62 Z" fill="#e6e6e6" />
      {/* notched lapels */}
      <path d="M70 54 L60 100 L66 84 L74 72 Z" fill={info.jacketDark} />
      <path d="M90 54 L100 100 L94 84 L86 72 Z" fill={info.jacketDark} />
      {/* pocket square */}
      <path d="M94 96 l8 0 l-4 6 z" fill={info.shirt} />
      {/* neckwear */}
      {info.neck === "tie" && (
        <>
          <path d="M76 60 L84 60 L80 68 Z" fill={info.accent} />
          <path d="M78 68 L82 68 L84 116 L80 124 L76 116 Z" fill={info.accent} />
        </>
      )}
      {info.neck === "bowtie" && (
        <>
          <path d="M72 58 L80 63 L72 68 Z" fill={info.accent} />
          <path d="M88 58 L80 63 L88 68 Z" fill={info.accent} />
          <rect x="78" y="60" width="4" height="6" rx="1" fill={info.jacketDark} />
        </>
      )}
      {/* buttons */}
      <circle cx="80" cy="118" r="1.8" fill={info.jacketDark} />
      <circle cx="80" cy="132" r="1.8" fill={info.jacketDark} />
    </svg>
  );
}

/** A scalloped ruffle band (filled), wavy bottom edge. */
function scallop(xL: number, xR: number, yTop: number, yBot: number, bumps: number) {
  const w = (xR - xL) / bumps;
  let d = `M${xL} ${yTop} L${xR} ${yTop} L${xR} ${yBot}`;
  for (let i = 0; i < bumps; i++) {
    const ex = xR - w * (i + 1);
    const cx = xR - w * (i + 0.5);
    d += ` Q ${cx} ${yBot + 7} ${ex} ${yBot}`;
  }
  return `${d} L${xL} ${yTop} Z`;
}

function Dress({ info }: { info: LevelInfo }) {
  return (
    <svg viewBox="0 0 160 240" className="h-44 w-auto @2xl/inv:h-56 @4xl/inv:h-72" role="img" aria-label="Atuendo damas">
      <Hanger />
      {/* heels for short dresses */}
      {!info.longDress && (
        <>
          <path d="M66 176 l9 0 l-1 16 l-3 0 l0 -6 z" fill={info.dressDark} />
          <path d="M85 176 l9 0 l-1 16 l-3 0 l0 -6 z" fill={info.dressDark} />
        </>
      )}
      {/* bodice */}
      <path d="M66 60 L80 52 L94 60 L91 100 L69 100 Z" fill={info.dress} />
      <path d="M80 52 L94 60 L91 100 L80 100 Z" fill="#000" opacity="0.05" />
      {/* straps */}
      <path
        d="M70 58 L76 46 M90 58 L84 46"
        stroke={info.dressDark}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* neckline */}
      <path d="M69 62 Q80 70 91 62" stroke={info.dressDark} strokeWidth="1.5" fill="none" opacity="0.4" />
      {/* waist seam */}
      <path d="M69 100 L91 100" stroke={info.dressDark} strokeWidth="1.5" opacity="0.5" />

      {info.ruffles ? (
        <>
          <path d={scallop(64, 96, 100, 128, 3)} fill={info.dress} />
          <path d={scallop(58, 102, 122, 152, 4)} fill={info.dressLight} />
          <path d={scallop(50, 110, 146, 178, 5)} fill={info.dress} />
          <path d={scallop(44, 116, 172, 204, 6)} fill={info.dressLight} />
          <path d={scallop(40, 120, 198, 226, 6)} fill={info.dress} />
        </>
      ) : (
        <>
          <path d="M69 100 L91 100 L110 166 L50 166 Z" fill={info.dress} />
          <path d="M80 100 L91 100 L110 166 L80 166 Z" fill="#000" opacity="0.05" />
          <path d="M80 104 L80 162 M70 106 L60 162 M90 106 L100 162" stroke={info.dressDark} strokeWidth="1.3" opacity="0.2" />
        </>
      )}
    </svg>
  );
}

function Figure({
  children,
  label,
  desc,
}: {
  children: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="rounded-3xl bg-[var(--inv-card)] p-2 @2xl/inv:p-4">
        {children}
      </div>
      <span className="text-xs font-medium @2xl/inv:text-lg @4xl/inv:text-xl @5xl/inv:text-2xl">
        {label}
      </span>
      <span className="max-w-[150px] text-center text-xs opacity-70 @2xl/inv:max-w-[220px] @2xl/inv:text-base @4xl/inv:max-w-[320px] @4xl/inv:text-lg @5xl/inv:text-xl">
        {desc}
      </span>
    </div>
  );
}

export function DresscodeFigures({ level }: { level: DresscodeLevel }) {
  if (level === "custom") return null;
  const info = DRESS_INFO[level];
  return (
    <div className="flex flex-wrap justify-center gap-5 @2xl/inv:gap-12">
      <Figure label="Caballeros" desc={info.men}>
        <Suit info={info} />
      </Figure>
      <Figure label="Damas" desc={info.women}>
        <Dress info={info} />
      </Figure>
    </div>
  );
}
