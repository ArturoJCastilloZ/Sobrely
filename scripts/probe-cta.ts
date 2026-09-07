import { THEME_PACKS } from "../src/lib/theme/theme-packs";
import { deriveCta, contrastRatio, AA_NORMAL, WHITE } from "../src/lib/theme/contrast";

const rows = Object.values(THEME_PACKS).map((p: any) => {
  const primary = p.theme.colors.primary;
  const ink = p.theme.colors.text;
  const antes = contrastRatio(primary, WHITE);
  const cta = deriveCta(primary, ink, p.theme.colors.background);
  return { key: p.key, primary, antes, kind: cta.kind, bg: cta.bg, fg: cta.fg, ratio: cta.ratio };
});
const fallaban = rows.filter((r) => r.antes < AA_NORMAL).length;
const fallanAhora = rows.filter((r) => r.ratio < AA_NORMAL).length;
console.log("pack".padEnd(22), "primary".padEnd(9), "antes".padEnd(7), "trato".padEnd(9), "bg".padEnd(9), "fg".padEnd(9), "ahora");
for (const r of rows) {
  console.log(
    r.key.padEnd(22), r.primary.padEnd(9), r.antes.toFixed(2).padEnd(7),
    r.kind.padEnd(9), r.bg.padEnd(9), r.fg.padEnd(9), r.ratio.toFixed(2),
    r.ratio >= AA_NORMAL ? "OK" : "FALLA"
  );
}
console.log(`\ntotal: ${rows.length} · fallaban AA: ${fallaban} · fallan ahora: ${fallanAhora}`);
