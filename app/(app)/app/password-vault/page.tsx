"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Banknote, Check, Copy, CreditCard, ExternalLink, Eye, EyeOff, Globe, KeyRound, Loader2, Lock, Pencil, Plus, RefreshCw, Search, ShieldCheck, Smartphone, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader, ProgressBar, Section, StatCard } from "@/components/app/kit";
import { useCreateVaultItem, useDeleteVaultItem, useRevealVaultItem, useUpdateVaultItem, useVaultDashboard } from "@/lib/hooks/use-vault";
import { generatePassword, scorePasswordStrength, strengthLabelOf } from "@/lib/password-strength";
import { cn } from "@/lib/utils";
import type { VaultCategory, VaultItem, VaultSecrets } from "@/types/vault";

const CATEGORIES: { key: VaultCategory; label: string; icon: typeof Globe }[] = [
  { key: "WEBSITE", label: "Website", icon: Globe },
  { key: "APP", label: "App", icon: Smartphone },
  { key: "BANK", label: "Bank", icon: Banknote },
  { key: "CARD", label: "Card", icon: CreditCard },
  { key: "NOTE", label: "Secure note", icon: Lock },
];
const CATEGORY = Object.fromEntries(CATEGORIES.map((item) => [item.key, item])) as Record<VaultCategory, (typeof CATEGORIES)[number]>;

const STRENGTH = {
  weak: { bar: "bg-destructive", text: "text-destructive", label: "Weak" },
  medium: { bar: "bg-amber-500", text: "text-amber-600", label: "Fair" },
  strong: { bar: "bg-emerald-500", text: "text-emerald-600", label: "Strong" },
};

type Filter = "all" | "weak" | "reused" | "old" | "favorites";
const HIDE_AFTER_MS = 15_000;

function StrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const score = scorePasswordStrength(password);
  const style = STRENGTH[strengthLabelOf(score)];
  const tips: string[] = [];
  if (password.length < 12) tips.push("use at least 12 characters");
  if (!/[^A-Za-z0-9]/.test(password)) tips.push("add a symbol");
  if (!/\d/.test(password)) tips.push("add a number");

  return (
    <div className="space-y-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full transition-all", style.bar)} style={{ width: `${Math.max(score, 6)}%` }} /></div>
      <p className="text-xs"><span className={cn("font-medium", style.text)}>{style.label}</span>{score < 70 && tips.length > 0 ? <span className="text-muted-foreground"> · {tips.slice(0, 2).join(", ")}</span> : null}</p>
    </div>
  );
}

function ItemDialog({ editing, onClose }: { editing: { item: VaultItem; notes: string | null } | null; onClose: () => void }) {
  const create = useCreateVaultItem();
  const update = useUpdateVaultItem();
  const item = editing?.item;
  const [form, setForm] = useState({
    label: item?.label ?? "",
    category: item?.category ?? ("WEBSITE" as VaultCategory),
    username: item?.username ?? "",
    password: "",
    url: item?.url ?? "",
    tags: item?.tags.join(", ") ?? "",
    notes: editing?.notes ?? "",
    favorite: item?.favorite ?? false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [length, setLength] = useState(20);
  const [symbols, setSymbols] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    let url = form.url.trim();
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    const tags = form.tags.split(",").map((tag) => tag.trim()).filter(Boolean);

    try {
      if (item) {
        await update.mutateAsync({
          id: item.id,
          data: {
            label: form.label.trim(),
            category: form.category,
            username: form.username.trim() || null,
            url: url || null,
            notes: form.notes.trim() || null,
            tags,
            favorite: form.favorite,
            ...(form.password ? { password: form.password } : {}),
          },
        });
      } else {
        await create.mutateAsync({
          label: form.label.trim(),
          category: form.category,
          tags,
          favorite: form.favorite,
          ...(form.username.trim() ? { username: form.username.trim() } : {}),
          ...(form.password ? { password: form.password } : {}),
          ...(url ? { url } : {}),
          ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        });
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? "Edit item" : "Add to vault"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 pt-1">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(({ key, label, icon: Icon }) => (
              <button key={key} type="button" onClick={() => set("category", key)} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", form.category === key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="space-y-1"><Label>Name</Label><Input value={form.label} onChange={(event) => set("label", event.target.value)} placeholder="e.g. Gmail, GTBank" maxLength={100} required autoFocus /></div>
          <div className="space-y-1"><Label>Username or email</Label><Input value={form.username} onChange={(event) => set("username", event.target.value)} maxLength={255} autoComplete="off" /></div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{item ? "New password (leave blank to keep)" : "Password"}</Label>
              <button type="button" className="flex items-center gap-1 text-xs text-primary hover:underline" onClick={() => { set("password", generatePassword(length, symbols)); setShowPassword(true); }}>
                <RefreshCw className="h-3 w-3" /> Generate
              </button>
            </div>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => set("password", event.target.value)} autoComplete="new-password" maxLength={255} className="pr-10 font-mono" />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <StrengthMeter password={form.password} />
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Length {length}</span>
              <input type="range" min={12} max={40} value={length} onChange={(event) => setLength(Number(event.target.value))} className="w-28 accent-primary" />
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={symbols} onChange={(event) => setSymbols(event.target.checked)} /> Symbols</label>
            </div>
          </div>

          <div className="space-y-1"><Label>Website (optional)</Label><Input value={form.url} onChange={(event) => set("url", event.target.value)} placeholder="example.com" /></div>
          <div className="space-y-1">
            <Label>Notes (encrypted)</Label>
            <Textarea rows={3} value={form.notes} onChange={(event) => set("notes", event.target.value)} maxLength={5000} placeholder={form.category === "CARD" ? "Card number, expiry, PIN..." : "Security answers, recovery codes..."} />
          </div>
          <div className="space-y-1"><Label>Tags</Label><Input value={form.tags} onChange={(event) => set("tags", event.target.value)} placeholder="work, family" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.favorite} onChange={(event) => set("favorite", event.target.checked)} /> Favourite</label>

          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending || !form.label.trim()}>{pending ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PasswordVaultPage() {
  const { data, isLoading, isError, refetch } = useVaultDashboard();
  const reveal = useRevealVaultItem();
  const update = useUpdateVaultItem();
  const remove = useDeleteVaultItem();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<VaultCategory | "all">("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ id: number; editing: { item: VaultItem; notes: string | null } | null } | null>(null);
  const [secrets, setSecrets] = useState<Record<string, VaultSecrets>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clearAll = () => {
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
      setSecrets({});
    };
    const onVisibility = () => document.hidden && clearAll();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  const items = data?.items;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (items ?? []).filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (filter === "weak" && !(item.hasPassword && item.strengthLabel === "weak")) return false;
      if (filter === "reused" && !item.reused) return false;
      if (filter === "old" && !item.old) return false;
      if (filter === "favorites" && !item.favorite) return false;
      return !needle || item.label.toLowerCase().includes(needle) || (item.username ?? "").toLowerCase().includes(needle) || (item.url ?? "").toLowerCase().includes(needle) || item.tags.some((tag) => tag.toLowerCase().includes(needle));
    });
  }, [items, query, category, filter]);

  const selected = (items ?? []).find((item) => item.id === selectedId) ?? null;
  const secret = selected ? secrets[selected.id] : undefined;

  function hideSecret(id: string) {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setSecrets((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function showSecret(id: string) {
    setNotice(null);
    setBusyId(id);
    try {
      const detail = await reveal.mutateAsync(id);
      setSecrets((current) => ({ ...current, [id]: detail }));
      clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(() => hideSecret(id), HIDE_AFTER_MS);
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function copy(key: string, read: () => Promise<string | null>) {
    setNotice(null);
    try {
      const value = await read();
      if (!value) return;
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
    } catch (err) {
      setNotice((err as Error).message || "Couldn't copy.");
    }
  }

  async function openEdit(item: VaultItem) {
    setNotice(null);
    if (!item.hasNotes) return setDialog({ id: Date.now(), editing: { item, notes: null } });
    setBusyId(item.id);
    try {
      const detail = await reveal.mutateAsync(item.id);
      setDialog({ id: Date.now(), editing: { item, notes: detail.notes } });
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  function select(id: string) {
    setSelectedId(id);
    setNotice(null);
    if (window.innerWidth < 1024) setTimeout(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  if (isError && !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-destructive">Couldn't load your vault.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const { stats } = data;
  const chip = (active: boolean) => cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium", active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted");
  const pick = (next: Filter) => setFilter((current) => (current === next ? "all" : next));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={KeyRound}
        title="Password Vault"
        subtitle="Logins, cards and secure notes, encrypted at rest."
        actions={<Button onClick={() => setDialog({ id: Date.now(), editing: null })}><Plus className="mr-1.5 h-4 w-4" /> Add item</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <button type="button" className="text-left" onClick={() => setFilter("all")}><StatCard icon={KeyRound} label="Items" value={stats.totalItems} hint={`${stats.withPassword} with a password`} /></button>
        <button type="button" className="text-left" onClick={() => pick("weak")}><StatCard icon={ShieldCheck} label="Weak" value={stats.weakCount} tone={stats.weakCount > 0 ? "danger" : "success"} hint={filter === "weak" ? "Showing these" : "Tap to filter"} /></button>
        <button type="button" className="text-left" onClick={() => pick("reused")}><StatCard icon={RefreshCw} label="Reused" value={stats.reusedCount} tone={stats.reusedCount > 0 ? "warning" : "success"} hint={filter === "reused" ? "Showing these" : "Tap to filter"} /></button>
        <button type="button" className="text-left" onClick={() => pick("old")}><StatCard icon={AlertTriangle} label="Older than 6 months" value={stats.oldPasswords} tone={stats.oldPasswords > 0 ? "warning" : "success"} hint={filter === "old" ? "Showing these" : "Tap to filter"} /></button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Vault health" icon={ShieldCheck} className="lg:col-span-1">
          {stats.healthScore === null ? (
            <p className="text-sm text-muted-foreground">Add a login with a password to see your health score.</p>
          ) : (
            <>
              <p className="text-3xl font-bold tabular-nums">{stats.healthScore}%</p>
              <ProgressBar value={stats.healthScore} tone={stats.healthScore >= 80 ? "success" : stats.healthScore >= 50 ? "warning" : "danger"} />
              <p className="text-sm text-muted-foreground">{data.insight}</p>
            </>
          )}
        </Section>

        <div className="space-y-3 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, username, site or tag" className="h-9 pl-9" />
            </div>
            <button type="button" className={chip(filter === "favorites")} onClick={() => pick("favorites")}><Star className="mr-1 inline h-3 w-3" /> Favourites</button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button type="button" className={chip(category === "all")} onClick={() => setCategory("all")}>All</button>
            {CATEGORIES.map((item) => <button key={item.key} type="button" className={chip(category === item.key)} onClick={() => setCategory(item.key)}>{item.label}</button>)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={selected ? "lg:col-span-2" : "lg:col-span-3"}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title={data.items.length === 0 ? "Your vault is empty" : "Nothing matches"}
              body={data.items.length === 0 ? "Save a login, card or secure note. Everything is encrypted." : "Try another search or clear the filters."}
              action={data.items.length === 0 ? <Button size="sm" onClick={() => setDialog({ id: Date.now(), editing: null })}>Add your first item</Button> : undefined}
            />
          ) : (
            <div className={cn("grid gap-3 sm:grid-cols-2", !selected && "lg:grid-cols-3")}>
              {filtered.map((item) => {
                const Icon = CATEGORY[item.category].icon;
                const strength = item.strengthLabel ? STRENGTH[item.strengthLabel] : null;
                return (
                  <div key={item.id} role="button" tabIndex={0} onClick={() => select(item.id)} onKeyDown={(event) => event.key === "Enter" && select(item.id)} className={cn("space-y-2 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40", selectedId === item.id && "border-primary ring-1 ring-primary/40")}>
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5"><span className="truncate text-sm font-medium">{item.label}</span>{item.favorite && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}</span>
                        <span className="block truncate text-xs text-muted-foreground">{item.username ?? CATEGORY[item.category].label}</span>
                      </span>
                      {item.username && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Copy username" onClick={(event) => { event.stopPropagation(); void copy(`${item.id}:user`, async () => item.username); }}>
                          {copied === `${item.id}:user` ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      {strength && <span className={cn("rounded-full border px-2 py-0.5 font-medium", strength.text)}>{strength.label}</span>}
                      {item.reused && <span className="rounded-full border border-amber-500/40 px-2 py-0.5 font-medium text-amber-600">Reused</span>}
                      {item.old && <span className="rounded-full border px-2 py-0.5 text-muted-foreground">Old</span>}
                      {item.hasPassword && (
                        <button type="button" className="ml-auto flex items-center gap-1 text-primary hover:underline" onClick={(event) => { event.stopPropagation(); void copy(`${item.id}:pw`, async () => (await reveal.mutateAsync(item.id)).password); }}>
                          {copied === `${item.id}:pw` ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Password</>}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selected && (
          <div ref={panel} className="lg:col-span-1">
            <Section title={selected.label} icon={CATEGORY[selected.category].icon} action={<Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Close details" onClick={() => setSelectedId(null)}><X className="h-4 w-4" /></Button>}>
              {selected.username && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Username</p>
                  <div className="flex items-center gap-2"><p className="min-w-0 flex-1 truncate text-sm">{selected.username}</p><Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Copy username" onClick={() => copy(`${selected.id}:user`, async () => selected.username)}>{copied === `${selected.id}:user` ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}</Button></div>
                </div>
              )}

              {selected.hasPassword && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Password</p>
                  <div className="flex items-center gap-1.5">
                    <p className="min-w-0 flex-1 break-all rounded-md bg-muted/50 px-2.5 py-1.5 font-mono text-sm">{secret?.password ?? "••••••••••••"}</p>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label={secret ? "Hide password" : "Reveal password"} disabled={busyId === selected.id} onClick={() => (secret ? hideSecret(selected.id) : showSecret(selected.id))}>
                      {busyId === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Copy password" onClick={() => copy(`${selected.id}:pw`, async () => secret?.password ?? (await reveal.mutateAsync(selected.id)).password)}>
                      {copied === `${selected.id}:pw` ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  {secret && <p className="text-[11px] text-muted-foreground">Hides in 15 seconds or when you leave this tab.</p>}
                  {selected.strengthLabel && (
                    <div className="space-y-1 pt-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", STRENGTH[selected.strengthLabel].bar)} style={{ width: `${Math.max(selected.strength, 6)}%` }} /></div>
                      <p className="text-xs"><span className={cn("font-medium", STRENGTH[selected.strengthLabel].text)}>{STRENGTH[selected.strengthLabel].label}</span>{selected.reused ? <span className="text-amber-600"> · reused elsewhere</span> : null}{selected.old ? <span className="text-muted-foreground"> · over 6 months old</span> : null}</p>
                    </div>
                  )}
                </div>
              )}

              {selected.hasNotes && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  {secret ? <p className="whitespace-pre-wrap break-words rounded-md bg-muted/50 px-2.5 py-1.5 text-sm">{secret.notes ?? ""}</p> : (
                    <button type="button" className="text-xs text-primary hover:underline" disabled={busyId === selected.id} onClick={() => showSecret(selected.id)}>Reveal notes</button>
                  )}
                </div>
              )}

              {selected.url && <a href={selected.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 truncate text-sm text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{selected.url.replace(/^https?:\/\//, "")}</span></a>}
              {selected.tags.length > 0 && <div className="flex flex-wrap gap-1">{selected.tags.map((tag) => <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{tag}</span>)}</div>}
              <p className="text-xs text-muted-foreground">{selected.hasPassword ? `Password changed ${new Date(selected.lastChangedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}` : `Added ${new Date(selected.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}`}</p>
              {notice && <p className="text-xs text-destructive">{notice}</p>}

              <div className="flex flex-wrap gap-2 border-t pt-3">
                <Button size="sm" variant="outline" disabled={busyId === selected.id} onClick={() => openEdit(selected)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ id: selected.id, data: { favorite: !selected.favorite } })}><Star className={cn("mr-1.5 h-3.5 w-3.5", selected.favorite && "fill-amber-400 text-amber-400")} /> {selected.favorite ? "Unfavourite" : "Favourite"}</Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={remove.isPending} onClick={() => window.confirm(`Delete "${selected.label}"? This can't be undone.`) && remove.mutate(selected.id, { onSuccess: () => { hideSecret(selected.id); setSelectedId(null); } })}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete</Button>
              </div>
            </Section>
          </div>
        )}
      </div>

      {notice && !selected && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{notice}</p>}
      <p className="text-center text-xs text-muted-foreground">Passwords and notes are encrypted before they're stored. For your most critical secrets, such as bank PINs or a master password, also consider a dedicated password manager.</p>

      {dialog && <ItemDialog key={dialog.id} editing={dialog.editing} onClose={() => setDialog(null)} />}
    </div>
  );
}