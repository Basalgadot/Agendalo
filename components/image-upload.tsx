"use client";

import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { ImageIcon, X } from "lucide-react";

interface Props {
  name: string;
  defaultValue?: string | null;
  label: string;
  hint?: string;
}

export function ImageUpload({ name, defaultValue, label, hint }: Props) {
  const [url, setUrl] = useState(defaultValue || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUrl(data.url);
    } catch {
      setError("No se pudo subir la imagen. Intenta de nuevo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input type="hidden" name={name} value={url} />

      <div className="flex items-center gap-4">
        {/* Preview */}
        <div className="relative shrink-0">
          {url ? (
            <div className="relative">
              <img
                src={url}
                alt=""
                className="w-16 h-16 rounded-lg object-cover border border-border"
              />
              <button
                type="button"
                onClick={() => setUrl("")}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center hover:opacity-80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Subiendo..." : url ? "Cambiar imagen" : "Subir imagen"}
          </button>
          {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
          {error && <p className="text-xs text-destructive mt-0.5">{error}</p>}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
