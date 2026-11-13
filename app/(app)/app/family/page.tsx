"use client";

import { useEffect, useRef, useState } from "react";
import { Baby, Check, Copy, KeyRound, Lock, LogOut, MessageCircle, Moon, Plus, Send, ShieldCheck, Smartphone, Trash2, Unlock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLogout } from "@/lib/hooks/use-auth";
import {
  useClearOverride, useCreateChild, useDeleteChild, useFamilyMe, useFamilyMembers, useFamilySetup,
  useMarkRead, useMessages, useResetChildPassword, useSaveSchedules, useSendMessage, useSetOverride, useThreads,
} from "@/lib/hooks/use-family-space";
import type { FamilyKid, FamilyMe, Lock as LockState, Schedule } from "@/lib/hooks/use-family-space";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};
const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const newSchedule = (): Schedule => ({ label: "Bedtime", days: [0, 1, 2, 3, 4, 5, 6], startMin: 21 * 60, endMin: 6 * 60, enabled: true });

function LockBadge({ lock }: { lock: LockState | null }) {
  if (!lock) return null;
  return lock.locked ? (
    <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" /> Locked{lock.until ? ` until ${clock(lock.until)}` : ""}</Badge>
  ) : (
    <Badge variant="secondary" className="gap-1"><Unlock className="h-3 w-3" /> Open</Badge>
  );
}

function LockScreen({ until }: { until: string | null }) {
  const logout = useLogout();
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <Moon className="h-9 w-9 text-primary" />
      </div>
      <h1 className="text-3xl font-bold">It's bedtime</h1>
      <p className="max-w-sm text-muted-foreground">
        LifeOS is resting for now{until ? ` and opens again at ${clock(until)}` : ""}. Sleep well!
      </p>
      <Button variant="outline" size="sm" onClick={() => logout.mutate(undefined, { onSettled: () => { window.location.href = "/family/sign-in"; } })}>
        <LogOut className="mr-2 h-4 w-4" /> Sign out
      </Button>
    </div>
  );
}

function SetupCard() {
  const setup = useFamilySetup();
  const [agreed, setAgreed] = useState(false);
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Set up your Family Space</CardTitle>
        <p className="text-sm text-muted-foreground">Create sign-ins for your children, chat as a family and set bedtime schedules.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          I am the parent or legal guardian of the children I add. I consent to LifeOS storing their name and family messages, and I understand I can see those messages and delete a child's account at any time.
        </label>
        <Button disabled={!agreed || setup.isPending} onClick={() => setup.mutate()}>
          {setup.isPending ? "Setting up..." : "Create my family"}
        </Button>
        {setup.isError && <p className="text-xs text-destructive">{(setup.error as Error).message}</p>}
      </CardContent>
    </Card>
  );
}

function MembersTab({ familyCode }: { familyCode: string }) {
  const { data: members = [], isLoading } = useFamilyMembers();
  const createChild = useCreateChild();
  const resetPassword = useResetChildPassword();
  const removeChild = useDeleteChild();
  const [dialog, setDialog] = useState<{ kind: "create" } | { kind: "reset"; id: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: "", password: "" });
  const [copied, setCopied] = useState(false);

  function close() {
    setDialog(null);
    setForm({ name: "", password: "" });
    createChild.reset();
    resetPassword.reset();
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (dialog?.kind === "create") createChild.mutate(form, { onSuccess: close });
    if (dialog?.kind === "reset") resetPassword.mutate({ id: dialog.id, password: form.password }, { onSuccess: close });
  }

  const error = (createChild.error ?? resetPassword.error) as Error | null;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Family code</p>
            <p className="font-mono text-2xl font-bold tracking-widest">{familyCode}</p>
            <p className="mt-1 text-xs text-muted-foreground">Children sign in at lifeos.com.ng/family/sign-in with this code, their name and their password.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(familyCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />} {copied ? "Copied" : "Copy code"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Children</p>
        <Button size="sm" onClick={() => setDialog({ kind: "create" })}><Plus className="mr-1.5 h-4 w-4" /> Add child</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : members.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No children yet. Add one to start.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {members.map((member) => (
            <Card key={member.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10"><Baby className="h-5 w-5 text-primary" /></div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.hasAccount ? "Has a sign-in" : "Profile only"}</p>
                    </div>
                  </div>
                  <LockBadge lock={member.lock} />
                </div>
                {member.hasAccount && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "reset", id: member.id, name: member.name })}>
                      <KeyRound className="mr-1.5 h-3.5 w-3.5" /> New password
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => window.confirm(`Delete ${member.name}'s account and everything in it?`) && removeChild.mutate(member.id)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialog?.kind === "reset" ? `New password for ${dialog.name}` : "Add a child"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3 pt-2">
            {dialog?.kind === "create" && (
              <div className="space-y-1">
                <Label>Child's name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
            )}
            <div className="space-y-1">
              <Label>Password (at least 6 characters)</Label>
              <Input type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} minLength={6} required />
            </div>
            {error && <p className="text-xs text-destructive">{error.message}</p>}
            <Button type="submit" className="w-full" disabled={createChild.isPending || resetPassword.isPending}>Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChatPanel() {
  const { data: threads = [] } = useThreads();
  const [active, setActive] = useState("group");
  const { data: messages = [] } = useMessages(active);
  const send = useSendMessage(active);
  const markRead = useMarkRead();
  const [draft, setDraft] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
    if (messages.length > 0) markRead.mutate(active);
  }, [messages.length, active]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    send.mutate(body, { onSuccess: () => setDraft("") });
  }

  return (
    <div className="grid h-[70vh] overflow-hidden rounded-xl border md:grid-cols-[220px_1fr]">
      <div className="overflow-y-auto border-b bg-muted/20 md:border-b-0 md:border-r">
        {threads.map((thread) => (
          <button
            key={thread.key}
            onClick={() => setActive(thread.key)}
            className={cn("flex w-full items-center justify-between gap-2 border-b px-3 py-3 text-left hover:bg-muted/50", active === thread.key && "bg-muted")}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{thread.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{thread.last?.body ?? "No messages yet"}</span>
            </span>
            {thread.unread > 0 && <Badge className="shrink-0">{thread.unread}</Badge>}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-col">
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Say hello to start the conversation.</p>}
          {messages.map((message) => (
            <div key={message.id} className={cn("flex flex-col", message.mine ? "items-end" : "items-start")}>
              {!message.mine && (
                <span className="mb-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  {message.senderName} {message.fromParent && <Badge variant="outline" className="h-4 px-1 text-[9px]">Parent</Badge>}
                </span>
              )}
              <p className={cn("max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm", message.mine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                {message.body}
              </p>
              <span className="mt-0.5 text-[10px] text-muted-foreground">{clock(message.createdAt)}</span>
            </div>
          ))}
          <div ref={bottom} />
        </div>
        <form onSubmit={submit} className="flex gap-2 border-t p-3">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message" maxLength={1000} />
          <Button type="submit" size="icon" disabled={send.isPending || !draft.trim()}><Send className="h-4 w-4" /></Button>
        </form>
        <p className="px-3 pb-2 text-[11px] text-muted-foreground">Parents can see all family messages.</p>
      </div>
    </div>
  );
}

function ChildSchedule({ kid }: { kid: FamilyKid }) {
  const save = useSaveSchedules(kid.id);
  const setOverride = useSetOverride(kid.id);
  const clearOverride = useClearOverride(kid.id);
  const [rows, setRows] = useState<Schedule[]>(kid.schedules);
  const signature = JSON.stringify(kid.schedules);

  useEffect(() => setRows(kid.schedules), [signature]);

  function update(index: number, patch: Partial<Schedule>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function toggleDay(index: number, day: number) {
    const days = rows[index].days.includes(day) ? rows[index].days.filter((d) => d !== day) : [...rows[index].days, day];
    update(index, { days });
  }

  const invalid = rows.some((row) => row.days.length === 0 || row.startMin === row.endMin);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{kid.name}</CardTitle>
          <LockBadge lock={kid.lock} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No bedtime set. {kid.name} can use LifeOS any time.</p>}
          {rows.map((row, index) => (
            <div key={index} className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input value={row.label} onChange={(e) => update(index, { label: e.target.value })} className="h-8 w-36" maxLength={40} />
                <Input type="time" value={toTime(row.startMin)} onChange={(e) => update(index, { startMin: toMinutes(e.target.value) })} className="h-8 w-28" />
                <span className="text-sm text-muted-foreground">to</span>
                <Input type="time" value={toTime(row.endMin)} onChange={(e) => update(index, { endMin: toMinutes(e.target.value) })} className="h-8 w-28" />
                <label className="ml-auto flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={row.enabled} onChange={(e) => update(index, { enabled: e.target.checked })} /> On
                </label>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setRows((current) => current.filter((_, i) => i !== index))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex gap-1">
                {DAY_LABELS.map((label, day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(index, day)}
                    className={cn("h-7 w-7 rounded-full border text-xs font-medium", row.days.includes(day) ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={rows.length >= 5} onClick={() => setRows((current) => [...current, newSchedule()])}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add schedule
            </Button>
            <Button size="sm" disabled={save.isPending || invalid} onClick={() => save.mutate(rows)}>
              {save.isPending ? "Saving..." : "Save schedule"}
            </Button>
            {save.isSuccess && <span className="text-xs text-emerald-600">Saved</span>}
            {save.isError && <span className="text-xs text-destructive">{(save.error as Error).message}</span>}
          </div>
        </div>

        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-semibold text-muted-foreground">Right now</p>
          {kid.override && (
            <p className="text-xs">
              {kid.override.kind === "LOCK" ? "Locked by you" : "Extra time allowed"} until {clock(kid.override.until)}.{" "}
              <button className="text-primary underline" onClick={() => clearOverride.mutate()}>Cancel</button>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {[30, 60, 120].map((minutes) => (
              <Button key={`lock-${minutes}`} size="sm" variant="outline" onClick={() => setOverride.mutate({ kind: "LOCK", minutes })}>
                <Lock className="mr-1.5 h-3.5 w-3.5" /> Lock {minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}
              </Button>
            ))}
            {[30, 60].map((minutes) => (
              <Button key={`open-${minutes}`} size="sm" variant="outline" onClick={() => setOverride.mutate({ kind: "UNLOCK", minutes })}>
                <Unlock className="mr-1.5 h-3.5 w-3.5" /> Allow {minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BedtimeTab() {
  const { data: members = [], isLoading } = useFamilyMembers();
  const kids = members.filter((member) => member.hasAccount);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (kids.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">Add a child first, then set their bedtime here.</p>;

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
        Bedtime locks your child's <strong>LifeOS</strong> account. To lock the phone, tablet or laptop itself, also set it up on the device. See the Devices tab.
      </p>
      {kids.map((kid) => <ChildSchedule key={kid.id} kid={kid} />)}
    </div>
  );
}

function GuideTab() {
  const items = [
    { title: "Android phones and tablets", body: "Install Google Family Link on your phone, add your child's device and open Controls, then Bedtime. The device locks at the time you set." },
    { title: "iPhone and iPad", body: "Settings, then Screen Time, then Downtime. Turn on Family Sharing so you can manage your child's device from yours." },
    { title: "Windows laptops", body: "Use Microsoft Family Safety (account.microsoft.com/family). Add your child's Microsoft account and set screen-time limits per device." },
    { title: "Mac", body: "System Settings, then Screen Time, then Downtime, using Family Sharing for a child's account." },
    { title: "Whole house Wi-Fi", body: "Many routers can pause the internet for chosen devices on a schedule. Check your router's parental controls page." },
  ];
  return (
    <div className="space-y-3">
      <p className="rounded-lg border p-3 text-sm text-muted-foreground">
        A website can't switch off a device. Only the phone's or computer's own system can. Set the same bedtime in both places so LifeOS and the device agree.
      </p>
      {items.map((item) => (
        <Card key={item.title}>
          <CardContent className="flex gap-3 p-4">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.body}</p></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ParentHub({ me }: { me: FamilyMe }) {
  const [tab, setTab] = useState("members");
  const { data: threads = [] } = useThreads();
  const unread = threads.reduce((sum, thread) => sum + thread.unread, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl"><Users className="h-6 w-6 text-primary" /> Family Space</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign-ins, chat and bedtime for your family.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="chat" className="gap-1.5">Chat {unread > 0 && <Badge className="h-4 px-1.5 text-[10px]">{unread}</Badge>}</TabsTrigger>
          <TabsTrigger value="bedtime">Bedtime</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "members" && <MembersTab familyCode={me.familyCode ?? ""} />}
      {tab === "chat" && <ChatPanel />}
      {tab === "bedtime" && <BedtimeTab />}
      {tab === "devices" && <GuideTab />}
    </div>
  );
}

function ChildHome({ me }: { me: FamilyMe }) {
  const logout = useLogout();
  if (me.lock?.locked) return <LockScreen until={me.lock.until} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><MessageCircle className="h-6 w-6 text-primary" /> Hi, {me.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Chat with your family here.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => logout.mutate(undefined, { onSettled: () => { window.location.href = "/family/sign-in"; } })}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
      {(me.schedules ?? []).length > 0 && (
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-medium">Your bedtime</p>
              {me.schedules!.map((schedule) => (
                <p key={schedule.id} className="text-xs text-muted-foreground">
                  {schedule.label}: {toTime(schedule.startMin)} to {toTime(schedule.endMin)} on {schedule.days.map((day) => DAY_LABELS[day]).join(" ")}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <ChatPanel />
    </div>
  );
}

export default function FamilySpacePage() {
  const { data: me, isLoading } = useFamilyMe();

  if (isLoading || !me) return <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />;
  if (me.role === "child") return <ChildHome me={me} />;
  if (me.role === "none") return <SetupCard />;
  return <ParentHub me={me} />;
}