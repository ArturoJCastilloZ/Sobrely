"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { applyReferralCode } from "@/lib/referrals/actions";
import { formatPrice } from "@/lib/billing";
import type { ReferralStatus, ReferralSummary } from "@/lib/referrals/types";

const STATUS: Record<
  ReferralStatus,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  pending: { label: "Pendiente", variant: "secondary" },
  qualified: { label: "Calificado", variant: "outline" },
  credited: { label: "Acreditado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "outline" },
};

/**
 * Panel de referidos (Subfase 8.6): muestra el código del usuario, permite
 * compartirlo, aplicar un código recibido (una sola vez) y ver el saldo de
 * crédito acumulado y la lista de referidos.
 */
export function ReferralPanel({
  summary,
  canApply,
}: {
  summary: ReferralSummary;
  /** true si el usuario aún no ha aplicado ningún código. */
  canApply: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ShareCard summary={summary} />
      {canApply ? <ApplyCard /> : null}
      <ReferralList summary={summary} />
    </div>
  );
}

function ShareCard({ summary }: { summary: ReferralSummary }) {
  function copy(text: string, label: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} copiado`))
      .catch(() => toast.error("No se pudo copiar"));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tu código de referido</CardTitle>
        <CardDescription>
          Compártelo. Cuando alguien lo use y haga su primera compra, ganas
          crédito en tu cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <code className="rounded-md bg-muted px-3 py-2 text-lg font-semibold tracking-widest">
            {summary.code}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copy(summary.code, "Código")}
          >
            Copiar código
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Input readOnly value={summary.shareUrl} className="text-xs" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => copy(summary.shareUrl, "Enlace")}
          >
            Copiar enlace
          </Button>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <span className="text-sm text-muted-foreground">
            Crédito acumulado
          </span>
          <span className="text-lg font-semibold">
            {formatPrice(summary.creditBalance, summary.currency)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          El crédito se acumula en tu cuenta. Escríbenos para aplicarlo en tu
          próxima compra.
        </p>
      </CardContent>
    </Card>
  );
}

function ApplyCard() {
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  function submit() {
    start(async () => {
      const res = await applyReferralCode(code);
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo aplicar el código.");
        return;
      }
      setDone(true);
      toast.success("¡Código aplicado! Se registró tu referido.");
    });
  }

  if (done) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">¿Te invitó alguien?</CardTitle>
        <CardDescription>
          Ingresa el código que te compartieron (solo se puede aplicar una vez).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Ej. ABCD123"
          className="uppercase tracking-widest"
        />
        <Button onClick={submit} disabled={pending || !code.trim()} size="sm">
          {pending ? "Aplicando…" : "Aplicar"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ReferralList({ summary }: { summary: ReferralSummary }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Tus referidos</h2>
      {summary.referrals.length === 0 ? (
        <Card>
          <CardHeader>
            <CardDescription>
              Aún no tienes referidos. ¡Comparte tu código!
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {summary.referrals.map((r) => {
            const st = STATUS[r.status];
            return (
              <Card key={r.id}>
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">Referido</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === "credited" ? (
                      <span className="text-sm font-medium">
                        +{formatPrice(r.creditAmount, summary.currency)}
                      </span>
                    ) : null}
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
