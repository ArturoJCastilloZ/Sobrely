import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { AppShell } from "@/components/dashboard/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth: proxy already guards /dashboard, but never trust a
  // single layer for authorization.
  if (!user) {
    redirect("/login?redirectTo=/dashboard");
  }

  const showAdmin = await isCurrentUserAdmin();

  // El menú de cuenta necesita nombre y avatar. `maybeSingle` y no `single`: un
  // perfil puede no existir todavía justo después del alta, y ahí el layout NO
  // debe tirar la sesión entera.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <AppShell
      showAdmin={showAdmin}
      email={user.email ?? ""}
      displayName={profile?.display_name ?? null}
      avatarUrl={profile?.avatar_url ?? null}
    >
      {children}
    </AppShell>
  );
}
