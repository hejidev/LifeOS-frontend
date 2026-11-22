"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, RefreshCw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Section } from "@/components/app/kit";
import { saveTextAs } from "@/lib/download";
import { generatePassword, scorePasswordStrength, strengthLabelOf } from "@/lib/password-strength";
import { cn } from "@/lib/utils";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={!text}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />} {copied ? "Copied" : label}
    </Button>
  );
}

const mono = "break-all rounded-lg border bg-muted/40 px-3 py-2 font-mono text-sm";
const selectClass = "h-10 rounded-lg border bg-background px-3 text-sm";

export function PasswordTool() {
  const [length, setLength] = useState(20);
  const [symbols, setSymbols] = useState(true);
  const [password, setPassword] = useState("");

  useEffect(() => setPassword(generatePassword(length, symbols)), [length, symbols]);

  const score = scorePasswordStrength(password);
  const label = strengthLabelOf(score);
  const bar = label === "strong" ? "bg-emerald-500" : label === "medium" ? "bg-amber-500" : "bg-destructive";

  return (
    <Section title="Password generator">
      <p className={mono}>{password}</p>
      <div className="space-y-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", bar)} style={{ width: `${Math.max(score, 6)}%` }} /></div>
        <p className="text-xs capitalize text-muted-foreground">{label} password</p>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="tabular-nums">Length {length}</span>
        <input type="range" min={8} max={64} value={length} onChange={(event) => setLength(Number(event.target.value))} className="w-48 accent-primary" />
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={symbols} onChange={(event) => setSymbols(event.target.checked)} /> Symbols</label>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => setPassword(generatePassword(length, symbols))}><RefreshCw className="mr-1.5 h-4 w-4" /> Generate</Button>
        <CopyButton text={password} />
      </div>
      <p className="text-xs text-muted-foreground">Generated in your browser. Nothing is sent or stored.</p>
    </Section>
  );
}

const ALGORITHMS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];

async function digestHex(data: BufferSource, algorithm: string) {
  if (!window.crypto?.subtle) throw new Error("Hashing needs a secure (https) connection.");
  const buffer = await window.crypto.subtle.digest(algorithm, data);
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function HashTool() {
  const [algorithm, setAlgorithm] = useState("SHA-256");
  const [mode, setMode] = useState<"text" | "file">("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expected, setExpected] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError(null);

    const run = async () => {
      if (mode === "text") return text ? digestHex(new TextEncoder().encode(text), algorithm) : "";
      if (!file) return "";
      return digestHex(await file.arrayBuffer(), algorithm);
    };

    run()
      .then((value) => !cancelled && setHash(value))
      .catch((err: Error) => {
        if (!cancelled) {
          setHash("");
          setError(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [algorithm, mode, text, file]);

  const target = expected.trim().toLowerCase();
  const match = hash && target ? hash === target : null;

  return (
    <Section title="Hash generator">
      <div className="flex flex-wrap items-center gap-2">
        <select className={selectClass} value={algorithm} onChange={(event) => setAlgorithm(event.target.value)}>{ALGORITHMS.map((name) => <option key={name} value={name}>{name}</option>)}</select>
        {(["text", "file"] as const).map((key) => (
          <button key={key} type="button" onClick={() => setMode(key)} className={cn("rounded-full border px-3 py-1 text-xs font-medium capitalize", mode === key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>{key}</button>
        ))}
      </div>

      {mode === "text" ? (
        <Textarea rows={4} value={text} onChange={(event) => setText(event.target.value)} placeholder="Text to hash" />
      ) : (
        <div className="space-y-1">
          <Input type="file" onChange={(event) => { const picked = event.target.files?.[0] ?? null; setFile(picked && picked.size > 50 * 1024 * 1024 ? null : picked); if (picked && picked.size > 50 * 1024 * 1024) setError("Files over 50 MB aren't supported here."); }} />
          {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      {hash && (
        <div className="space-y-2">
          <p className={mono}>{hash}</p>
          <CopyButton text={hash} />
          <div className="space-y-1 pt-2">
            <Label>Compare with an expected hash</Label>
            <Input value={expected} onChange={(event) => setExpected(event.target.value)} placeholder="Paste the hash you were given" className="font-mono text-xs" />
            {match !== null && <p className={cn("text-xs font-medium", match ? "text-emerald-600" : "text-destructive")}>{match ? "Match. The values are identical." : "No match. Don't trust this file or text."}</p>}
          </div>
        </div>
      )}
    </Section>
  );
}

function uuidv4() {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function UuidTool() {
  const [count, setCount] = useState(1);
  const [plain, setPlain] = useState(false);
  const [upper, setUpper] = useState(false);
  const [values, setValues] = useState<string[]>([]);

  const generate = () => setValues(Array.from({ length: count }, uuidv4));
  useEffect(generate, [count]);

  const text = values.map((value) => (plain ? value.replace(/-/g, "") : value)).map((value) => (upper ? value.toUpperCase() : value)).join("\n");

  return (
    <Section title="UUID generator">
      <pre className={cn(mono, "whitespace-pre-wrap")}>{text}</pre>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">How many <Input type="number" min={1} max={20} value={count} onChange={(event) => setCount(Math.min(20, Math.max(1, Number(event.target.value) || 1)))} className="h-9 w-20" /></label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={plain} onChange={(event) => setPlain(event.target.checked)} /> No hyphens</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={upper} onChange={(event) => setUpper(event.target.checked)} /> Uppercase</label>
      </div>
      <div className="flex gap-2">
        <Button onClick={generate}><RefreshCw className="mr-1.5 h-4 w-4" /> Generate</Button>
        <CopyButton text={text} label={count > 1 ? "Copy all" : "Copy"} />
      </div>
    </Section>
  );
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, inner]) => [key, sortKeys(inner)]));
  return value;
}

export function JsonTool() {
  const [input, setInput] = useState("");
  const [indent, setIndent] = useState("2");
  const [sorted, setSorted] = useState(false);
  const [output, setOutput] = useState("");

  const parsed = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return { ok: true as const, value: JSON.parse(input) as unknown };
    } catch (err) {
      return { ok: false as const, message: (err as Error).message };
    }
  }, [input]);

  function render(minify: boolean) {
    if (!parsed?.ok) return;
    const value = sorted ? sortKeys(parsed.value) : parsed.value;
    setOutput(minify ? JSON.stringify(value) : JSON.stringify(value, null, indent === "tab" ? "\t" : Number(indent)));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="JSON input">
        <Textarea rows={14} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Paste JSON here" className="font-mono text-xs" />
        {parsed && <p className={cn("text-xs", parsed.ok ? "text-emerald-600" : "text-destructive")}>{parsed.ok ? "Valid JSON" : parsed.message}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <select className={selectClass} value={indent} onChange={(event) => setIndent(event.target.value)}><option value="2">2 spaces</option><option value="4">4 spaces</option><option value="tab">Tab</option></select>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={sorted} onChange={(event) => setSorted(event.target.checked)} /> Sort keys</label>
          <Button size="sm" disabled={!parsed?.ok} onClick={() => render(false)}>Format</Button>
          <Button size="sm" variant="outline" disabled={!parsed?.ok} onClick={() => render(true)}>Minify</Button>
        </div>
      </Section>
      <Section title="Result" action={output ? <div className="flex gap-2"><CopyButton text={output} /><Button size="sm" variant="outline" onClick={() => saveTextAs(output, "data.json", "application/json")}><Download className="mr-1.5 h-3.5 w-3.5" /> Save</Button></div> : undefined}>
        <pre className="min-h-[18rem] overflow-auto whitespace-pre-wrap rounded-lg border bg-card/60 p-3 font-mono text-xs">{output || "The result appears here."}</pre>
        {output && <p className="text-xs text-muted-foreground">{new Blob([output]).size.toLocaleString()} bytes</p>}
      </Section>
    </div>
  );
}

function encodeBase64(input: string, urlSafe: boolean) {
  let binary = "";
  new TextEncoder().encode(input).forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  const encoded = window.btoa(binary);
  return urlSafe ? encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : encoded;
}

function decodeBase64(input: string) {
  const cleaned = input.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = cleaned + "=".repeat((4 - (cleaned.length % 4)) % 4);
  const binary = window.atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function Base64Tool() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [urlSafe, setUrlSafe] = useState(false);
  const [input, setInput] = useState("");

  const { output, error } = useMemo(() => {
    if (!input) return { output: "", error: null };
    try {
      return { output: mode === "encode" ? encodeBase64(input, urlSafe) : decodeBase64(input), error: null };
    } catch {
      return { output: "", error: "That isn't valid Base64 text." };
    }
  }, [input, mode, urlSafe]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Input">
        <div className="flex flex-wrap items-center gap-2">
          {(["encode", "decode"] as const).map((key) => <button key={key} type="button" onClick={() => setMode(key)} className={cn("rounded-full border px-3 py-1 text-xs font-medium capitalize", mode === key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>{key}</button>)}
          {mode === "encode" && <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={urlSafe} onChange={(event) => setUrlSafe(event.target.checked)} /> URL-safe</label>}
        </div>
        <Textarea rows={10} value={input} onChange={(event) => setInput(event.target.value)} className="font-mono text-xs" placeholder={mode === "encode" ? "Text to encode" : "Base64 to decode"} />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </Section>
      <Section title="Result" action={<CopyButton text={output} />}>
        <pre className="min-h-[14rem] overflow-auto whitespace-pre-wrap break-all rounded-lg border bg-card/60 p-3 font-mono text-xs">{output || "The result appears here."}</pre>
      </Section>
    </div>
  );
}

const TRANSFORMS: { key: string; label: string; run: (value: string) => string }[] = [
  { key: "upper", label: "UPPERCASE", run: (value) => value.toUpperCase() },
  { key: "lower", label: "lowercase", run: (value) => value.toLowerCase() },
  { key: "title", label: "Title Case", run: (value) => value.toLowerCase().replace(/(^|[\s\-(])(\p{L})/gu, (_match, lead: string, letter: string) => lead + letter.toUpperCase()) },
  { key: "sentence", label: "Sentence case", run: (value) => value.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (_match, lead: string, letter: string) => lead + letter.toUpperCase()) },
  { key: "slug", label: "slug-case", run: (value) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") },
  { key: "tidy", label: "Tidy spaces", run: (value) => value.split("\n").map((line) => line.replace(/[ \t]+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim() },
  { key: "sort", label: "Sort lines", run: (value) => value.split("\n").sort((a, b) => a.localeCompare(b)).join("\n") },
  { key: "unique", label: "Remove duplicate lines", run: (value) => [...new Set(value.split("\n"))].join("\n") },
];

export function TextTool() {
  const [text, setText] = useState("");
  const [previous, setPrevious] = useState<string | null>(null);

  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return {
      characters: text.length,
      noSpaces: text.replace(/\s/g, "").length,
      words,
      sentences: text.split(/[.!?]+/).filter((part) => part.trim()).length,
      lines: text ? text.split("\n").length : 0,
      minutes: Math.max(words ? 1 : 0, Math.round(words / 200)),
    };
  }, [text]);

  return (
    <Section title="Text tools">
      <Textarea rows={10} value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste or type text" />
      <div className="flex flex-wrap gap-2">
        {TRANSFORMS.map((item) => <Button key={item.key} size="sm" variant="outline" disabled={!text} onClick={() => { setPrevious(text); setText(item.run(text)); }}>{item.label}</Button>)}
        <Button size="sm" variant="ghost" disabled={previous === null} onClick={() => { if (previous !== null) { setText(previous); setPrevious(null); } }}><Undo2 className="mr-1.5 h-3.5 w-3.5" /> Undo</Button>
        <CopyButton text={text} />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[["Characters", stats.characters], ["No spaces", stats.noSpaces], ["Words", stats.words], ["Sentences", stats.sentences], ["Lines", stats.lines], ["Read time", `${stats.minutes} min`]].map(([label, value]) => (
          <div key={label} className="rounded-lg border p-2 text-center"><p className="text-sm font-semibold tabular-nums">{value}</p><p className="text-[10px] text-muted-foreground">{label}</p></div>
        ))}
      </div>
    </Section>
  );
}

type Rgb = { r: number; g: number; b: number };

function parseHex(value: string) {
  const hex = value.trim().replace(/^#/, "");
  const full = /^[0-9a-f]{3}$/i.test(hex) ? hex.split("").map((char) => char + char).join("") : hex;
  return /^[0-9a-f]{6}$/i.test(full) ? `#${full.toLowerCase()}` : null;
}

const toRgb = (hex: string): Rgb => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) });
const toHex = ({ r, g, b }: Rgb) => `#${[r, g, b].map((channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, "0")).join("")}`;
const mix = (from: Rgb, to: Rgb, amount: number): Rgb => ({ r: from.r + (to.r - from.r) * amount, g: from.g + (to.g - from.g) * amount, b: from.b + (to.b - from.b) * amount });

function toHsl({ r, g, b }: Rgb) {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;
  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue /= 6;
  }
  return { h: Math.round(hue * 360), s: Math.round(saturation * 100), l: Math.round(lightness * 100) };
}

function luminance({ r, g, b }: Rgb) {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

const contrast = (a: Rgb, b: Rgb) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

export function ColorTool() {
  const [hex, setHex] = useState("#6366f1");
  const [text, setText] = useState("#6366f1");

  const rgb = toRgb(hex);
  const hsl = toHsl(rgb);
  const white = contrast(rgb, { r: 255, g: 255, b: 255 });
  const black = contrast(rgb, { r: 0, g: 0, b: 0 });
  const shades = [0.8, 0.6, 0.4, 0.2].map((amount) => toHex(mix(rgb, { r: 255, g: 255, b: 255 }, amount))).concat([hex], [0.2, 0.4, 0.6, 0.8].map((amount) => toHex(mix(rgb, { r: 0, g: 0, b: 0 }, amount))));

  function choose(value: string) {
    const parsed = parseHex(value);
    if (parsed) {
      setHex(parsed);
      setText(parsed);
    }
  }

  const grade = (ratio: number) => (ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "Large text only" : "Fails");
  const formats = [`${hex}`, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Color">
        <div className="flex items-center gap-3">
          <input type="color" value={hex} onChange={(event) => choose(event.target.value)} className="h-14 w-14 cursor-pointer rounded-lg border bg-transparent" aria-label="Pick a colour" />
          <Input value={text} onChange={(event) => { setText(event.target.value); const parsed = parseHex(event.target.value); if (parsed) setHex(parsed); }} className={cn("w-36 font-mono", !parseHex(text) && "border-destructive")} />
        </div>
        <div className="space-y-2">
          {formats.map((value) => <div key={value} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"><code className="text-sm">{value}</code><CopyButton text={value} /></div>)}
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Shades</p>
          <div className="flex overflow-hidden rounded-lg border">
            {shades.map((shade) => <button key={shade} type="button" title={shade} onClick={() => choose(shade)} className={cn("h-10 flex-1", shade === hex && "ring-2 ring-inset ring-foreground")} style={{ backgroundColor: shade }} />)}
          </div>
        </div>
      </Section>

      <Section title="Contrast and accessibility">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 rounded-lg p-4 text-center" style={{ backgroundColor: hex, color: "#ffffff" }}><p className="text-2xl font-bold">Aa</p><p className="text-xs">White text · {white.toFixed(2)}:1</p><p className="text-xs font-medium">{grade(white)}</p></div>
          <div className="space-y-1 rounded-lg p-4 text-center" style={{ backgroundColor: hex, color: "#000000" }}><p className="text-2xl font-bold">Aa</p><p className="text-xs">Black text · {black.toFixed(2)}:1</p><p className="text-xs font-medium">{grade(black)}</p></div>
        </div>
        <p className="text-xs text-muted-foreground">WCAG recommends at least 4.5:1 for body text (AA) and 7:1 for the highest level (AAA).</p>
      </Section>
    </div>
  );
}