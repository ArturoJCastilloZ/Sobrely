"use client";

import type {
  PublicInvitation,
  GuestForInvitation,
} from "@/lib/invitations/public-types";
import { ModulePreview } from "@/components/modules/previews";
import { PublicRsvpForm } from "@/components/public/public-rsvp-form";
import { GuestResponsePanel } from "@/components/public/guest-response-panel";
import {
  parseConfig,
  type RsvpConfig,
  type SignaturesConfig,
} from "@/lib/modules/types";
import { SignatureWall } from "@/components/modules/signature-wall";
import { parseTheme } from "@/lib/theme/theme";
import { brandingForPlanCode } from "@/lib/billing/branding";
import { ThemeScope } from "@/components/theme/theme-scope";
import { StickerLayer } from "@/components/theme/sticker-layer";
import { AnimatedModule } from "@/components/animation/animated-module";
import { DecorationLayer } from "@/components/animation/decoration-layer";
import {
  resolveAnimation,
  readModuleAnimationOverride,
} from "@/lib/animation/schema";

export function PublicInvitationView({
  invitation,
  guest,
  guestToken,
}: {
  invitation: PublicInvitation;
  /** Si viene, la invitación es nominal (modo lista): el RSVP abierto se
   * reemplaza por el panel del invitado (confirmar / menos / cancelar + pase). */
  guest?: GuestForInvitation;
  guestToken?: string;
}) {
  const theme = parseTheme(invitation.theme_config);
  const branding = brandingForPlanCode(invitation.plan_code);

  const modules = invitation.modules
    .filter((m) => m.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Ubicación para el .ics: del módulo mapa (venueName + address) si existe.
  const mapModule = modules.find((m) => m.module_type === "map");
  const mapCfg = (mapModule?.config ?? {}) as {
    venueName?: string;
    address?: string;
  };
  const eventLocation =
    [mapCfg.venueName, mapCfg.address].filter(Boolean).join(", ") || undefined;
  const eventInfo = {
    title: invitation.title || "Invitación",
    dateIso: invitation.event_date ?? "",
    location: eventLocation,
  };

  return (
    <ThemeScope
      theme={theme}
      className="@container/inv relative min-h-svh w-full overflow-x-hidden"
    >
      {theme.animations && theme.decoration.enabled && (
        <DecorationLayer
          variant={theme.decoration.variant}
          symbol={theme.decoration.symbol}
          imageUrl={theme.decoration.imageUrl}
          count={12}
        />
      )}
      <StickerLayer stickers={theme.stickers} />
      <div className="relative z-10">
        {modules.map((m, i) => {
          // Per-module override > invitation default > system default.
          const animation = resolveAnimation(
            theme.animation,
            readModuleAnimationOverride(m.config),
            theme.animations,
          );
          return (
            <AnimatedModule key={m.id} animation={animation} index={i}>
              {/* Los módulos INTERACTIVOS se despachan aquí y no en
                  `ModulePreview`: necesitan el id de la invitación y hablan
                  con el servidor. `ModulePreview` es la vista estática que
                  comparten el editor y el preview. */}
              {m.module_type === "rsvp" ? (
                guest && guestToken ? (
                  <GuestResponsePanel
                    guest={guest}
                    token={guestToken}
                    config={parseConfig("rsvp", m.config) as RsvpConfig}
                    event={eventInfo}
                    branding={branding}
                  />
                ) : (
                  <PublicRsvpForm
                    invitationId={invitation.id}
                    config={parseConfig("rsvp", m.config) as RsvpConfig}
                  />
                )
              ) : m.module_type === "signatures" ? (
                <SignatureWall
                  invitationId={invitation.id}
                  config={
                    parseConfig("signatures", m.config) as SignaturesConfig
                  }
                />
              ) : (
                <ModulePreview
                  moduleType={m.module_type}
                  config={m.config}
                  animate={animation.enabled}
                  eventDate={invitation.event_date ?? ""}
                />
              )}
            </AnimatedModule>
          );
        })}

        {branding !== "none" && (
          <footer
            className={
              branding === "full"
                ? "px-6 py-8 text-center text-xs opacity-60 @2xl/inv:text-sm @4xl/inv:py-12 @4xl/inv:text-base"
                : "px-6 py-6 text-center text-[10px] opacity-35 @2xl/inv:text-xs"
            }
          >
            {branding === "full" ? "Hecho con " : ""}
            Sobre<span style={{ color: "var(--inv-primary)" }}>ly</span>
          </footer>
        )}
      </div>
    </ThemeScope>
  );
}
