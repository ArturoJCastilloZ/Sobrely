"use client";

import type {
  PublicInvitation,
  GuestForInvitation,
} from "@/lib/invitations/public-types";
import { ModulePreview } from "@/components/modules/previews";
import { PublicRsvpForm } from "@/components/public/public-rsvp-form";
import { GuestResponsePanel } from "@/components/public/guest-response-panel";
import { parseConfig, type RsvpConfig } from "@/lib/modules/types";
import { parseTheme } from "@/lib/theme/theme";
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

  const modules = invitation.modules
    .filter((m) => m.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order);

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
              {m.module_type === "rsvp" ? (
                guest && guestToken ? (
                  <GuestResponsePanel
                    guest={guest}
                    token={guestToken}
                    config={parseConfig("rsvp", m.config) as RsvpConfig}
                  />
                ) : (
                  <PublicRsvpForm
                    invitationId={invitation.id}
                    config={parseConfig("rsvp", m.config) as RsvpConfig}
                  />
                )
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

        <footer className="px-6 py-8 text-center text-xs opacity-60 @2xl/inv:text-sm @4xl/inv:py-12 @4xl/inv:text-base">
          Hecho con Sobre<span style={{ color: "var(--inv-primary)" }}>ly</span>
        </footer>
      </div>
    </ThemeScope>
  );
}
