"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  claimVanitySlug,
  getVanityState,
  releaseVanitySlug,
} from "@/lib/vanity/actions";

/**
 * URL personalizada premium (`/<slug>`). Solo se puede reclamar en invitaciones
 * Premium publicadas. Es un alias: `/<usuario>/<slug>` sigue funcionando.
 */
export function VanitySlugCard({ invitationId }: { invitationId: string }) {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    getVanityState(invitationId).then((s) => {
      if (!alive) return;
      setIsPremium(s.isPremium);
      setCurrent(s.currentVanity);
      setInput(s.currentVanity ?? "");
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [invitationId]);

  if (loading) return null;

  if (!isPremium) {
    return (
      <p className="text-xs text-muted-foreground">
        🔗 URL personalizada (<code>sobrely.com/tu-nombre</code>) — exclusiva del
        plan <strong>Premium</strong>.
      </p>
    );
  }

  function claim() {
    start(async () => {
      const res = await claimVanitySlug(invitationId, input);
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo reclamar.");
        return;
      }
      setCurrent(res.slug ?? null);
      toast.success("URL personalizada lista.");
    });
  }

  function release() {
    start(async () => {
      const res = await releaseVanitySlug(invitationId);
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo quitar.");
        return;
      }
      setCurrent(null);
      toast.success("URL personalizada liberada.");
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <span className="text-xs font-medium">
        🔗 URL personalizada <span className="text-brand-gold-deep">Premium</span>
      </span>
      {current ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded bg-muted px-2 py-1 font-mono">
            sobrely.com/{current}
          </span>
          <Button
            size="xs"
            variant="ghost"
            render={<a href={`/${current}`} target="_blank" rel="noopener noreferrer" />}
            nativeButton={false}
          >
            Ver ↗
          </Button>
          <Button size="xs" variant="outline" onClick={release} disabled={pending}>
            Quitar
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">sobrely.com/</span>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value.toLowerCase())}
            placeholder="mi-boda"
            className="h-8 flex-1 text-sm"
          />
          <Button size="sm" onClick={claim} disabled={pending || !input.trim()}>
            Reclamar
          </Button>
        </div>
      )}
    </div>
  );
}
