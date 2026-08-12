import type { Metadata } from "next";
import Link from "next/link";
import { LogoLockup } from "@/components/brand/logo-lockup";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { confirmEmail } from "./actions";

export const metadata: Metadata = { title: "Confirmar cuenta · Sobrely" };

const LABEL: Record<string, { title: string; description: string; cta: string }> =
  {
    signup: {
      title: "Confirma tu cuenta",
      description: "Da un último clic para activar tu cuenta de Sobrely.",
      cta: "Confirmar mi cuenta",
    },
    email: {
      title: "Confirma tu cuenta",
      description: "Da un último clic para activar tu cuenta de Sobrely.",
      cta: "Confirmar mi cuenta",
    },
    recovery: {
      title: "Restablece tu contraseña",
      description: "Confirma para continuar y crear una nueva contraseña.",
      cta: "Continuar",
    },
    magiclink: {
      title: "Inicia sesión",
      description: "Confirma para entrar a tu cuenta de Sobrely.",
      cta: "Iniciar sesión",
    },
  };

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash, type, next } = await searchParams;

  const invalid = !token_hash || !type;
  const copy = (type && LABEL[type]) || LABEL.signup;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 px-4 py-10">
      <Link href="/" aria-label="Sobrely — inicio">
        <LogoLockup markClassName="h-9 w-9" wordClassName="text-2xl" />
      </Link>
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>{invalid ? "Enlace inválido" : copy.title}</CardTitle>
            <CardDescription>
              {invalid
                ? "El enlace está incompleto o ya fue usado. Solicita uno nuevo."
                : copy.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invalid ? (
              <Link href="/login" className={cn(buttonVariants(), "w-full")}>
                Ir a iniciar sesión
              </Link>
            ) : (
              <form action={confirmEmail}>
                <input type="hidden" name="token_hash" value={token_hash} />
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="next" value={next ?? "/dashboard"} />
                <button
                  type="submit"
                  className={cn(buttonVariants(), "w-full")}
                >
                  {copy.cta}
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
