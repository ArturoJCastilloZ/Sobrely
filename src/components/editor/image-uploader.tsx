"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/images/compress";
import { checkUploadQuota } from "@/lib/billing/actions";
import { Button } from "@/components/ui/button";

const BUCKET = "invitation-images";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB source cap before compression

export type UploadContext = { userId: string; invitationId: string };

export function ImageUploader({
  value,
  onChange,
  ctx,
  label = "Subir imagen",
}: {
  value: string;
  onChange: (url: string) => void;
  ctx: UploadContext;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona un archivo de imagen.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("La imagen supera los 10 MB.");
      return;
    }

    setUploading(true);
    try {
      const { blob, contentType, ext } = await compressImage(file);

      // Barrera de cuota de almacenamiento según el plan (server-side).
      const quota = await checkUploadQuota(ctx.invitationId, blob.size);
      if (!quota.allowed) {
        toast.error(
          `Alcanzaste el límite de almacenamiento de tu plan (${quota.usedMb} / ${quota.limitMb} MB). Mejora tu plan para subir más imágenes.`,
        );
        return;
      }

      const supabase = createClient();
      // La extensión y el contentType salen de la compresión: un PNG con
      // transparencia se guarda WebP, no JPEG (que aplanaría el alfa).
      const path = `${ctx.userId}/${ctx.invitationId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType, upsert: false });
      if (error) {
        toast.error("No se pudo subir la imagen.");
        return;
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Imagen subida.");
    } catch {
      toast.error("Error al procesar la imagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Vista previa"
          className="h-28 w-full rounded-md object-cover"
        />
      )}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Subiendo…" : label}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={() => onChange("")}
          >
            Quitar
          </Button>
        )}
      </div>
    </div>
  );
}
