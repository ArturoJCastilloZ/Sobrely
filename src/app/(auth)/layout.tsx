import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 px-4 py-10">
      <Link href="/" className="text-xl font-bold tracking-tight">
        Invita<span className="text-primary">Flow</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
