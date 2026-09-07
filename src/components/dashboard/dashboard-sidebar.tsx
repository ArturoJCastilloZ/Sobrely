"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGridIcon,
  SparklesIcon,
  WandSparklesIcon,
  CreditCardIcon,
  GiftIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Sidebar del panel.
 *
 * Antes el dashboard era un header horizontal con tres enlaces dentro de un
 * `max-w-5xl`. Eso comunica "sitio web"; una herramienta por la que se paga
 * comunica "aplicación", y la diferencia estructural es exactamente esta.
 *
 * Los tokens `--sidebar-*` **ya estaban definidos** en `globals.css` desde el
 * scaffold de shadcn —dieciséis de ellos— y `grep` no encontraba un solo uso:
 * eran los tokens de un componente que nunca se construyó. Aquí por fin se usan
 * en vez de inventar otros.
 *
 * Solo desde `lg`. En móvil manda el header con su menú, que ya existe y ya
 * resuelve el desbordamiento; meter un cajón lateral en un teléfono para cinco
 * enlaces sería complejidad sin retorno.
 */

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** `true` = solo activo en coincidencia exacta (si no, "/dashboard" se
   *  quedaría activo en todas sus hijas). */
  exact?: boolean;
};

const PRINCIPALES: Item[] = [
  { href: "/dashboard", label: "Mis eventos", icon: LayoutGridIcon, exact: true },
  { href: "/dashboard/templates", label: "Plantillas", icon: SparklesIcon },
  { href: "/dashboard/animations", label: "Animaciones", icon: WandSparklesIcon },
];

const CUENTA: Item[] = [
  { href: "/dashboard/billing", label: "Facturación", icon: CreditCardIcon },
  { href: "/dashboard/referrals", label: "Referidos", icon: GiftIcon },
];

function esActivo(pathname: string, item: Item) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function NavLink({ item, activo }: { item: Item; activo: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "flex h-11 items-center gap-2.5 rounded-[var(--ed-radius-sm)] px-2.5",
        "text-[length:var(--ed-text-sm)]/(--ed-leading-sm) tracking-(--ed-tracking-sm)",
        "transition-colors duration-(--ed-fast) ease-(--ed-ease-out)",
        "focus-visible:ring-3 focus-visible:ring-sidebar-ring/50 focus-visible:outline-none",
        activo
          ? "bg-sidebar-accent font-(--ed-weight-medium) text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}

function Grupo({ titulo, items, pathname }: { titulo: string; items: Item[]; pathname: string }) {
  return (
    <div className="space-y-0.5">
      <p className="px-2.5 pb-1 text-[length:var(--ed-text-micro)] font-(--ed-weight-medium) tracking-(--ed-tracking-micro) text-sidebar-foreground/50 uppercase">
        {titulo}
      </p>
      {items.map((item) => (
        <NavLink key={item.href} item={item} activo={esActivo(pathname, item)} />
      ))}
    </div>
  );
}

export function DashboardSidebar({ showAdmin }: { showAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="hidden w-(--ed-sidebar-w) shrink-0 flex-col gap-5 border-r border-sidebar-border bg-sidebar p-3 lg:flex"
    >
      <Grupo titulo="Eventos" items={PRINCIPALES} pathname={pathname} />
      <Grupo titulo="Cuenta" items={CUENTA} pathname={pathname} />
      {showAdmin && (
        <Grupo
          titulo="Interno"
          items={[{ href: "/admin", label: "Admin", icon: ShieldCheckIcon }]}
          pathname={pathname}
        />
      )}
    </nav>
  );
}
