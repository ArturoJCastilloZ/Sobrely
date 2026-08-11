import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  formatPrice,
  getEffectivePrice,
  isOnLaunchOffer,
  type Plan,
} from "@/lib/billing";

/**
 * Tarjeta de un plan en `/pricing`. Presentacional: todos los datos vienen de
 * la config de planes, nunca hardcodeados. El destino del CTA se decide en la
 * página (aún no hay checkout — llega en la Subfase 8.5).
 */
export function PlanCard({
  plan,
  ctaHref,
  ctaLabel,
}: {
  plan: Plan;
  ctaHref: string;
  ctaLabel: string;
}) {
  const isFree = plan.billingType === "free";
  const price = getEffectivePrice(plan);
  const onOffer = isOnLaunchOffer(plan);
  const recommended = plan.isRecommended;

  return (
    <Card
      className={cn(
        "relative flex h-full flex-col",
        recommended && "overflow-visible ring-2 ring-primary",
      )}
    >
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="gap-1 shadow-sm">
            <Sparkles className="size-3" />
            Más elegido
          </Badge>
        </div>
      )}

      <CardHeader>
        <CardTitle className="text-lg">{plan.name}</CardTitle>
        <CardDescription>{plan.tagline}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div>
          {isFree ? (
            <p className="text-3xl font-bold tracking-tight">Gratis</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold tracking-tight">
                  {formatPrice(price, plan.currency)}
                </span>
                {onOffer && (
                  <span className="pb-1 text-sm text-muted-foreground line-through">
                    {formatPrice(plan.priceRegular, plan.currency)}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                Pago único por evento · {plan.currency}
                {onOffer && " · precio de lanzamiento"}
              </span>
            </div>
          )}
        </div>

        <ul className="flex flex-col gap-2 text-sm">
          {plan.highlights.map((h) => (
            <li key={h} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          render={<Link href={ctaHref} />}
          nativeButton={false}
          className="w-full"
          variant={recommended ? "default" : "outline"}
        >
          {ctaLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
