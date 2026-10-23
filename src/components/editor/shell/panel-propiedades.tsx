"use client";

import { MousePointerClickIcon, PencilIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import { PublishControls } from "@/components/editor/publish-controls";
import { SettingsPanel } from "@/components/editor/settings-panel";
import { ThemePanel } from "@/components/editor/theme-panel";
import { VanitySlugCard } from "@/components/editor/vanity-slug-card";
import { GuestManager } from "@/components/dashboard/guest-manager";
import { RsvpModeToggle } from "@/components/dashboard/rsvp-mode-toggle";
import { ModuleConfigEditor, MODULE_REGISTRY } from "@/components/modules/registry";
import { detectAnimationConflicts } from "@/lib/animation/conflicts";
import { solicitarEdicionBloque } from "@/lib/editor/acciones-lienzo";
import { bloquePorId } from "@/lib/editor/bloques";
import { useDocumento } from "@/lib/editor/contexto-documento";
import { PANELES_DOC, useSeleccion } from "@/lib/editor/contexto-seleccion";
import { MODULE_META, type TextStyle } from "@/lib/modules/types";
import { TEXT_STYLE_PRESETS } from "@/lib/modules/text-style-presets";
import { FONT_STACKS, type FontKey } from "@/lib/theme/theme";
import {
  FontPreviewOptions,
  FontPreviewTrigger,
} from "@/components/editor/font-select-options";
import { SelectLabelTrigger } from "@/components/ui/select-label-trigger";
import { cn } from "@/lib/utils";

const PESO_LABELS = {
  normal: "Regular",
  medium: "Medio",
  semibold: "Semibold",
  bold: "Negrita",
} as const;

const MAYUSCULAS_LABELS = {
  none: "Original",
  uppercase: "MAYÚSCULAS",
  lowercase: "minúsculas",
} as const;

function ResetProperty({
  visible,
  onReset,
}: {
  visible: boolean;
  onReset: () => void;
}) {
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={onReset}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      title="Restaurar este valor al diseño global"
    >
      <RotateCcwIcon className="size-3" /> Global
    </button>
  );
}

function EditorDeEstiloTexto({
  bloque,
  config,
  onChange,
}: {
  bloque: string;
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const styles = (config.textStyles ?? {}) as Record<string, TextStyle>;
  const style = styles[bloque] ?? {};
  const patch = (next: Partial<TextStyle>) => {
    const siguiente = { ...style, ...next };
    for (const [key, value] of Object.entries(siguiente)) {
      if (value === undefined) delete siguiente[key as keyof TextStyle];
    }
    onChange({ textStyles: { ...styles, [bloque]: siguiente } });
  };
  const reset = (key: keyof TextStyle) => patch({ [key]: undefined } as Partial<TextStyle>);

  return (
    <div className="space-y-3 rounded-[var(--ed-radius-sm)] border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Estilo de este texto</p>
          <p className="text-xs text-muted-foreground">Sobrescribe el diseño global solo aquí.</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Restaurar estilo global"
          title="Restaurar estilo global"
          disabled={Object.keys(style).length === 0}
          onClick={() => {
            const restored = { ...styles };
            delete restored[bloque];
            onChange({ textStyles: restored });
          }}
        >
          <RotateCcwIcon />
        </Button>
      </div>
      {/* La muestra de una fuente necesita ancho real. En dos columnas se
          montaba sobre Color con nombres como “Moderna (Montserrat)”. */}
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Fuente</Label>
          <Select value={style.font ?? "global"} onValueChange={(value) => patch({ font: value === "global" ? undefined : value as FontKey })}>
            <SelectTrigger className="min-w-0"><FontPreviewTrigger font={style.font} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Diseño global</SelectItem>
              <FontPreviewOptions />
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Color</Label>
          <div className="flex h-9 items-center gap-2 rounded-md border px-2">
            <input type="color" aria-label="Color del texto" value={style.color ?? "#1f2937"} onChange={(event) => patch({ color: event.target.value })} className="size-5 cursor-pointer" />
            <span className="text-xs text-muted-foreground">{style.color ?? "Global"}</span>
            <span className="ml-auto"><ResetProperty visible={style.color !== undefined} onReset={() => reset("color")} /></span>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Estilos rápidos</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {TEXT_STYLE_PRESETS.map((preset) => (
            <Button
              key={preset.key}
              type="button"
              variant="outline"
              className="h-auto min-h-15 flex-col gap-0.5 px-1 py-1.5"
              onClick={() => patch(preset.style)}
              title={`Aplicar ${preset.label}`}
            >
              <span
                className="max-w-full truncate text-base leading-none"
                style={{ fontFamily: FONT_STACKS[preset.style.font] }}
              >
                {preset.sample}
              </span>
              <span className="text-[10px] font-normal leading-tight text-muted-foreground">
                {preset.label}
              </span>
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Aplican una receta y luego puedes ajustar cada valor.
        </p>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium">Tamaño <span className="flex items-center gap-1">{style.size ? `${style.size} rem` : "Global"}<ResetProperty visible={style.size !== undefined} onReset={() => reset("size")} /></span></div>
        <Input type="range" min="0.75" max="5" step="0.05" value={style.size ?? 1} onChange={(event) => patch({ size: Number(event.target.value) })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Peso</Label>
          <Select value={style.weight ?? "global"} onValueChange={(value) => patch({ weight: value === "global" ? undefined : value as TextStyle["weight"] })}>
            <SelectTrigger><SelectLabelTrigger label={style.weight ? PESO_LABELS[style.weight] : "Diseño global"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Diseño global</SelectItem>
              {(Object.keys(PESO_LABELS) as Array<keyof typeof PESO_LABELS>).map((peso) => (
                <SelectItem key={peso} value={peso}>{PESO_LABELS[peso]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Mayúsculas</Label>
          <Select value={style.transform ?? "global"} onValueChange={(value) => patch({ transform: value === "global" ? undefined : value as TextStyle["transform"] })}>
            <SelectTrigger><SelectLabelTrigger label={style.transform ? MAYUSCULAS_LABELS[style.transform] : "Diseño global"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Diseño global</SelectItem>
              {(Object.keys(MAYUSCULAS_LABELS) as Array<keyof typeof MAYUSCULAS_LABELS>).map((transform) => (
                <SelectItem key={transform} value={transform}>{MAYUSCULAS_LABELS[transform]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium">Espaciado <span className="flex items-center gap-1">{style.letterSpacing === undefined ? "Global" : `${style.letterSpacing} em`}<ResetProperty visible={style.letterSpacing !== undefined} onReset={() => reset("letterSpacing")} /></span></div>
        <Input type="range" min="-0.08" max="0.4" step="0.01" value={style.letterSpacing ?? 0} onChange={(event) => patch({ letterSpacing: Number(event.target.value) })} />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium">Interlineado <span className="flex items-center gap-1">{style.lineHeight ?? "Global"}<ResetProperty visible={style.lineHeight !== undefined} onReset={() => reset("lineHeight")} /></span></div>
        <Input type="range" min="0.8" max="2.5" step="0.05" value={style.lineHeight ?? 1.2} onChange={(event) => patch({ lineHeight: Number(event.target.value) })} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Alineación</Label>
        <div className="grid grid-cols-3 gap-1">
          {(["left", "center", "right"] as const).map((align) => <Button key={align} type="button" size="sm" variant={style.align === align ? "secondary" : "outline"} onClick={() => patch({ align })}>{align === "left" ? "Izq." : align === "center" ? "Centro" : "Der."}</Button>)}
        </div>
      </div>
    </div>
  );
}

/**
 * Inspector: contextual a lo que hay seleccionado.
 *
 * En la Fase 1 solo se MUDA: sigue siendo el mismo formulario vertical. El
 * rediseno contextual de verdad —los tres grupos fijos Contenido / Diseno /
 * Animacion— es la Fase 7, y necesita que la Fase 2 traiga la seleccion de
 * BLOQUE para saber que mostrar.
 */
export function PanelPropiedades() {
  const {
    modules,
    theme,
    invitation,
    aplicar,
    uploadCtx,
    siteUrl,
    username,
    dirty,
  } = useDocumento();
  const { seleccion, moduloId, panel, setPanel, hojaMovil } = useSeleccion();

  const selected = modules.find((m) => m.id === moduloId) ?? null;
  const bloqueSeleccionado =
    selected && seleccion?.tipo === "bloque"
      ? bloquePorId(selected.module_type, seleccion.bloque)
      : null;

  /** Limpia todos los overrides por modulo para que hereden el del tema. */
  function applyAnimationToAll() {
    aplicar({ type: "clearAnimationOverrides" });
    toast.success("Animación del tema aplicada a todos los módulos.");
  }

  return (
    <aside
      aria-label="Propiedades"
      data-hoja={hojaMovil && hojaMovil !== "secciones" ? "abierta" : "cerrada"}
      className={cn(
        "flex shrink-0 flex-col border-t lg:w-[380px] lg:overflow-y-auto lg:border-t-0 lg:border-l",
        // Mismo tratamiento que el riel: la MISMA caja, movida por CSS.
        "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-(--ed-barra-movil) max-lg:z-40",
        "max-lg:max-h-[60svh] max-lg:overflow-y-auto max-lg:rounded-t-2xl",
        "max-lg:border max-lg:bg-background max-lg:shadow-2xl",
        "max-lg:transition-transform max-lg:duration-200 max-lg:ease-out",
        "max-lg:data-[hoja=cerrada]:pointer-events-none max-lg:data-[hoja=cerrada]:translate-y-[calc(100%+var(--ed-barra-movil))]",
      )}
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b px-3.5">
        {panel === "module" && selected ? (
          <>
            {(() => {
              const Icon = MODULE_REGISTRY[selected.module_type].Icon;
              return <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
            })()}
            <span className="text-[length:var(--ed-text-sm)] font-(--ed-weight-semibold) tracking-(--ed-tracking-sm)">
              {MODULE_META[selected.module_type].label}
            </span>
          </>
        ) : (
          <span className="text-[length:var(--ed-text-sm)] font-(--ed-weight-semibold) tracking-(--ed-tracking-sm)">
            {PANELES_DOC.find((p) => p.id === panel)?.label ?? "Propiedades"}
          </span>
        )}
      </div>

      <div className="space-y-4 p-3.5">
        {panel === "module" &&
          (selected ? (
            <>
              {bloqueSeleccionado && seleccion?.tipo === "bloque" && (
                <div className="space-y-3 rounded-[var(--ed-radius-sm)] border bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Bloque seleccionado
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{bloqueSeleccionado.etiqueta}</span>
                    {bloqueSeleccionado.campo && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          solicitarEdicionBloque({
                            moduloId: selected.id,
                            bloque: seleccion.bloque,
                          })
                        }
                      >
                        <PencilIcon />
                        Editar
                      </Button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {bloqueSeleccionado.campo
                      ? "Edita el texto directamente en el lienzo."
                      : bloqueSeleccionado.estilable
                        ? "Ajusta la tipografía de todo este encabezado."
                        : "Este bloque se configura desde los controles de la sección."}
                  </p>
                  {bloqueSeleccionado.estilable && (
                    <EditorDeEstiloTexto
                      bloque={seleccion.bloque}
                      config={selected.config}
                      onChange={(patch) => aplicar({ type: "updateConfig", id: selected.id, patch })}
                    />
                  )}
                </div>
              )}
              {selected.module_type === "rsvp" &&
                invitation.rsvp_mode === "guest_list" && (
                  <Button
                    variant="outline"
                    size="touch"
                    className="w-full"
                    onClick={() => setPanel("guests")}
                  >
                    Gestionar invitados
                  </Button>
                )}
              <ModuleConfigEditor
                moduleType={selected.module_type}
                config={selected.config}
                onChange={(patch) =>
                  aplicar({ type: "updateConfig", id: selected.id, patch })
                }
                ctx={uploadCtx}
                animationDefaults={theme.animation}
                eventDate={invitation.event_date}
                onSetEventDate={(iso) =>
                  aplicar({ type: "updateSettings", patch: { event_date: iso } })
                }
                rsvpMode={invitation.rsvp_mode}
              />
            </>
          ) : (
            <EmptyState
              icon={<MousePointerClickIcon />}
              title="Nada seleccionado"
              description="Elige una sección de la izquierda para editarla."
              className="py-8"
            />
          ))}

        {panel === "theme" && (
          <ThemePanel
            theme={theme}
            onChange={(patch) => aplicar({ type: "updateTheme", patch })}
            warnings={detectAnimationConflicts(theme, modules)}
            onApplyAnimationToAll={applyAnimationToAll}
            ctx={uploadCtx}
          />
        )}

        {panel === "guests" && invitation.rsvp_mode === "guest_list" && (
          <GuestManager
            invitationId={invitation.id}
            siteUrl={siteUrl}
            eventTitle={invitation.title}
          />
        )}

        {panel === "settings" && (
          <>
            <SettingsPanel
              invitation={invitation}
              onChange={(patch) => aplicar({ type: "updateSettings", patch })}
            />
            <RsvpModeToggle
              invitationId={invitation.id}
              mode={invitation.rsvp_mode}
              refresh={false}
              onChange={(m) => {
                aplicar({ type: "updateSettings", patch: { rsvp_mode: m } });
                // `setPanel` y NO `irAPanel`: en movil `irAPanel` abriria
                // ademas la hoja, que no es lo que hacia antes. La Fase 1 no
                // cambia conducta.
                if (m === "guest_list") setPanel("guests");
              }}
            />
            {/* Bajan aqui desde la barra superior: se consultan al
                compartir, no en cada tecla. */}
            <Separator />
            <PublishControls
              username={username}
              slug={invitation.slug}
              isPublished={invitation.is_published}
              dirty={dirty}
            />
            {invitation.is_published && (
              <VanitySlugCard invitationId={invitation.id} />
            )}
          </>
        )}
      </div>
    </aside>
  );
}
