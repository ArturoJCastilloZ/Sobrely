import { describe, expect, it } from "vitest";

import { TEXT_STYLE_PRESETS } from "@/lib/modules/text-style-presets";
import { textStyleSchema } from "@/lib/modules/types";

describe("presets tipográficos por bloque", () => {
  it("ofrece recetas distintas y todas son estilos válidos", () => {
    expect(TEXT_STYLE_PRESETS).toHaveLength(6);
    expect(new Set(TEXT_STYLE_PRESETS.map((preset) => preset.key)).size).toBe(
      TEXT_STYLE_PRESETS.length,
    );
    for (const preset of TEXT_STYLE_PRESETS) {
      expect(textStyleSchema.parse(preset.style)).toEqual(preset.style);
    }
  });
});
