import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Iniciar sesión · InvitaFlow" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const { redirectTo } = await searchParams;
  const safeRedirect =
    redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bienvenido de nuevo</CardTitle>
        <CardDescription>
          Inicia sesión para gestionar tus invitaciones.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm redirectTo={safeRedirect} />
      </CardContent>
    </Card>
  );
}
