import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Confirms email links (signup, password recovery, magic link) on our OWN
 * domain instead of exposing the raw Supabase verify endpoint.
 *
 * The auth email templates point here with a one-time `token_hash` and a
 * `type`; we exchange it for a session cookie via `verifyOtp` and then send the
 * user to `next`. This replaces the default `{{ .ConfirmationURL }}` (which
 * linked to `<project>.supabase.co`).
 *
 * Supabase's `verifyOtp` uses `email` for the signup/magic-link confirmation
 * token (`signup`/`magiclink` are the older `/verify` endpoint values). To be
 * robust across versions we try the given `type` first and then a safe
 * equivalent — a failed `verifyOtp` does NOT consume the one-time token, so the
 * retry is harmless.
 */
const TYPE_FALLBACKS: Record<string, EmailOtpType[]> = {
  signup: ["email"],
  email: ["signup"],
  magiclink: ["email"],
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  const redirectTo = (path: string) => {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";
    if (!isLocalEnv && forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${path}`);
    }
    return NextResponse.redirect(`${origin}${path}`);
  };

  if (tokenHash && type) {
    const supabase = await createClient();
    const candidates: EmailOtpType[] = [type, ...(TYPE_FALLBACKS[type] ?? [])];
    let lastError = "";
    for (const candidate of candidates) {
      const { error } = await supabase.auth.verifyOtp({
        type: candidate,
        token_hash: tokenHash,
      });
      if (!error) {
        return redirectTo(safeNext);
      }
      lastError = error.message;
    }
    // Surface the real reason so failures are diagnosable (no secrets here —
    // token_hash is not included).
    const reason = encodeURIComponent(lastError).slice(0, 200);
    return redirectTo(`/login?error=auth&reason=${reason}`);
  }

  return redirectTo(`/login?error=auth&reason=missing_params`);
}
