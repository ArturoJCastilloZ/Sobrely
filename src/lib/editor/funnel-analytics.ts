"use client";

import { track } from "@vercel/analytics/react";

/** Eventos acordados en C3 que nacen dentro del editor. Sin PII ni IDs. */
export const EDITOR_FUNNEL_EVENTS = ["editor_abierto", "publicar_tocado"] as const;

export type EditorFunnelEvent = (typeof EDITOR_FUNNEL_EVENTS)[number];

export function trackEditorFunnelEvent(event: EditorFunnelEvent) {
  track(event);
}
