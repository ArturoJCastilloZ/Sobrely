import { PaletteIcon, SettingsIcon, UsersIcon, type LucideIcon } from "lucide-react";

import { PANELES_DOC } from "@/lib/editor/contexto-seleccion";

/**
 * Icono de cada panel de documento.
 *
 * Va aparte de `PANELES_DOC` porque esa lista vive en `lib/` —logica, sin
 * dependencias de UI— y esto es presentacion. Y se tipa como `Record` sobre los
 * ids: anadir un panel sin darle icono deja de compilar, en vez de pintar un
 * hueco. Es la misma disciplina que `MODULE_REGISTRY_IS_COMPLETE`.
 */
export const ICONO_PANEL: Record<(typeof PANELES_DOC)[number]["id"], LucideIcon> = {
  theme: PaletteIcon,
  guests: UsersIcon,
  settings: SettingsIcon,
};
