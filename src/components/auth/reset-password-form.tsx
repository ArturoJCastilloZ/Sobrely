"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "./submit-button";
import { FormMessage } from "./form-message";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPassword, null);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar contraseña</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>

        <FormMessage error={state?.error} success={state?.success} />

        <SubmitButton className="w-full">Guardar contraseña</SubmitButton>
      </form>

      {state?.success && (
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Ir a iniciar sesión
          </Link>
        </p>
      )}
    </div>
  );
}
