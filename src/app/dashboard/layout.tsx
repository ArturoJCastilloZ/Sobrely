import Link from "next/link";
import { LogoLockup } from "@/components/brand/logo-lockup";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

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

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" aria-label="Sobrely — inicio">
            <LogoLockup markClassName="h-7 w-7" wordClassName="text-lg" />
          </Link>
          <DashboardNav showAdmin={showAdmin} email={user.email ?? ""} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
