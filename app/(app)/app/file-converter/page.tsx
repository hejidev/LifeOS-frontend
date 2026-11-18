"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Check, Copy, Download, FileCog, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileDrop } from "@/components/app/file-drop";
import { PageHeader, Section } from "@/components/app/kit";
import { PaywallDialog } from "@/components/PaywallDialog";
import { useBillingSummary, useConvertGenericFile, useConvertText, useCreateNote, useExtractDocxText, useExtractPdfText } from "@/lib/hooks/use-life-data";
import { saveTextAs } from "@/lib/download";
import { cn } from "@/lib/utils";

const MAX_BYTES = 25 * 1024 * 1024;
const FORMATS = ["json", "csv", "yaml"];
const FORMAT_FILE: Record<string, { ext: string; mime: string }> = {
  json: { ext: "json", mime: "application/json" },
  csv: { ext: "csv", mime: "text/csv" },
  yaml: { ext: "yml", mime: "text/yaml" },
};
const SAMPLE = '[{"name":"Ada","city":"Lagos"},{"name":"Tunde","city":"Ibadan"}]';

const FILE_GROUPS = [
  { name: "Document", inputs: ["doc", "docx", "odt", "rtf", "txt", "html", "pdf"], targets: ["pdf", "docx", "txt", "html", "rtf", "odt"] },
  { name: "Spreadsheet", inputs: ["xls", "xlsx", "ods", "csv"], targets: ["xlsx", "csv", "pdf", "html"] },
  { name: "Presentation", inputs: ["ppt", "pptx", "odp"], targets: ["pdf", "pptx", "jpg", "png"] },
  { name: "Image", inputs: ["jpg", "jpeg", "png", "webp", "gif", "bmp", "tif", "tiff", "heic", "svg"], targets: ["jpg", "png", "webp", "pdf", "gif", "tiff"] },
  { name: "Audio", inputs: ["mp3", "wav", "m4a", "ogg", "flac"], targets: ["mp3", "wav", "m4a", "ogg"] },
  { name: "Video", inputs: ["mp4", "mov", "webm", "avi", "mkv"], targets: ["mp4", "webm", "mp3", "gif"] },
];

const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const baseOf = (name: string) => name.replace(/\.[^.]+$/, "");
const sizeOf = (bytes: number) => (bytes > 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
      {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function DataTab() {
  const convert = useConvertText();
  const [from, setFrom] = useState("json");
  const [to, setTo] = useState("csv");
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");

  function swap() {
    setFrom(to);
    setTo(from);
    if (result) {
      setInput(result);
      setResult("");
    }
  }

  const select = "h-9 rounded-lg border bg-background px-3 text-sm";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Input" icon={FileText}>
        <div className="flex flex-wrap items-center gap-2">
          <select className={select} value={from} onChange={(event) => setFrom(event.target.value)}>{FORMATS.map((format) => <option key={format} value={format}>{format.toUpperCase()}</option>)}</select>
          <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Swap formats" onClick={swap}><ArrowLeftRight className="h-4 w-4" /></Button>
          <select className={select} value={to} onChange={(event) => setTo(event.target.value)}>{FORMATS.map((format) => <option key={format} value={format}>{format.toUpperCase()}</option>)}</select>
          <Button size="sm" className="ml-auto" disabled={convert.isPending || !input.trim()} onClick={() => convert.mutate({ content: input, from, to }, { onSuccess: setResult })}>
            {convert.isPending ? "Converting..." : "Convert"}
          </Button>
        </div>
        <Textarea rows={14} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Paste your data here..." className="font-mono text-xs" />
        {!input && <button type="button" className="text-xs text-primary hover:underline" onClick={() => { setFrom("json"); setInput(SAMPLE); }}>Try a sample</button>}
        {convert.isError && <p className="text-xs text-destructive">{(convert.error as Error).message}</p>}
      </Section>

      <Section title="Result" icon={FileCog} action={result ? (
        <div className="flex gap-2">
          <CopyButton text={result} />
          <Button size="sm" variant="outline" onClick={() => saveTextAs(result, `converted.${FORMAT_FILE[to].ext}`, FORMAT_FILE[to].mime)}><Download className="mr-1.5 h-3.5 w-3.5" /> Download</Button>
        </div>
      ) : undefined}>
        <pre className="min-h-[18rem] overflow-auto whitespace-pre-wrap rounded-lg border bg-card/60 p-3 font-mono text-xs">{result || "The converted data appears here."}</pre>
      </Section>
    </div>
  );
}

function ExtractTab() {
  const extractPdf = useExtractPdfText();
  const extractDocx = useExtractDocxText();
  const createNote = useCreateNote();
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [pages, setPages] = useState<number | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noted, setNoted] = useState(false);
  const busy = extractPdf.isPending || extractDocx.isPending;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  function pick(selected: File) {
    setFile(selected);
    setText("");
    setError(null);
    setNoted(false);
    const done = (value: { text: string; pages?: number; truncated?: boolean }) => {
      setText(value.text);
      setPages(value.pages ?? null);
      setTruncated(!!value.truncated);
    };
    const fail = (err: Error) => setError(err.message);
    if (extOf(selected.name) === "pdf") extractPdf.mutate(selected, { onSuccess: done, onError: fail });
    else extractDocx.mutate(selected, { onSuccess: done, onError: fail });
  }

  return (
    <div className="space-y-4">
      <FileDrop accept=".pdf,.docx" maxBytes={MAX_BYTES} title="Drop a PDF or Word document, or click to upload" hint="Extracts the text. Up to 25 MB. Scanned PDFs have no text to extract." busy={busy} onFile={pick} onReject={setError} />
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {text && file && (
        <Section
          title={file.name}
          icon={FileText}
          action={
            <div className="flex flex-wrap gap-2">
              <CopyButton text={text} />
              <Button size="sm" variant="outline" onClick={() => saveTextAs(text, `${baseOf(file.name)}.txt`)}><Download className="mr-1.5 h-3.5 w-3.5" /> .txt</Button>
              <Button size="sm" variant="outline" disabled={createNote.isPending || noted} onClick={() => createNote.mutate({ title: baseOf(file.name).slice(0, 200), content: text.slice(0, 200_000), folder: "Personal" }, { onSuccess: () => setNoted(true), onError: (err: Error) => setError(err.message) })}>
                <FileText className="mr-1.5 h-3.5 w-3.5" /> {noted ? "Saved to Notes" : "Save as note"}
              </Button>
            </div>
          }
        >
          <p className="text-xs text-muted-foreground">
            {words.toLocaleString()} words{pages ? ` · ${pages} ${pages === 1 ? "page" : "pages"}` : ""}{truncated ? " · showing the first 500,000 characters" : ""}
            {noted && <> · <Link href="/app/notes" className="text-primary hover:underline">Open Notes</Link></>}
          </p>
          <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg border bg-card/60 p-3 text-xs">{text}</pre>
        </Section>
      )}
    </div>
  );
}

function ConvertTab() {
  const convert = useConvertGenericFile();
  const { data: billing } = useBillingSummary();
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState(false);

  const group = file ? FILE_GROUPS.find((item) => item.inputs.includes(extOf(file.name))) ?? null : null;
  const targets = group && file ? group.targets.filter((format) => format !== extOf(file.name)) : [];
  const freeLeft = billing && !billing.isPaid ? Math.max(0, billing.freeUsesPerTool - (billing.usage?.FILE_CONVERTER ?? 0)) : null;

  function pick(selected: File) {
    setError(null);
    setResult(null);
    if (!FILE_GROUPS.some((item) => item.inputs.includes(extOf(selected.name)))) return setError("That file type isn't supported for conversion.");
    setFile(selected);
    setTarget(null);
  }

  function run() {
    if (!file || !target) return;
    setError(null);
    convert.mutate(
      { file, targetFormat: target },
      {
        onSuccess: setResult,
        onError: (err: Error & { status?: number }) => (err.status === 402 || err.message.includes("free uses") ? setPaywall(true) : setError(err.message)),
      }
    );
  }

  function clear() {
    setFile(null);
    setTarget(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      {!file ? (
        <FileDrop maxBytes={MAX_BYTES} title="Drop a file here, or click to upload" hint="Documents, spreadsheets, presentations, images, audio and video. Up to 25 MB." onFile={pick} onReject={setError} />
      ) : (
        <Section title="Convert" icon={FileCog} action={freeLeft !== null ? <span className="text-xs text-muted-foreground">{freeLeft} free {freeLeft === 1 ? "use" : "uses"} left</span> : undefined}>
          <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{group?.name} · {sizeOf(file.size)}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Remove file" disabled={convert.isPending} onClick={clear}><X className="h-4 w-4" /></Button>
          </div>

          {!result && (
            <>
              <p className="text-xs font-medium text-muted-foreground">Convert to</p>
              <div className="flex flex-wrap gap-2">
                {targets.map((format) => (
                  <button key={format} type="button" disabled={convert.isPending} onClick={() => setTarget(format)} className={cn("rounded-full border px-4 py-1.5 text-sm font-medium uppercase", target === format ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
                    {format}
                  </button>
                ))}
              </div>
              <Button disabled={!target || convert.isPending} onClick={run}>
                {convert.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Converting. This can take up to 45 seconds...</> : target ? `Convert to ${target.toUpperCase()}` : "Choose a format"}
              </Button>
            </>
          )}

          {result && (
            <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="flex items-center gap-2 text-sm font-medium"><Check className="h-4 w-4 text-emerald-600" /> Your file is ready</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" asChild><a href={result.url} target="_blank" rel="noopener noreferrer"><Download className="mr-1.5 h-3.5 w-3.5" /> Download {result.filename}</a></Button>
                <Button size="sm" variant="outline" onClick={clear}>Convert another</Button>
              </div>
              <p className="text-[11px] text-muted-foreground">The download link expires after a while, so save the file now.</p>
            </div>
          )}
        </Section>
      )}

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <PaywallDialog open={paywall} onOpenChange={setPaywall} toolName="File Converter" />
    </div>
  );
}

const TABS = [
  { key: "data", label: "Data formats" },
  { key: "extract", label: "Extract text" },
  { key: "files", label: "Convert files" },
] as const;

export default function FileConverterPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("data");

  return (
    <div className="space-y-6">
      <PageHeader icon={FileCog} title="File Converter" subtitle="Convert data, pull text out of documents, and change file formats." />

      <div className="flex gap-1.5 overflow-x-auto">
        {TABS.map((item) => (
          <button key={item.key} type="button" onClick={() => setTab(item.key)} className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium", tab === item.key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === "data" && <DataTab />}
      {tab === "extract" && <ExtractTab />}
      {tab === "files" && <ConvertTab />}
    </div>
  );
}