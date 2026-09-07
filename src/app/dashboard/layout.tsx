import Link from "next/link";
import { LogoLockup } from "@/components/brand/logo-lockup";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

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

  // El header necesita nombre y avatar para el menú de cuenta. `maybeSingle`
  // y no `single`: un perfil puede no existir todavía justo después del alta,
  // y ahí el layout NO debe tirar la sesión entera.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="flex w-full items-center justify-between px-4 py-3 lg:px-6">
          <Link href="/dashboard" aria-label="Sobrely — inicio">
            <LogoLockup markClassName="h-7 w-7" wordClassName="text-lg" />
          </Link>
          <DashboardNav
            showAdmin={showAdmin}
            email={user.email ?? ""}
            displayName={profile?.display_name ?? null}
            avatarUrl={profile?.avatar_url ?? null}
          />
        </div>
      </header>
      <div className="flex flex-1">
        <DashboardSidebar showAdmin={showAdmin} />
        <main className="min-w-0 flex-1 px-4 py-8 lg:px-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
