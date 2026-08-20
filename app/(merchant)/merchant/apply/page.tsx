"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Store, ShieldCheck, Clock, Sparkles, Check, Upload, ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApplyMerchant, useUploadMerchantId } from "@/lib/hooks/use-life-data";

const CATEGORIES = [
  { value: "RETAIL", label: "Retail" }, { value: "FOOD_BEVERAGE", label: "Food & Beverage" },
  { value: "SERVICES", label: "Services" }, { value: "FASHION", label: "Fashion" },
  { value: "ELECTRONICS", label: "Electronics" }, { value: "HEALTH_BEAUTY", label: "Health & Beauty" },
  { value: "EDUCATION", label: "Education" }, { value: "OTHER", label: "Other" },
];

const ID_TYPES = [
  { value: "NATIONAL_ID", label: "National ID" }, { value: "PASSPORT", label: "Passport" },
  { value: "DRIVERS_LICENSE", label: "Driver's License" }, { value: "VOTERS_CARD", label: "Voter's Card" },
];

const TRUST_POINTS = [
  { icon: ShieldCheck, title: "Identity-verified merchants only", desc: "No bots, no fake storefronts — every application is reviewed." },
  { icon: Clock, title: "Fast review", desc: "Applications are reviewed by our team, not stuck in a queue for weeks." },
  { icon: Sparkles, title: "Full toolkit on approval", desc: "POS, inventory, staff management, and customer CRM — all unlocked at once." },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function UploadZone({
  label, required, file, previewUrl, uploading, uploaded, onSelect,
}: {
  label: string; required?: boolean; file: File | null; previewUrl: string | null;
  uploading: boolean; uploaded: boolean; onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center gap-1">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <label
        className={`relative flex items-center gap-3 rounded-xl border-2 border-dashed p-3 cursor-pointer transition-colors ${
          uploaded ? "border-emerald-500/40 bg-emerald-500/5" : "border-border hover:border-primary/40 hover:bg-muted/30"
        }`}
      >
        <input type="file" accept="image/*,.pdf" onChange={onSelect} className="hidden" />
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted/50 overflow-hidden">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {!file ? (
            <>
              <p className="text-sm font-medium flex items-center gap-1.5"><Upload className="h-3.5 w-3.5" /> Click to upload</p>
              <p className="text-[11px] text-muted-foreground">Image or PDF, up to 10MB</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className={`text-[11px] flex items-center gap-1 ${uploaded ? "text-emerald-500" : "text-muted-foreground"}`}>
                {uploading ? "Uploading..." : uploaded ? <><Check className="h-3 w-3" /> Uploaded</> : "Selected"}
              </p>
            </>
          )}
        </div>
      </label>
    </div>
  );
}

export default function MerchantApplyPage() {
  const router = useRouter();
  const applyMerchant = useApplyMerchant();
  const uploadFront = useUploadMerchantId();
  const uploadBack = useUploadMerchantId();

  const [form, setForm] = useState({
    businessName: "", category: "RETAIL", description: "",
    contactPhone: "", contactEmail: "", address: "", currency: "USD",
    idDocumentType: "NATIONAL_ID", idDocumentNumber: "",
  });
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (frontPreview) URL.revokeObjectURL(frontPreview);
      if (backPreview) URL.revokeObjectURL(backPreview);
    };
  }, [frontPreview, backPreview]);

  function handleFrontSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFrontFile(file);
    if (file.type.startsWith("image/")) setFrontPreview(URL.createObjectURL(file));
    uploadFront.mutate(file, { onSuccess: (d) => setFrontUrl(d.url) });
  }

  function handleBackSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackFile(file);
    if (file.type.startsWith("image/")) setBackPreview(URL.createObjectURL(file));
    uploadBack.mutate(file, { onSuccess: (d) => setBackUrl(d.url) });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!frontUrl) return;
    applyMerchant.mutate(
      { ...form, idFrontUrl: frontUrl, idBackUrl: backUrl ?? undefined },
      { onSuccess: () => router.push("/merchant/dashboard") }
    );
  }

  const idUploading = uploadFront.isPending || uploadBack.isPending;

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <motion.div variants={container} initial="hidden" animate="show" className="relative max-w-5xl mx-auto py-10 sm:py-14 px-4">
        <motion.div variants={item} className="text-center mb-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg shadow-lg shadow-primary/20 mb-4">
            <Store className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Become a merchant</h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">Tell us about your business and verify your identity to unlock the full merchant dashboard.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="border-primary/10 shadow-xl shadow-black/5">
              <CardContent className="pt-6 sm:pt-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Business details</p>
                    <div className="space-y-1.5"><Label>Business name</Label><Input value={form.businessName} onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))} className="h-11" required /></div>
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <select className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                        {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5"><Label>Business description</Label><Textarea rows={3} placeholder="What do you sell or offer?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required minLength={10} /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label>Contact phone</Label><Input value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} className="h-11" required /></div>
                      <div className="space-y-1.5"><Label>Contact email</Label><Input type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} className="h-11" required /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1.5"><Label>Business address</Label><Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="h-11" required /></div>
                      <div className="space-y-1.5"><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} maxLength={3} className="h-11" /></div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Identity verification</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>ID document type</Label>
                        <select className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.idDocumentType} onChange={(e) => setForm((f) => ({ ...f, idDocumentType: e.target.value }))}>
                          {ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5"><Label>ID number</Label><Input value={form.idDocumentNumber} onChange={(e) => setForm((f) => ({ ...f, idDocumentNumber: e.target.value }))} className="h-11" required /></div>
                    </div>
                    <UploadZone label="Front of ID" required file={frontFile} previewUrl={frontPreview} uploading={uploadFront.isPending} uploaded={!!frontUrl} onSelect={handleFrontSelect} />
                    <UploadZone label="Back of ID (optional)" file={backFile} previewUrl={backPreview} uploading={uploadBack.isPending} uploaded={!!backUrl} onSelect={handleBackSelect} />
                  </div>

                  <Button type="submit" className="w-full h-12 text-base font-medium" disabled={applyMerchant.isPending || idUploading || !frontUrl}>
                    {applyMerchant.isPending ? "Submitting..." : idUploading ? "Uploading ID..." : "Submit application"}
                  </Button>
                  {applyMerchant.isError && <p className="text-xs text-destructive text-center">{(applyMerchant.error as Error).message}</p>}
                </form>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item} className="space-y-4">
            {TRUST_POINTS.map((t) => (
              <Card key={t.title} className="bg-muted/30 border-border/50">
                <CardContent className="pt-5 pb-5 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <t.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}