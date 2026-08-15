"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Plus, Send, Rocket, Trash2, Pencil, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useMyContent, useCreateContent, useUpdateContent, useSubmitForReview, usePublishDirectly, useDeleteContent, useUploadContentImage,
} from "@/lib/hooks/use-life-data";
import { useTeam, useCreateTeamMember, useDeleteTeamMember, useTestimonials, useCreateTestimonial, useDeleteTestimonial } from "@/lib/hooks/use-life-data";
import { FaXTwitter, FaLinkedin, FaGithub } from "react-icons/fa6";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const TYPES = ["ABOUT", "CONTACT", "BLOG", "FAQ"];
const STATUS_COLOR: Record<string, string> = { DRAFT: "outline", PENDING_REVIEW: "secondary", PUBLISHED: "default", REJECTED: "destructive" };
const emptyForm = { type: "BLOG", title: "", excerpt: "", body: "", coverImageUrl: "" };

const TYPE_COPY: Record<string, { titleLabel: string; bodyLabel: string; showExcerpt: boolean; showCover: boolean; titlePlaceholder: string; bodyPlaceholder: string }> = {
  ABOUT: { titleLabel: "Page title", bodyLabel: "Content", showExcerpt: false, showCover: true, titlePlaceholder: "About LifeOS", bodyPlaceholder: "Tell your story..." },
  CONTACT: { titleLabel: "Page title", bodyLabel: "Content", showExcerpt: false, showCover: false, titlePlaceholder: "Contact Us", bodyPlaceholder: "Email, phone, hours, address..." },
  FAQ: { titleLabel: "Question", bodyLabel: "Answer", showExcerpt: false, showCover: false, titlePlaceholder: "How do I reset my password?", bodyPlaceholder: "Explain the answer clearly..." },
  BLOG: { titleLabel: "Post title", bodyLabel: "Full article", showExcerpt: true, showCover: true, titlePlaceholder: "5 ways to stay organized", bodyPlaceholder: "Write your post. Separate paragraphs with a blank line." },
};

export default function AdminContentPage() {
  const { data: content = [] } = useMyContent();
  const createContent = useCreateContent();
  const updateContent = useUpdateContent();
  const submitReview = useSubmitForReview();
  const publish = usePublishDirectly();
  const deleteContent = useDeleteContent();
  const uploadImage = useUploadContentImage();

  const { data: team = [] } = useTeam();
  const createTeamMember = useCreateTeamMember();
  const deleteTeamMember = useDeleteTeamMember();
  const { data: testimonials = [] } = useTestimonials();
  const createTestimonial = useCreateTestimonial();
  const deleteTestimonial = useDeleteTestimonial();

  const [teamOpen, setTeamOpen] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: "", role: "", bio: "", imageUrl: "", linkedinUrl: "", twitterUrl: "", githubUrl: "", isFounder: false, order: 0 });
  const [testimonialOpen, setTestimonialOpen] = useState(false);
  const [testimonialForm, setTestimonialForm] = useState({ quote: "", name: "", role: "", avatarUrl: "", order: 0 });


  const [typeFilter, setTypeFilter] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const copy = TYPE_COPY[form.type];
  const filtered = typeFilter === "ALL" ? content : (content as any[]).filter((c) => c.type === typeFilter);

  function openCreate() { setEditingId(null); setForm(emptyForm); setOpen(true); }
  function openEdit(c: any) { setEditingId(c.id); setForm({ type: c.type, title: c.title, excerpt: c.excerpt ?? "", body: c.body, coverImageUrl: c.coverImageUrl ?? "" }); setOpen(true); }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage.mutate(file, { onSuccess: (d) => setForm((f) => ({ ...f, coverImageUrl: d.url })) });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { title: form.title, excerpt: form.excerpt || undefined, body: form.body, coverImageUrl: form.coverImageUrl || undefined };
    if (editingId) {
      updateContent.mutate({ id: editingId, data: payload }, { onSuccess: () => setOpen(false) });
    } else {
      createContent.mutate({ type: form.type, ...payload }, { onSuccess: () => setOpen(false) });
    }
  }

  function handleTeamSubmit(e: React.FormEvent) {
    e.preventDefault();
    createTeamMember.mutate(
      { ...teamForm, bio: teamForm.bio || undefined, imageUrl: teamForm.imageUrl || undefined, linkedinUrl: teamForm.linkedinUrl || undefined, twitterUrl: teamForm.twitterUrl || undefined, githubUrl: teamForm.githubUrl || undefined },
      { onSuccess: () => { setTeamOpen(false); setTeamForm({ name: "", role: "", bio: "", imageUrl: "", linkedinUrl: "", twitterUrl: "", githubUrl: "", isFounder: false, order: 0 }); } }
    );
  }
  function handleTestimonialSubmit(e: React.FormEvent) {
    e.preventDefault();
    createTestimonial.mutate(
      { ...testimonialForm, role: testimonialForm.role || undefined, avatarUrl: testimonialForm.avatarUrl || undefined },
      { onSuccess: () => { setTestimonialOpen(false); setTestimonialForm({ quote: "", name: "", role: "", avatarUrl: "", order: 0 }); } }
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Content</h1>
          <p className="text-muted-foreground text-sm mt-1">Write and manage About, Contact, Blog, and FAQ content.</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New</Button>
      </motion.div>

      <motion.div variants={item}>
        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            {TYPES.map((t) => <TabsTrigger key={t} value={t}>{t}</TabsTrigger>)}
            <TabsTrigger value="TEAM">Team</TabsTrigger>
            <TabsTrigger value="TESTIMONIALS">Testimonials</TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {typeFilter === "TEAM" && (
        <motion.div variants={item} className="space-y-3">
          <Button size="sm" onClick={() => setTeamOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add team member</Button>
          {(team as any[]).map((m) => (
            <Card key={m.id}>
              <CardContent className="pt-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {m.imageUrl && <img src={m.imageUrl} alt="" className="h-12 w-12 rounded-full object-cover shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.name} {m.isFounder && <Badge variant="secondary" className="ml-1 text-[10px]">Founder</Badge>}</p>
                    <p className="text-xs text-muted-foreground">{m.role}</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={() => deleteTeamMember.mutate(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {typeFilter === "TESTIMONIALS" && (
        <motion.div variants={item} className="space-y-3">
          <Button size="sm" onClick={() => setTestimonialOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add testimonial</Button>
          {(testimonials as any[]).map((t) => (
            <Card key={t.id}>
              <CardContent className="pt-6 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm italic truncate">"{t.quote}"</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.name}{t.role ? ` · ${t.role}` : ""}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={() => deleteTestimonial.mutate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      <motion.div variants={item} className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No content yet.</p>
        ) : (
          filtered.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {c.coverImageUrl && <img src={c.coverImageUrl} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.type}</p>
                    </div>
                  </div>
                  <Badge variant={STATUS_COLOR[c.status] as any} className="shrink-0">{c.status.replace("_", " ")}</Badge>
                </div>
                {c.reviewNote && c.status === "REJECTED" && <p className="text-xs text-destructive">Rejection note: {c.reviewNote}</p>}
                <div className="flex gap-2 pt-1 flex-wrap">
                  {(c.status === "DRAFT" || c.status === "REJECTED") && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="mr-1 h-3 w-3" /> Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => submitReview.mutate(c.id)} disabled={submitReview.isPending}><Send className="mr-1 h-3 w-3" /> Submit for review</Button>
                      <Button size="sm" onClick={() => publish.mutate(c.id)} disabled={publish.isPending}><Rocket className="mr-1 h-3 w-3" /> Publish directly</Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteContent.mutate(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0"><DialogTitle>{editingId ? "Edit content" : "New content"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="space-y-3 pt-2 pb-2">
              {!editingId && (
                <div className="space-y-1">
                  <Label>Type</Label>
                  <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <Label>{copy.titleLabel}</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={copy.titlePlaceholder} required />
              </div>
              {copy.showExcerpt && (
                <div className="space-y-1">
                  <Label>Short summary (shown in previews)</Label>
                  <Input value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} />
                </div>
              )}
              {copy.showCover && (
                <div className="space-y-1">
                  <Label>Cover image</Label>
                  {form.coverImageUrl && <img src={form.coverImageUrl} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />}
                  <Input type="file" accept="image/*" onChange={handleImageSelect} />
                  {uploadImage.isPending && <p className="text-[11px] text-muted-foreground">Uploading...</p>}
                </div>
              )}
              <div className="space-y-1">
                <Label>{copy.bodyLabel}</Label>
                <Textarea rows={copy.showExcerpt ? 10 : 5} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder={copy.bodyPlaceholder} required />
              </div>
            </div>
            <div className="pt-3 border-t border-border mt-2 shrink-0">
              <Button type="submit" className="w-full" disabled={createContent.isPending || updateContent.isPending}>
                {createContent.isPending || updateContent.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add team member</DialogTitle></DialogHeader>
          <form onSubmit={handleTeamSubmit} className="space-y-3 pt-2">
            <div className="space-y-1"><Label>Name</Label><Input value={teamForm.name} onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>Role</Label><Input value={teamForm.role} onChange={(e) => setTeamForm((f) => ({ ...f, role: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>Bio (optional)</Label><Textarea rows={2} value={teamForm.bio} onChange={(e) => setTeamForm((f) => ({ ...f, bio: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Photo URL (optional)</Label><Input value={teamForm.imageUrl} onChange={(e) => setTeamForm((f) => ({ ...f, imageUrl: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="LinkedIn URL" value={teamForm.linkedinUrl} onChange={(e) => setTeamForm((f) => ({ ...f, linkedinUrl: e.target.value }))} />
              <Input placeholder="X/Twitter URL" value={teamForm.twitterUrl} onChange={(e) => setTeamForm((f) => ({ ...f, twitterUrl: e.target.value }))} />
              <Input placeholder="GitHub URL" value={teamForm.githubUrl} onChange={(e) => setTeamForm((f) => ({ ...f, githubUrl: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={teamForm.isFounder} onChange={(e) => setTeamForm((f) => ({ ...f, isFounder: e.target.checked }))} /><span className="text-sm">Show in Founder section</span></label>
            <div className="space-y-1"><Label>Display order</Label><Input type="number" value={teamForm.order} onChange={(e) => setTeamForm((f) => ({ ...f, order: Number(e.target.value) }))} /></div>
            <Button type="submit" className="w-full" disabled={createTeamMember.isPending}>{createTeamMember.isPending ? "Saving..." : "Save"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={testimonialOpen} onOpenChange={setTestimonialOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add testimonial</DialogTitle></DialogHeader>
          <form onSubmit={handleTestimonialSubmit} className="space-y-3 pt-2">
            <div className="space-y-1"><Label>Quote</Label><Textarea rows={3} value={testimonialForm.quote} onChange={(e) => setTestimonialForm((f) => ({ ...f, quote: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>Name</Label><Input value={testimonialForm.name} onChange={(e) => setTestimonialForm((f) => ({ ...f, name: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>Role / Company (optional)</Label><Input value={testimonialForm.role} onChange={(e) => setTestimonialForm((f) => ({ ...f, role: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Avatar URL (optional)</Label><Input value={testimonialForm.avatarUrl} onChange={(e) => setTestimonialForm((f) => ({ ...f, avatarUrl: e.target.value }))} /></div>
            <Button type="submit" className="w-full" disabled={createTestimonial.isPending}>{createTestimonial.isPending ? "Saving..." : "Save"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}