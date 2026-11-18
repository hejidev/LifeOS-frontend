"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Eraser, ImageIcon, Loader2, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDrop } from "@/components/app/file-drop";
import { PageHeader, Section } from "@/components/app/kit";
import { PaywallDialog } from "@/components/PaywallDialog";
import { useApplyImageTool, useBillingSummary, useConvertImageFormat, useGenerativeImageEdit, useUploadImageForTools } from "@/lib/hooks/use-life-data";
import { saveUrlAs } from "@/lib/download";
import { cn } from "@/lib/utils";

interface Uploaded {
  publicId: string;
  url: string;
  name: string;
  width: number;
  height: number;
}

interface Result {
  id: string;
  label: string;
  url: string;
}

const GROUPS = [
  {
    title: "Enhance",
    tools: [
      { key: "ENHANCE", label: "Auto enhance", hint: "Fix colour, contrast and brightness" },
      { key: "UPSCALE", label: "Upscale", hint: "Increase resolution with AI" },
    ],
  },
  { title: "Background", tools: [{ key: "REMOVE_BACKGROUND", label: "Remove background", hint: "Cut out the subject" }] },
  {
    title: "Style",
    tools: [
      { key: "GRAYSCALE", label: "Grayscale", hint: "Black and white" },
      { key: "SEPIA", label: "Sepia", hint: "Warm vintage tone" },
    ],
  },
];

const FORMATS = [
  { key: "webp", hint: "Small files" },
  { key: "png", hint: "Lossless" },
  { key: "jpg", hint: "Compatible" },
  { key: "avif", hint: "Best compression" },
];

const MAX_BYTES = 15 * 1024 * 1024;
const checkerboard = { backgroundImage: "repeating-conic-gradient(#88888822 0% 25%, transparent 0% 50%)", backgroundSize: "20px 20px" };
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AIImageToolsPage() {
  const qc = useQueryClient();
  const upload = useUploadImageForTools();
  const applyTool = useApplyImageTool();
  const convertFormat = useConvertImageFormat();
  const generative = useGenerativeImageEdit();
  const { data: billing } = useBillingSummary();

  const [uploaded, setUploaded] = useState<Uploaded | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [mode, setMode] = useState<"remove" | "fill">("remove");
  const [prompt, setPrompt] = useState("");

  const active = results.find((result) => result.id === activeId) ?? null;
  const freeLeft = billing && !billing.isPaid ? Math.max(0, billing.freeUsesPerTool - (billing.usage?.AI_IMAGE ?? 0)) : null;
  const locked = !uploaded || !!working || upload.isPending;

  function pick(file: File) {
    setError(null);
    upload.mutate(file, {
      onSuccess: (data) => {
        setUploaded({ ...data, name: file.name.replace(/\.[^.]+$/, "") });
        setResults([]);
        setActiveId(null);
      },
      onError: (err: Error) => setError(err.message),
    });
  }

  async function run(label: string, task: () => Promise<{ url: string }>) {
    if (working) return;
    setWorking(label);
    setError(null);
    setBroken(false);

    try {
      const { url } = await task();
      const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label, url };
      setResults((current) => [entry, ...current].slice(0, 8));
      setActiveId(entry.id);
    } catch (err) {
      const failure = err as Error & { status?: number };
      if (failure.status === 402 || failure.message.includes("free uses")) setPaywall(true);
      else setError(failure.message);
    } finally {
      setWorking(null);
      void qc.invalidateQueries({ queryKey: ["billing"] });
    }
  }

  const runTool = (key: string, label: string) => uploaded && run(label, () => applyTool.mutateAsync({ publicId: uploaded.publicId, tool: key }));
  const runFormat = (key: string) => uploaded && run(`To ${key.toUpperCase()}`, () => convertFormat.mutateAsync({ publicId: uploaded.publicId, format: key }));
  const runGenerative = () =>
    uploaded && prompt.trim() && run(mode === "remove" ? "Remove object" : "Replace background", () => generative.mutateAsync({ publicId: uploaded.publicId, prompt: prompt.trim(), mode }));

  function reset() {
    setUploaded(null);
    setResults([]);
    setActiveId(null);
    setError(null);
    setPrompt("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ImageIcon}
        title="Image Tools"
        subtitle="Remove backgrounds, enhance, convert and edit with AI."
        actions={
          <>
            {freeLeft !== null && <span className="text-xs text-muted-foreground">{freeLeft} free {freeLeft === 1 ? "use" : "uses"} left</span>}
            {uploaded && <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> New image</Button>}
          </>
        }
      />

      {!uploaded ? (
        <FileDrop accept="image/png,image/jpeg,image/webp,image/gif,image/avif" maxBytes={MAX_BYTES} title="Drop an image here, or click to upload" hint="PNG, JPG, WebP, GIF or AVIF, up to 15 MB. Uploads are deleted automatically after 24 hours." busy={upload.isPending} onFile={pick} onReject={setError} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Original · {uploaded.width} × {uploaded.height}</p>
                <div className="flex min-h-[14rem] items-center justify-center overflow-hidden rounded-xl border bg-card/40">
                  <img src={uploaded.url} alt="Original" className="max-h-[26rem] w-full object-contain" />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{active ? active.label : "Result"}</p>
                <div className="flex min-h-[14rem] items-center justify-center overflow-hidden rounded-xl border" style={checkerboard}>
                  {working ? (
                    <p className="flex items-center gap-2 bg-background/80 px-3 py-2 text-sm"><Loader2 className="h-4 w-4 animate-spin text-primary" /> {working}...</p>
                  ) : active && !broken ? (
                    <img src={active.url} alt={active.label} className="max-h-[26rem] w-full object-contain" onError={() => setBroken(true)} />
                  ) : broken ? (
                    <p className="bg-background/80 px-3 py-2 text-sm text-destructive">The result couldn't be displayed. Try again.</p>
                  ) : (
                    <p className="bg-background/80 px-3 py-2 text-sm text-muted-foreground">Choose a tool to see the result</p>
                  )}
                </div>
                {active && !working && (
                  <Button size="sm" variant="outline" onClick={() => saveUrlAs(active.url, `${slug(uploaded.name)}-${slug(active.label)}`)}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                  </Button>
                )}
              </div>
            </div>

            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

            {results.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">This session</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => {
                        setActiveId(result.id);
                        setBroken(false);
                      }}
                      className={cn("w-20 shrink-0 space-y-1 rounded-lg border p-1 text-left", result.id === activeId && "border-primary ring-1 ring-primary")}
                    >
                      <span className="block h-14 overflow-hidden rounded" style={checkerboard}>
                        <img src={result.url} alt="" className="h-full w-full object-cover" />
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">{result.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {GROUPS.map((group) => (
              <Section key={group.title} title={group.title} icon={Sparkles}>
                <div className="grid gap-2">
                  {group.tools.map((tool) => (
                    <button key={tool.key} type="button" disabled={locked} onClick={() => runTool(tool.key, tool.label)} className="rounded-lg border px-3 py-2 text-left transition-colors hover:border-primary/40 disabled:opacity-50">
                      <span className="block text-sm font-medium">{tool.label}</span>
                      <span className="block text-xs text-muted-foreground">{tool.hint}</span>
                    </button>
                  ))}
                </div>
              </Section>
            ))}

            <Section title="Convert format" icon={ImageIcon}>
              <div className="grid grid-cols-2 gap-2">
                {FORMATS.map((format) => (
                  <button key={format.key} type="button" disabled={locked} onClick={() => runFormat(format.key)} className="rounded-lg border px-3 py-2 text-left transition-colors hover:border-primary/40 disabled:opacity-50">
                    <span className="block text-sm font-medium">{format.key.toUpperCase()}</span>
                    <span className="block text-[11px] text-muted-foreground">{format.hint}</span>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Generative edit" icon={Wand2} className="border-primary/20 bg-primary/5">
              <div className="flex gap-2">
                <Button size="sm" variant={mode === "remove" ? "default" : "outline"} className="flex-1" onClick={() => setMode("remove")}><Eraser className="mr-1.5 h-3.5 w-3.5" /> Remove</Button>
                <Button size="sm" variant={mode === "fill" ? "default" : "outline"} className="flex-1" onClick={() => setMode("fill")}><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Background</Button>
              </div>
              <Input value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={300} placeholder={mode === "remove" ? "What to remove, e.g. the person on the left" : "New background, e.g. a sunset beach"} />
              <Button className="w-full" disabled={locked || !prompt.trim()} onClick={runGenerative}>{working && (working === "Remove object" || working === "Replace background") ? "Working..." : "Apply"}</Button>
              <p className="text-[11px] text-muted-foreground">Generative edits can take up to 20 seconds.</p>
            </Section>
          </div>
        </div>
      )}

      {!uploaded && error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <PaywallDialog open={paywall} onOpenChange={setPaywall} toolName="Image Tools" />
    </div>
  );
}