/**
 * Ataque a las politicas RLS de `template_favorites` (migracion 0031).
 *
 *   node scripts/atacar-rls-favoritos.mts
 *
 * Lee del entorno (`.env.local`):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   la llave PUBLICA — el atacante
 *   SUPABASE_SERVICE_ROLE_KEY              solo para sembrar y limpiar
 *   TOKEN_SESION                           (opcional) access token de una
 *                                          sesion real, para el caso legitimo
 *
 * POR QUE EXISTE
 * Una politica que se lee perfecta puede no defender nada: en la `0023` un
 * subquery se volvio `x = x` y se podia firmar en invitaciones ajenas. La regla
 * del entorno es que las politicas NO estan terminadas hasta atacarlas con la
 * llave publica, clausula por clausula, INCLUIDO el caso legitimo.
 *
 * EL CONTROL POSITIVO NO ES OPCIONAL
 * Antes de cualquier ataque se comprueba que la llave anonima SI puede leer
 * `templates`, que es publica. Sin ese control, una llave caducada o mal
 * cargada haria que todo saliera "denegado" y el informe diria «RLS perfecta»
 * midiendo en realidad que la sonda esta rota — un bloqueador falso al reves,
 * y de los caros. Si el control no pasa, el script ABORTA y no reporta nada.
 *
 * Los datos de prueba se siembran con el user_id del dev y se borran al final,
 * pase lo que pase.
 */

const URL_BASE = must("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
const ANON = must("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const SERVICE = must("SUPABASE_SERVICE_ROLE_KEY");
const TOKEN = process.env.TOKEN_SESION ?? "";

/** El user_id del dev, el unico con el que se siembra dato de prueba. */
const USER_DEV = "d1f1dc44-aca7-4a96-8fd8-0b97242940f6";

function must(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`falta ${k} en el entorno`);
  return v;
}

type Res = { status: number; body: unknown };

async function rest(
  ruta: string,
  opciones: { key: string; token?: string; metodo?: string; cuerpo?: unknown; prefer?: string },
): Promise<Res> {
  const { key, token, metodo = "GET", cuerpo, prefer } = opciones;
  const h: Record<string, string> = {
    apikey: key,
    // El Bearer es el TOKEN cuando lo hay, y la llave cuando no. Un `Headers`
    // esparcido con `...` devuelve `{}` y borraria estas dos cabeceras: se
    // construye como objeto plano a proposito.
    Authorization: `Bearer ${token || key}`,
    "Content-Type": "application/json",
  };
  if (prefer) h.Prefer = prefer;
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, {
    method: metodo,
    headers: h,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  let body: unknown = texto;
  try { body = texto ? JSON.parse(texto) : null; } catch { /* deja el texto */ }
  return { status: r.status, body };
}

const filas: string[] = [];
let fallos = 0;

function juzgar(clausula: string, esperado: string, ok: boolean, observado: string) {
  if (!ok) fallos++;
  filas.push(
    `${ok ? "  PASA " : "  FALLA"} | ${clausula.padEnd(46)} | esperado: ${esperado.padEnd(18)} | observado: ${observado}`,
  );
}

/**
 * QUE CERRADURA paro el ataque. Sin esto el informe dice «PASA» y se lee como
 * «la politica defiende», cuando en la primera corrida real los CUATRO rechazos
 * anonimos fueron `42501` —permiso de tabla, o sea el `revoke`— y RLS no llego
 * a evaluarse ni una vez. Un verde que no distingue la cerradura exterior de la
 * interior deja las politicas sin verificar creyendo lo contrario.
 *
 * Comprobado que la distincion es real y no teorica: `invitations`, que tiene
 * RLS Y grant a anon, responde HTTP 200 con fila a la misma llave. O sea que el
 * anonimo SI alcanza RLS donde tiene privilegio.
 */
function cerradura(r: Res): string {
  const t = JSON.stringify(r.body ?? "");
  if (t.includes("42501") || t.includes("permission denied")) return "PRIVILEGIO (revoke) — RLS NO ejercitada";
  if (r.status === 401 || r.status === 403) return "RLS o auth";
  if (Array.isArray(r.body) && r.body.length === 0) return "RLS (0 filas)";
  return "—";
}

/** Un resultado cuenta como DENEGADO si da error de permisos o 0 filas. */
function denegado(r: Res): boolean {
  if (r.status === 401 || r.status === 403) return true;
  if (Array.isArray(r.body)) return r.body.length === 0;
  return false;
}

async function main() {
  // ---- CONTROL POSITIVO -------------------------------------------------
  const control = await rest("templates?select=id&limit=1", { key: ANON });
  const controlOk = control.status === 200 && Array.isArray(control.body) && control.body.length > 0;
  console.log(`CONTROL POSITIVO  la llave anonima lee templates -> ${controlOk ? "SI" : "NO"} (HTTP ${control.status})`);
  if (!controlOk) {
    console.error("\nABORTA: la sonda no puede leer ni lo que es publico, asi que un");
    console.error("'denegado' no probaria nada sobre RLS. Revisa la llave o la red.");
    process.exit(2);
  }

  // ---- EXISTE LA TABLA? --------------------------------------------------
  const existe = await rest("template_favorites?select=user_id&limit=1", { key: SERVICE });
  if (existe.status === 404 || (existe.status >= 400 && JSON.stringify(existe.body).includes("does not exist"))) {
    console.error(`\nABORTA: 'template_favorites' no existe todavia (HTTP ${existe.status}).`);
    console.error("Aplica la migracion 0031 y vuelve a correr esto.");
    process.exit(3);
  }

  // ---- SIEMBRA (service role, con el user_id del dev) --------------------
  const tpl = await rest("templates?select=id&limit=2", { key: SERVICE });
  const ids = (tpl.body as { id: string }[]).map((t) => t.id);
  const [TPL_A, TPL_B] = ids;
  await rest("template_favorites", {
    key: SERVICE, metodo: "POST", prefer: "resolution=merge-duplicates",
    cuerpo: { user_id: USER_DEV, template_id: TPL_A },
  });
  const sembradas = await rest(
    `template_favorites?select=user_id,template_id&user_id=eq.${USER_DEV}`, { key: SERVICE },
  );
  const nSembradas = Array.isArray(sembradas.body) ? sembradas.body.length : 0;
  console.log(`SIEMBRA           ${nSembradas} fila(s) del dev en la tabla\n`);

  try {
    // ---- ATAQUES CON LA LLAVE PUBLICA (anonimo) -------------------------
    juzgar(
      "anon SELECT sobre favoritos ajenos",
      "denegado",
      denegado(await rest("template_favorites?select=*", { key: ANON })),
      resumen(await rest("template_favorites?select=*", { key: ANON })),
    );

    const insAnon = await rest("template_favorites", {
      key: ANON, metodo: "POST", prefer: "return=representation",
      cuerpo: { user_id: USER_DEV, template_id: TPL_B },
    });
    juzgar("anon INSERT a nombre del dev", "denegado", insAnon.status >= 400, resumen(insAnon));

    const delAnon = await rest(
      `template_favorites?user_id=eq.${USER_DEV}`,
      { key: ANON, metodo: "DELETE", prefer: "return=representation" },
    );
    juzgar(
      "anon DELETE de los favoritos del dev",
      "denegado / 0 filas",
      delAnon.status >= 400 || denegado(delAnon),
      resumen(delAnon),
    );

    const updAnon = await rest(
      `template_favorites?user_id=eq.${USER_DEV}`,
      { key: ANON, metodo: "PATCH", prefer: "return=representation", cuerpo: { template_id: TPL_B } },
    );
    juzgar(
      "anon UPDATE (no hay politica de update)",
      "denegado / 0 filas",
      updAnon.status >= 400 || denegado(updAnon),
      resumen(updAnon),
    );

    // El dato sembrado tiene que SEGUIR ahi: si un ataque lo borro, la
    // politica fallo aunque la respuesta pareciera inocente.
    const tras = await rest(
      `template_favorites?select=template_id&user_id=eq.${USER_DEV}`, { key: SERVICE },
    );
    const nTras = Array.isArray(tras.body) ? tras.body.length : -1;
    juzgar("la fila sembrada sobrevive a los ataques", `${nSembradas} filas`, nTras === nSembradas, `${nTras} filas`);

    // ---- CASO LEGITIMO --------------------------------------------------
    if (!TOKEN) {
      filas.push("  ----- | CASO LEGITIMO (sesion real)               | SIN COMPROBAR    | falta TOKEN_SESION");
    } else {
      const leo = await rest("template_favorites?select=user_id,template_id", { key: ANON, token: TOKEN });
      const lista = Array.isArray(leo.body) ? (leo.body as { user_id: string }[]) : [];
      juzgar("sesion real LEE sus propios favoritos", ">=1 fila", leo.status === 200 && lista.length >= 1, resumen(leo));
      juzgar(
        "sesion real NO ve favoritos de otros",
        "solo user_id propio",
        lista.every((f) => f.user_id === USER_DEV),
        `${new Set(lista.map((f) => f.user_id)).size} user_id distinto(s)`,
      );

      const mio = await rest("template_favorites", {
        key: ANON, token: TOKEN, metodo: "POST", prefer: "return=representation",
        cuerpo: { user_id: USER_DEV, template_id: TPL_B },
      });
      juzgar("sesion real INSERTA un favorito propio", "201", mio.status === 201, resumen(mio));

      const ajeno = await rest("template_favorites", {
        key: ANON, token: TOKEN, metodo: "POST", prefer: "return=representation",
        // Un uuid que no es el suyo. Si `with check` no defendiera, esta fila
        // se crearia a nombre de otro — y se borra abajo en el finally.
        cuerpo: { user_id: "00000000-0000-0000-0000-000000000001", template_id: TPL_A },
      });
      juzgar("sesion real INSERTA a nombre de OTRO", "denegado", ajeno.status >= 400, resumen(ajeno));

      const updMio = await rest(
        `template_favorites?user_id=eq.${USER_DEV}&template_id=eq.${TPL_B}`,
        { key: ANON, token: TOKEN, metodo: "PATCH", prefer: "return=representation", cuerpo: { created_at: "2000-01-01T00:00:00Z" } },
      );
      juzgar(
        "sesion real UPDATE su propia fila",
        "denegado / 0 filas",
        updMio.status >= 400 || denegado(updMio),
        resumen(updMio),
      );

      const borro = await rest(
        `template_favorites?template_id=eq.${TPL_B}`,
        { key: ANON, token: TOKEN, metodo: "DELETE", prefer: "return=representation" },
      );
      juzgar(
        "sesion real BORRA su propio favorito",
        "1 fila",
        Array.isArray(borro.body) && borro.body.length === 1,
        resumen(borro),
      );
    }
  } finally {
    // ---- LIMPIEZA, pase lo que pase --------------------------------------
    await rest(`template_favorites?user_id=eq.${USER_DEV}`, { key: SERVICE, metodo: "DELETE" });
    await rest("template_favorites?user_id=eq.00000000-0000-0000-0000-000000000001", { key: SERVICE, metodo: "DELETE" });
    const queda = await rest("template_favorites?select=user_id", { key: SERVICE });
    const n = Array.isArray(queda.body) ? queda.body.length : -1;
    console.log(filas.join("\n"));
    console.log(`\nLIMPIEZA          quedan ${n} fila(s) en la tabla (deben ser 0)`);
    const soloPerimetro = filas.some((f) => f.includes("PRIVILEGIO (revoke)")) && !TOKEN;
    console.log(fallos === 0 ? "\nRESULTADO: ninguna clausula cedio." : `\nRESULTADO: ${fallos} CLAUSULA(S) CEDIERON.`);
    if (soloPerimetro) {
      console.log(
        "\nAVISO: los rechazos anonimos vinieron del PRIVILEGIO de tabla, no de RLS.\n" +
        "El perimetro aguanta, pero las POLITICAS siguen SIN VERIFICAR: sus clausulas\n" +
        "(user_id = auth.uid(), el with check, la ausencia de update) solo son\n" +
        "alcanzables con sesion. Corre esto otra vez con TOKEN_SESION=<access token>.",
      );
    }
    process.exit(fallos === 0 ? 0 : 1);
  }
}

function resumen(r: Res): string {
  const b = Array.isArray(r.body) ? `${r.body.length} filas` : "";
  return `HTTP ${r.status} ${b} [freno: ${cerradura(r)}]`;
}

await main();
