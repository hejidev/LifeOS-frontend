"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Section } from "@/components/app/kit";
import { LANGUAGES } from "@/lib/data/languages";
import { useTranslateText } from "@/lib/hooks/use-life-data";
import { cn } from "@/lib/utils";

const MAX = 1000;

interface Entry {
  id: number;
  source: string;
  output: string;
  language: string;
  rtl: boolean;
}

export function TranslateTool() {
  const translate = useTranslateText();
  const [text, setText] = useState("");
  const [language, setLanguage] = useState(() => LANGUAGES.find((item) => item.name === "French")?.name ?? LANGUAGES[0].name);
  const [result, setResult] = useState<Entry | null>(null);
  const [history, setHistory] = useState<Entry[]>([]);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [showDirectory, setShowDirectory] = useState(false);

  const continents = useMemo(() => [...new Set(LANGUAGES.map((item) => item.continent))], []);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return LANGUAGES.filter((item) => !needle || item.name.toLowerCase().includes(needle) || item.native.toLowerCase().includes(needle));
  }, [search]);

  function run() {
    const source = text.trim();
    if (!source || translate.isPending) return;
    const meta = LANGUAGES.find((item) => item.name === language);
    translate.mutate(
      { text: source, targetLanguage: language },
      {
        onSuccess: (output) => {
          const entry: Entry = { id: Date.now(), source, output, language, rtl: !!meta?.rtl };
          setResult(entry);
          setHistory((current) => [entry, ...current].slice(0, 5));
        },
      }
    );
  }

  const select = "flex h-10 w-full rounded-lg border bg-background px-3 text-sm";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Text to translate" icon={Languages}>
          <Textarea rows={8} value={text} maxLength={MAX} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => (event.ctrlKey || event.metaKey) && event.key === "Enter" && run()} placeholder="Type or paste text. The language is detected automatically." />
          <div className="flex flex-wrap items-center gap-2">
            <select className={cn(select, "w-56")} value={language} onChange={(event) => setLanguage(event.target.value)}>
              {continents.map((continent) => (
                <optgroup key={continent} label={continent}>
                  {LANGUAGES.filter((item) => item.continent === continent).map((item) => <option key={item.name} value={item.name}>{item.name} · {item.native}</option>)}
                </optgroup>
              ))}
            </select>
            <Button onClick={run} disabled={translate.isPending || !text.trim()}>{translate.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Translating...</> : "Translate"}</Button>
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">{text.length} / {MAX}</span>
          </div>
          {translate.isError && <p className="text-xs text-destructive">{(translate.error as Error).message}</p>}
        </Section>

        <Section title={result ? `Translation · ${result.language}` : "Translation"} action={result ? <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(result.output); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}</Button> : undefined}>
          <div dir={result?.rtl ? "rtl" : "ltr"} className="min-h-[12rem] whitespace-pre-wrap break-words rounded-lg border bg-card/60 p-4 text-sm">
            {result?.output ?? <span className="text-muted-foreground">The translation appears here.</span>}
          </div>
          <p className="text-[11px] text-muted-foreground">AI translation can miss nuance. Check anything important with a fluent speaker.</p>
        </Section>
      </div>

      {history.length > 1 && (
        <Section title="This session">
          <div className="space-y-2">
            {history.slice(1).map((entry) => (
              <button key={entry.id} type="button" onClick={() => { setText(entry.source); setLanguage(entry.language); setResult(entry); }} className="w-full rounded-lg border p-3 text-left hover:border-primary/40">
                <p className="truncate text-sm">{entry.source}</p>
                <p className="truncate text-xs text-muted-foreground">{entry.language}: {entry.output}</p>
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title="Language directory" action={<Button size="sm" variant="ghost" onClick={() => setShowDirectory((value) => !value)}>{showDirectory ? "Hide" : "Browse"}</Button>}>
        {showDirectory && (
          <div className="space-y-4">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search languages" className="h-9" />
            {continents.map((continent) => {
              const list = filtered.filter((item) => item.continent === continent);
              if (list.length === 0) return null;
              return (
                <div key={continent} className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">{continent}</p>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
                    {list.map((item) => (
                      <button key={item.name} type="button" dir={item.rtl ? "rtl" : "ltr"} onClick={() => setLanguage(item.name)} className={cn("rounded-lg border px-2.5 py-1.5 text-left text-xs hover:border-primary/40", language === item.name && "border-primary bg-primary/5")}>
                        <span className="block font-medium">{item.name}</span>
                        <span className="block text-muted-foreground">{item.native}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}