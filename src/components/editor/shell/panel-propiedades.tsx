"use client";

import { MousePointerClickIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { useDocumento } from "@/lib/editor/contexto-documento";
import { PANELES_DOC, useSeleccion } from "@/lib/editor/contexto-seleccion";
import { MODULE_META } from "@/lib/modules/types";
import { cn } from "@/lib/utils";

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
  const { moduloId, panel, setPanel, hojaMovil } = useSeleccion();

  const selected = modules.find((m) => m.id === moduloId) ?? null;

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
