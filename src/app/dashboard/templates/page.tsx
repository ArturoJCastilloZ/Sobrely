import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UseTemplateButton } from "@/components/dashboard/use-template-button";

export const metadata: Metadata = { title: "Plantillas" };

type Template = {
  id: string;
  name: string;
  description: string | null;
  event_type: string | null;
};

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, description, event_type")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const list = (templates ?? []) as Template[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plantillas</h1>
          <p className="text-muted-foreground">
            Elige un diseño para empezar más rápido.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/dashboard" />}
          nativeButton={false}
        >
          ← Volver
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No hay plantillas disponibles. Ejecuta la migración de seed de
          plantillas.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{tpl.name}</CardTitle>
                  {tpl.event_type && (
                    <Badge variant="secondary">{tpl.event_type}</Badge>
                  )}
                </div>
                <CardDescription>{tpl.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <UseTemplateButton templateId={tpl.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
