import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Config de Vitest para la suite unitaria (Fase 8.8).
 *
 * Alias `@/ → src/` para que los imports resuelvan igual que en Next. Entorno
 * `node`: los tests cubren lógica pura de dominio (precios, vigencia, firma MP,
 * referidos), sin DOM ni base de datos.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
