"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

function accepts(file: File, accept?: string) {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  return accept.split(",").some((rule) => {
    const value = rule.trim().toLowerCase();
    if (value.startsWith(".")) return name.endsWith(value);
    if (value.endsWith("/*")) return file.type.startsWith(value.slice(0, -1));
    return file.type === value;
  });
}

export function FileDrop({
  accept,
  maxBytes,
  title,
  hint,
  busy,
  onFile,
  onReject,
}: {
  accept?: string;
  maxBytes: number;
  title: string;
  hint: string;
  busy?: boolean;
  onFile: (file: File) => void;
  onReject: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function take(file?: File | null) {
    if (!file || busy) return;
    if (file.size > maxBytes) return onReject(`That file is larger than ${Math.round(maxBytes / 1_048_576)} MB.`);
    if (!accepts(file, accept)) return onReject("That file type isn't supported here.");
    onFile(file);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !busy && input.current?.click()}
      onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && input.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        take(event.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-12 text-center transition-colors",
        over ? "border-primary bg-primary/5" : "hover:border-primary/40",
        busy && "cursor-wait opacity-70"
      )}
    >
      {busy ? <Loader2 className="h-7 w-7 animate-spin text-primary" /> : <Upload className="h-7 w-7 text-muted-foreground" />}
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          take(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}