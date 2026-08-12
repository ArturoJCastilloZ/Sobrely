"use server";

import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * `verifyOtp` uses `email` for the signup/magic-link token in the token_hash
 * flow (`signup`/`magiclink` are the older `/verify` values). We try the given
 * `type` and then a safe equivalent — a failed verify does NOT consume the
 * one-time token.
 */
const TYPE_FALLBACKS: Record<string, EmailOtpType[]> = {
  signup: ["email"],
  email: ["signup"],
  magiclink: ["email"],
};

/**
 * Verifies the email link. Called from a POST form on the confirm page (not on
 * GET), so email link scanners that pre-fetch the URL can't consume the
 * one-time token before the user clicks "Confirmar".
 */
export async function confirmEmail(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "") as EmailOtpType;
  const nextRaw = String(formData.get("next") ?? "/dashboard");
  const next = nextRaw.startsWith("/") ? nextRaw : "/dashboard";

  if (!tokenHash || !type) {
    redirect("/login?error=auth&reason=missing_params");
  }

  const supabase = await createClient();
  const candidates: EmailOtpType[] = [type, ...(TYPE_FALLBACKS[type] ?? [])];
  let lastError = "";
  for (const candidate of candidates) {
    const { error } = await supabase.auth.verifyOtp({
      type: candidate,
      token_hash: tokenHash,
    });
    if (!error) {
      redirect(next);
    }
    lastError = error.message;
  }

  const reason = encodeURIComponent(lastError).slice(0, 200);
  redirect(`/login?error=auth&reason=${reason}`);
}
