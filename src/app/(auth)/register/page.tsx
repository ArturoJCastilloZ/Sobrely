import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";
import { rutaInternaSegura } from "@/lib/auth/ruta-interna";

export const metadata: Metadata = { title: "Crear cuenta · Sobrely" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crea tu cuenta</CardTitle>
        <CardDescription>
          Empieza a diseñar invitaciones digitales en minutos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm next={rutaInternaSegura(next)} />
      </CardContent>
    </Card>
  );
}
