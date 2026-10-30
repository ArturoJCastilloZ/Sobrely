import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Frontera servidor/cliente: un archivo de `src/app` SIN "use client" es un
 * Server Component (o código de servidor). Si importa de un módulo
 * "use client" algo que NO es un componente —una función, una constante—, lo
 * que recibe es una REFERENCIA de cliente, no el valor. Renderizarla como
 * componente funciona; llamarla o leerla no:
 *
 *   Error: Attempted to call estadoDeInvitacion() from the server but
 *   estadoDeInvitacion is on the client.
 *
 * Así estuvo roto el panel del evento (`dashboard/invitations/[invitationId]`)
 * desde 1ef7915: importaba `estadoDeInvitacion`, `ETIQUETA_DE_ESTADO` y
 * `AVISO_DE_CADUCADA` de `invitation-card.tsx`. Ni `tsc`, ni el lint, ni el
 * build lo detectan; solo truena al pedir la página.
 *
 * Heurística (sin ejecutar React): los componentes van en PascalCase; cualquier
 * import de VALOR con otro nombre (camelCase, CONSTANTE) desde un módulo
 * "use client" se marca. Los `import type` y `type X` no cuentan: se borran al
 * compilar. Si alguna vez hace falta algo así, el valor se mueve a un módulo
 * compartido sin directiva (como `src/lib/invitations/estado.ts`).
 *
 * Alcance y límites (lo que esta guarda NO ve):
 * - Solo barre `src/app`. Un archivo de servidor fuera de ahí (p. ej. en
 *   `src/lib` o un componente de servidor en `src/components`) que importe de
 *   un módulo cliente no se revisa.
 * - Es una heurística de NOMBRE: un PascalCase se da por componente aunque sea
 *   una constante o una clase, y un componente en camelCase se marcaría.
 * - Los imports POR DEFECTO (`import algo from "./cliente"`) no se revisan:
 *   se tratan como componente, porque no se puede saber qué exporta el default
 *   sin ejecutar el módulo.
 * - Solo sigue rutas relativas y `@/`; los paquetes de `node_modules` y los
 *   re-exports en cadena (un barril sin directiva que reexporta de un módulo
 *   cliente) quedan fuera.
 * - Lee el texto, no el AST: un import dentro de un comentario o una cadena
 *   también cuenta.
 */

const SRC = fileURLToPath(new URL("../", import.meta.url));
const APP = join(SRC, "app");

function archivos(dir: string, salida: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) archivos(p, salida);
    else if (/\.(ts|tsx)$/.test(e) && !/\.test\.tsx?$/.test(e)) salida.push(p);
  }
  return salida;
}

/** La directiva tiene que ser la primera sentencia; se permiten comentarios antes. */
function esCliente(codigo: string): boolean {
  return /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*["']use client["']/.test(codigo);
}

function resolver(desde: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(desde), spec);
  else return null; // paquetes de node_modules: fuera del alcance
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const p = base + ext;
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

// La cláusula no puede contener comillas ni `;`: si pudiera, el `*?` perezoso
// arrancaba en un import de efecto (`import "./x.css";`), cruzaba hasta el
// siguiente `from` y se tragaba un `import type` como si fuera de valor.
const IMPORT = /import\s+(type\s+)?([^"';]*?)\s+from\s+["']([^"']+)["']/g;
const ES_COMPONENTE = /^[A-Z][a-z0-9]/;

/** Nombres de valor no-componente que `codigo` importa desde módulos cliente. */
function importsDeClienteNoComponente(
  codigo: string,
  esModuloCliente: (spec: string) => boolean,
): string[] {
  const fuera: string[] = [];
  for (const m of codigo.matchAll(IMPORT)) {
    if (m[1]) continue;
    const [, , clausula, spec] = m;
    if (!esModuloCliente(spec)) continue;
    if (/^\*\s+as\s+/.test(clausula)) {
      fuera.push(`* from ${spec}`);
      continue;
    }
    const llaves = clausula.match(/\{([\s\S]*)\}/);
    if (!llaves) continue; // solo import por defecto: se trata como componente
    for (const parte of llaves[1].split(",")) {
      const t = parte.trim();
      if (!t || t.startsWith("type ")) continue;
      const nombre = t.split(/\s+as\s+/)[0].trim();
      if (!ES_COMPONENTE.test(nombre)) fuera.push(`${nombre} from ${spec}`);
    }
  }
  return fuera;
}

describe("frontera servidor/cliente en src/app", () => {
  it("el detector caza el patrón que rompió el panel del evento", () => {
    const viejo = `import { Badge } from "@/components/ui/badge";
import {
  AVISO_DE_CADUCADA,
  ETIQUETA_DE_ESTADO,
  estadoDeInvitacion,
} from "@/components/dashboard/invitation-card";
import { InvitationCard, type InvitationSummary } from "@/components/dashboard/invitation-card";`;
    const cliente = (s: string) => s.endsWith("invitation-card");
    expect(importsDeClienteNoComponente(viejo, cliente)).toEqual([
      "AVISO_DE_CADUCADA from @/components/dashboard/invitation-card",
      "ETIQUETA_DE_ESTADO from @/components/dashboard/invitation-card",
      "estadoDeInvitacion from @/components/dashboard/invitation-card",
    ]);
  });

  it("un `import type` tras un import de efecto no se marca (ni se traga el siguiente import)", () => {
    const codigo = `import "./globals.css";
import type { estadoDeInvitacion } from "@/components/dashboard/invitation-card";
import { ETIQUETA_DE_ESTADO } from "@/components/dashboard/invitation-card";`;
    const cliente = (s: string) => s.endsWith("invitation-card");
    expect(importsDeClienteNoComponente(codigo, cliente)).toEqual([
      "ETIQUETA_DE_ESTADO from @/components/dashboard/invitation-card",
    ]);
  });

  it("ningún archivo de servidor importa funciones o constantes de un módulo 'use client'", () => {
    const servidor = archivos(APP).filter(
      (p) => !esCliente(readFileSync(p, "utf8")),
    );
    // Sanidad: si el barrido no encuentra archivos, la prueba no prueba nada.
    expect(servidor.length).toBeGreaterThan(20);

    const fallos = servidor.flatMap((p) =>
      importsDeClienteNoComponente(readFileSync(p, "utf8"), (spec) => {
        const destino = resolver(p, spec);
        return destino !== null && esCliente(readFileSync(destino, "utf8"));
      }).map((f) => `${relative(SRC, p)}: ${f}`),
    );
    expect(fallos).toEqual([]);
  });
});
