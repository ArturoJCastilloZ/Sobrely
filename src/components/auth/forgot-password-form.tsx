"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "./submit-button";
import { FormMessage } from "./form-message";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPassword, null);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@correo.com"
          />
        </div>

        <FormMessage error={state?.error} success={state?.success} />

        <SubmitButton className="w-full">Enviar enlace</SubmitButton>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
