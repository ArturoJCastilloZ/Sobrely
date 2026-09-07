import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/dashboard/app-shell";

/**
 * Layout del panel admin. Gate duro server-side: `requireAdmin()` redirige a
 * quien no sea admin antes de renderizar cualquier contenido.
 *
 * Usa el MISMO shell que el panel. Antes tenía un layout propio casi idéntico,
 * y el efecto era que entrar a Admin hacía desaparecer el sidebar: parecía que
 * habías salido de la aplicación. El "← Dashboard" que compensaba eso ya no
 * hace falta — el sidebar es la forma de volver, y de ir a cualquier otro
 * lado.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <AppShell
      showAdmin
      email={user?.email ?? ""}
      displayName={profile?.display_name ?? null}
      avatarUrl={profile?.avatar_url ?? null}
      badge={
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[length:var(--ed-text-mini)] font-(--ed-weight-medium) text-primary">
          Admin
        </span>
      }
    >
      {children}
    </AppShell>
  );
}
