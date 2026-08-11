import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { Button } from "@/components/ui/button";

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
          <Link href="/dashboard" className="font-bold tracking-tight">
            Invita<span className="text-primary">Flow</span>
          </Link>
          <div className="flex items-center gap-3">
            {showAdmin ? (
              <Button
                render={<Link href="/admin" />}
                nativeButton={false}
                variant="ghost"
                size="sm"
              >
                Admin
              </Button>
            ) : null}
            <Button
              render={<Link href="/dashboard/referrals" />}
              nativeButton={false}
              variant="ghost"
              size="sm"
            >
              Referidos
            </Button>
            <Button
              render={<Link href="/dashboard/billing" />}
              nativeButton={false}
              variant="ghost"
              size="sm"
            >
              Facturación
            </Button>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                Cerrar sesión
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
