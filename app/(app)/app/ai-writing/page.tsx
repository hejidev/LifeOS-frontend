"use client";

import { useEffect, useState } from "react";
import { Check, Copy, FileText, Loader2, PenTool, Save, Sparkles, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader, Section } from "@/components/app/kit";
import { PaywallDialog } from "@/components/PaywallDialog";
import {
  useBillingSummary, useConvertWritingToNote, useDeleteWritingDocument, useSaveWritingDocument, useStreamWriting, useWritingDocuments,
} from "@/lib/hooks/use-life-data";
import { cn } from "@/lib/utils";

const MODES = [
  { key: "GENERATE", label: "Write", hint: "Describe what you want written.", tone: true },
  { key: "REWRITE", label: "Rewrite", hint: "Paste text to say in different words.", tone: true },
  { key: "IMPROVE", label: "Fix grammar", hint: "Paste text to polish." },
  { key: "SHORTEN", label: "Shorten", hint: "Paste text to make it shorter." },
  { key: "EXPAND", label: "Expand", hint: "Paste text to add detail." },
  { key: "SUMMARIZE", label: "Summarize", hint: "Paste text to get the key points." },
  { key: "TRANSLATE", label: "Translate", hint: "Paste text to translate.", language: true },
  { key: "TONE_CHANGE", label: "Change tone", hint: "Paste text to restyle.", tone: true },
] as const;

const TONES = ["Professional", "Casual", "Friendly", "Persuasive", "Confident", "Formal", "Empathetic", "Humorous"];
const LANGUAGES = ["English", "French", "Yoruba", "Igbo", "Hausa", "Nigerian Pidgin", "Spanish", "German", "Portuguese", "Italian", "Arabic", "Chinese", "Japanese"];
const MAX_INPUT = 8000;

export default function AIWritingPage() {
  const { output, setOutput, isStreaming, error, generate, stop, reset } = useStreamWriting();
  const { data: documents = [] } = useWritingDocuments();
  const saveDoc = useSaveWritingDocument();
  const deleteDoc = useDeleteWritingDocument();
  const toNote = useConvertWritingToNote();
  const { data: billing } = useBillingSummary();

  const [mode, setMode] = useState<(typeof MODES)[number]["key"]>("GENERATE");
  const [input, setInput] = useState("");
  const [tone, setTone] = useState("Auto");
  const [language, setLanguage] = useState("English");
  const [saveOpen, setSaveOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paywall, setPaywall] = useState(false);

  const current = MODES.find((item) => item.key === mode)!;
  const usesTone = "tone" in current;
  const usesLanguage = "language" in current;
  const words = output.trim() ? output.trim().split(/\s+/).length : 0;
  const freeLeft = billing && !billing.isPaid ? Math.max(0, billing.freeUsesPerTool - (billing.usage?.AI_WRITING ?? 0)) : null;

  useEffect(() => {
    if (error?.includes("free uses")) setPaywall(true);
  }, [error]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  function run() {
    const text = input.trim();
    if (!text || isStreaming) return;
    const chosenTone = usesTone ? (tone === "Auto" ? (mode === "TONE_CHANGE" ? "Professional" : undefined) : tone) : undefined;
    void generate({ mode, input: text, ...(chosenTone ? { tone: chosenTone } : {}), ...(usesLanguage ? { targetLanguage: language } : {}) });
  }

  function save() {
    saveDoc.mutate(
      { title: title.trim() || input.trim().slice(0, 40) || "Untitled", mode, input, output, ...(usesTone && tone !== "Auto" ? { tone } : {}) },
      { onSuccess: () => { setSaveOpen(false); setTitle(""); setNotice("Saved to history"); } }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={PenTool} title="AI Writing" subtitle="Write, rewrite, translate and polish text with AI." />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Your text" icon={Sparkles} action={freeLeft !== null ? <span className="text-xs text-muted-foreground">{freeLeft} free {freeLeft === 1 ? "use" : "uses"} left</span> : undefined}>
            <div className="flex flex-wrap gap-1.5">
              {MODES.map((item) => (
                <button key={item.key} type="button" onClick={() => setMode(item.key)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", mode === item.key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{current.hint}</p>

            {(usesTone || usesLanguage) && (
              <select
                className="flex h-9 w-full rounded-lg border bg-background px-3 text-sm sm:w-64"
                value={usesLanguage ? language : tone}
                onChange={(event) => (usesLanguage ? setLanguage(event.target.value) : setTone(event.target.value))}
              >
                {usesLanguage
                  ? LANGUAGES.map((name) => <option key={name} value={name}>{name}</option>)
                  : [...(mode === "TONE_CHANGE" ? [] : ["Auto"]), ...TONES].map((name) => <option key={name} value={name}>{name === "Auto" ? "Tone: automatic" : name}</option>)}
              </select>
            )}

            <Textarea rows={6} value={input} maxLength={MAX_INPUT} onChange={(event) => setInput(event.target.value)} placeholder="Paste or write your text here..." className="resize-y" />
            <div className="flex flex-wrap items-center gap-2">
              {isStreaming ? (
                <Button variant="outline" onClick={stop}><Square className="mr-1.5 h-4 w-4" /> Stop</Button>
              ) : (
                <Button onClick={run} disabled={!input.trim()}><Sparkles className="mr-1.5 h-4 w-4" /> Generate</Button>
              )}
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">{input.length.toLocaleString()} / {MAX_INPUT.toLocaleString()}</span>
            </div>
            {error && !error.includes("free uses") && <p className="text-xs text-destructive">{error}</p>}
          </Section>

          {(output || isStreaming) && (
            <Section title="Result" icon={PenTool} action={<span className="text-xs text-muted-foreground">{words} words</span>}>
              <div className="min-h-[6rem] whitespace-pre-wrap break-words rounded-lg border bg-card/60 p-4 text-sm">
                {output}
                {isStreaming && <Loader2 className="ml-1 inline h-3.5 w-3.5 animate-spin align-middle text-primary" />}
              </div>
              {!isStreaming && output && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                    {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSaveOpen(true)}><Save className="mr-1.5 h-3.5 w-3.5" /> Save</Button>
                  <Button size="sm" variant="outline" onClick={() => { setInput(output.slice(0, MAX_INPUT)); reset(); }}>Use as input</Button>
                  <Button size="sm" variant="outline" onClick={run}>Try again</Button>
                </div>
              )}
            </Section>
          )}
        </div>

        <Section title="History" icon={FileText}>
          {notice && <p className="text-xs text-emerald-600">{notice}</p>}
          {documents.length === 0 ? (
            <EmptyState icon={FileText} title="Nothing saved yet" body="Save a result to find it here." />
          ) : (
            <div className="max-h-[32rem] space-y-2 overflow-y-auto">
              {documents.map((doc: any) => (
                <div key={doc.id} className="space-y-1 rounded-lg border p-3">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  <p className="text-[11px] text-muted-foreground">{String(doc.mode).replace("_", " ").toLowerCase()} · {new Date(doc.createdAt).toLocaleDateString()}</p>
                  <div className="flex gap-1 pt-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setMode(doc.mode); setInput(doc.input); setOutput(doc.output); }}>Open</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={toNote.isPending} onClick={() => toNote.mutate(doc.id, { onSuccess: () => setNotice("Added to Notes"), onError: () => setNotice("Couldn't add to Notes") })}>To Notes</Button>
                    <Button size="icon" variant="ghost" className="ml-auto h-7 w-7 text-destructive hover:text-destructive" aria-label="Delete" onClick={() => window.confirm(`Delete "${doc.title}"?`) && deleteDoc.mutate(doc.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Save to history</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <Input placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={150} autoFocus />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saveDoc.isPending}>{saveDoc.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PaywallDialog open={paywall} onOpenChange={setPaywall} toolName="AI Writing" />
    </div>
  );
}