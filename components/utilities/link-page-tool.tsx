"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Link2, Pencil, Plus, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Section } from "@/components/app/kit";
import { QrPanel } from "@/components/utilities/qr-tool";
import { CopyButton } from "@/components/utilities/local-tools";
import { useCreateSocialProfile, useDeleteSocialProfile, useMySocialProfile, useUpdateSocialProfile } from "@/lib/hooks/use-social-profile";
import type { SocialLinkInput, SocialLinkRow, SocialProfile } from "@/lib/hooks/use-social-profile";
import { getLinkLabel, getPlatformConfig } from "@/lib/social-platforms";

const PLATFORMS = [
  ["instagram", "Instagram"], ["twitter", "X (Twitter)"], ["tiktok", "TikTok"], ["facebook", "Facebook"], ["youtube", "YouTube"],
  ["linkedin", "LinkedIn"], ["snapchat", "Snapchat"], ["pinterest", "Pinterest"], ["threads", "Threads"], ["whatsapp", "WhatsApp"],
  ["telegram", "Telegram"], ["discord", "Discord"], ["twitch", "Twitch"], ["github", "GitHub"], ["spotify", "Spotify"],
  ["reddit", "Reddit"], ["website", "Website"], ["email", "Email"], ["phone", "Phone"], ["other", "Other"],
].map(([value, label]) => ({ value, label }));

const RESERVED = ["admin", "api", "app", "login", "signup", "settings", "connect", "www", "support", "lifeos"];

interface Row {
  key: number;
  platform: string;
  custom: string;
  url: string;
  label: string;
  enabled: boolean;
}

let rowCounter = 0;
const blankRow = (platform = "instagram"): Row => ({ key: ++rowCounter, platform, custom: "", url: "", label: "", enabled: true });

function rowsFrom(links: SocialLinkRow[]): Row[] {
  return links.map((link) => {
    const known = PLATFORMS.some((item) => item.value === link.platform);
    const url = link.platform === "email" ? link.url.replace(/^mailto:/i, "") : link.platform === "phone" ? link.url.replace(/^tel:/i, "") : link.url;
    return { key: ++rowCounter, platform: known ? link.platform : "other", custom: known ? "" : link.platform, url, label: link.label ?? "", enabled: link.enabled };
  });
}

function normalizeUrl(platform: string, raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (platform === "email") {
    const address = value.replace(/^mailto:/i, "");
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? `mailto:${address}` : null;
  }
  if (platform === "phone") {
    const digits = value.replace(/^tel:/i, "").replace(/[^\d+]/g, "");
    return digits.replace(/\D/g, "").length >= 7 ? `tel:${digits}` : null;
  }
  if (platform === "whatsapp" && !/^https?:\/\//i.test(value)) {
    const digits = value.replace(/\D/g, "");
    const international = digits.length === 11 && digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
    return international.length >= 8 ? `https://wa.me/${international}` : null;
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
}

const hintFor = (platform: string) =>
  platform === "email" ? "Enter an email address." : platform === "phone" ? "Enter a phone number." : platform === "whatsapp" ? "Enter a phone number with country code." : "Use a full address such as https://example.com.";

const placeholderFor = (platform: string) =>
  platform === "email" ? "you@example.com" : platform === "phone" ? "+234 801 234 5678" : platform === "whatsapp" ? "0801 234 5678 or a wa.me link" : "https://...";

const publicBase = () => process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;

function Preview({ name, slug, bio, links }: { name: string; slug: string; bio: string; links: { platform: string; label?: string | null }[] }) {
  return (
    <div className="mx-auto w-full max-w-[18rem] space-y-4 rounded-[1.75rem] border bg-background p-5 shadow-sm">
      <div className="space-y-1 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><User className="h-6 w-6" /></span>
        <p className="truncate text-sm font-semibold">{name || "Your name"}</p>
        <p className="text-[11px] text-muted-foreground">@{slug || "username"}</p>
        {bio && <p className="text-xs text-muted-foreground">{bio}</p>}
      </div>
      <div className="space-y-2">
        {links.length === 0 && <p className="text-center text-xs text-muted-foreground">Your links appear here.</p>}
        {links.map((link, index) => {
          const config = getPlatformConfig(link.platform);
          const Icon = config.Icon;
          return (
            <div key={index} className="flex items-center gap-2.5 rounded-xl border px-2.5 py-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: config.iconBg }}><Icon className="h-3.5 w-3.5" style={{ color: config.iconColor }} /></span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{getLinkLabel(link.platform, link.label ?? undefined)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Editor({ profile, onDone }: { profile: SocialProfile | null; onDone: () => void }) {
  const create = useCreateSocialProfile();
  const update = useUpdateSocialProfile();
  const [slug, setSlug] = useState(profile?.slug ?? "");
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [isPublic, setIsPublic] = useState(profile?.isPublic ?? true);
  const [rows, setRows] = useState<Row[]>(() => (profile && profile.links.length > 0 ? rowsFrom(profile.links) : [blankRow()]));
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const patch = (key: number, change: Partial<Row>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)));
  const move = (index: number, direction: -1 | 1) =>
    setRows((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const username = slug.trim().toLowerCase();
    if (!profile) {
      if (!/^[a-z0-9_-]{3,30}$/.test(username)) return setError("Usernames use 3 to 30 letters, numbers, hyphens or underscores.");
      if (RESERVED.includes(username)) return setError("That username isn't available.");
    }

    const filled = rows.filter((row) => row.url.trim());
    if (filled.length === 0) return setError("Add at least one link.");

    const links: SocialLinkInput[] = [];
    for (let index = 0; index < filled.length; index += 1) {
      const row = filled[index];
      const platform = row.platform === "other" ? row.custom.trim().toLowerCase().slice(0, 30) : row.platform;
      if (!platform) return setError(`Name the platform for link ${index + 1}.`);
      const url = normalizeUrl(row.platform, row.url);
      if (!url) return setError(`Link ${index + 1} isn't valid. ${hintFor(row.platform)}`);
      links.push({ platform, url, ...(row.label.trim() ? { label: row.label.trim() } : {}), enabled: row.enabled, sortOrder: index });
    }

    const body = {
      displayName: displayName.trim(),
      bio: bio.trim(),
      isPublic,
      links,
      ...(profile?.avatar && /^https?:\/\//i.test(profile.avatar) ? { avatar: profile.avatar } : {}),
    };
    const outcome = { onSuccess: onDone, onError: (err: Error) => setError(err.message) };
    if (profile) update.mutate(body, outcome);
    else create.mutate({ ...body, slug: username }, outcome);
  }

  const previewLinks = rows.filter((row) => row.url.trim() && row.enabled).map((row) => ({ platform: row.platform === "other" ? row.custom.trim().toLowerCase() || "other" : row.platform, label: row.label.trim() || null }));
  const select = "h-9 rounded-lg border bg-background px-2 text-xs";

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Section title={profile ? "Edit your link page" : "Create your link page"} icon={Link2}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Username</Label>
              <Input value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} disabled={!!profile} placeholder="your-name" maxLength={30} />
              <p className="text-[11px] text-muted-foreground">{profile ? "Your username can't be changed." : "Your page will live at /connect/username."}</p>
            </div>
            <div className="space-y-1"><Label>Display name</Label><Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="John's Store" maxLength={100} required /></div>
          </div>
          <div className="space-y-1"><Label>Bio (optional)</Label><Textarea rows={2} value={bio} onChange={(event) => setBio(event.target.value)} maxLength={300} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} /> Anyone with the link can see this page</label>
        </Section>

        <Section title={`Links · ${rows.length} of 30`} action={<Button type="button" size="sm" variant="outline" disabled={rows.length >= 30} onClick={() => setRows((current) => [...current, blankRow()])}><Plus className="mr-1 h-3.5 w-3.5" /> Add link</Button>}>
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={row.key} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                <select className={select} value={row.platform} onChange={(event) => patch(row.key, { platform: event.target.value })}>{PLATFORMS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                {row.platform === "other" && <Input className="h-9 w-28 text-xs" placeholder="Platform name" value={row.custom} onChange={(event) => patch(row.key, { custom: event.target.value })} maxLength={30} />}
                <Input className="h-9 min-w-40 flex-1 text-xs" placeholder={placeholderFor(row.platform)} value={row.url} onChange={(event) => patch(row.key, { url: event.target.value })} />
                <Input className="h-9 w-28 text-xs" placeholder="Label" value={row.label} onChange={(event) => patch(row.key, { label: event.target.value })} maxLength={50} />
                <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={row.enabled} onChange={(event) => patch(row.key, { enabled: event.target.checked })} /> Show</label>
                <div className="flex">
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Move down" disabled={index === rows.length - 1} onClick={() => move(index, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Remove link" disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">Only web, email, phone and WhatsApp links are allowed. Don't add anything private. Your page is public.</p>
        </Section>

        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending || !displayName.trim()}>{pending ? "Saving..." : profile ? "Save changes" : "Create page"}</Button>
          <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 text-center text-xs font-medium text-muted-foreground">Live preview</p>
        <Preview name={displayName.trim()} slug={slug.trim()} bio={bio.trim()} links={previewLinks} />
      </div>
    </form>
  );
}

function Summary({ profile, onEdit }: { profile: SocialProfile; onEdit: () => void }) {
  const remove = useDeleteSocialProfile();
  const url = `${publicBase()}/connect/${profile.slug}`;
  const visible = profile.links.filter((link) => link.enabled).map((link) => ({ platform: link.platform, label: link.label }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Section title={profile.displayName} icon={Link2} action={<span className={profile.isPublic ? "text-xs text-emerald-600" : "text-xs text-muted-foreground"}>{profile.isPublic ? "Public" : "Hidden"}</span>}>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
            <code className="min-w-0 flex-1 truncate text-sm">{url}</code>
            <CopyButton text={url} />
            <Button size="sm" variant="outline" asChild><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open</a></Button>
          </div>
          <p className="text-xs text-muted-foreground">{profile.links.length} {profile.links.length === 1 ? "link" : "links"}{profile.links.length > visible.length ? ` · ${profile.links.length - visible.length} hidden` : ""}. A page with a single web link sends visitors straight to it.</p>
          <div className="flex flex-wrap gap-2 border-t pt-3">
            <Button size="sm" onClick={onEdit}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={remove.isPending} onClick={() => window.confirm("Delete your link page? The URL and its QR code will stop working.") && remove.mutate()}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete</Button>
          </div>
          {remove.isError && <p className="text-xs text-destructive">{(remove.error as Error).message}</p>}
        </Section>
        <Section title="QR code">
          <QrPanel value={url} fileName={`link-page-${profile.slug}`} />
          <p className="text-center text-xs text-muted-foreground">Print it on a business card, a flyer or your shop counter.</p>
        </Section>
      </div>
      <div className="lg:self-start"><Preview name={profile.displayName} slug={profile.slug} bio={profile.bio ?? ""} links={visible} /></div>
    </div>
  );
}

export function LinkPageTool() {
  const { data: profile, isLoading, isError, refetch } = useMySocialProfile();
  const [editing, setEditing] = useState(false);

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-destructive">Couldn't load your link page.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  if (editing || (!profile && editing)) return <Editor key={profile?.id ?? "new"} profile={profile ?? null} onDone={() => setEditing(false)} />;

  if (!profile) {
    return (
      <Section title="Link page" icon={Link2}>
        <EmptyState icon={Link2} title="One link for everything" body="Put your social profiles, WhatsApp and website behind a single page and QR code. It's great for business cards." action={<Button onClick={() => setEditing(true)}>Create my link page</Button>} />
      </Section>
    );
  }

  return <Summary profile={profile} onEdit={() => setEditing(true)} />;
}