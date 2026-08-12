import Link from "next/link";
import { LogoLockup } from "@/components/brand/logo-lockup";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 px-4 py-10">
      <Link href="/" aria-label="Sobrely — inicio">
        <LogoLockup markClassName="h-9 w-9" wordClassName="text-2xl" />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
