"use client";

import type { PublicInvitation } from "@/lib/invitations/public-types";
import { ModulePreview } from "@/components/modules/previews";
import { PublicRsvpForm } from "@/components/public/public-rsvp-form";
import { parseConfig, type RsvpConfig } from "@/lib/modules/types";
import { parseTheme } from "@/lib/theme/theme";
import { ThemeScope } from "@/components/theme/theme-scope";
import { AnimatedModule } from "@/components/animation/animated-module";
import { DecorationLayer } from "@/components/animation/decoration-layer";
import {
  resolveAnimation,
  readModuleAnimationOverride,
} from "@/lib/animation/schema";

export function PublicInvitationView({
  invitation,
}: {
  invitation: PublicInvitation;
}) {
  const theme = parseTheme(invitation.theme_config);

  const modules = invitation.modules
    .filter((m) => m.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <ThemeScope
      theme={theme}
      className="relative mx-auto min-h-svh w-full max-w-[480px] overflow-hidden shadow-sm"
    >
      {theme.animations && theme.decoration.enabled && (
        <DecorationLayer
          variant={theme.decoration.variant}
          symbol={theme.decoration.symbol}
          count={12}
        />
      )}
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
                <PublicRsvpForm
                  invitationId={invitation.id}
                  config={parseConfig("rsvp", m.config) as RsvpConfig}
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

        <footer className="px-6 py-8 text-center text-xs opacity-60">
          Hecho con Invita<span style={{ color: "var(--inv-primary)" }}>Flow</span>
        </footer>
      </div>
    </ThemeScope>
  );
}
