"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Store, Upload } from "lucide-react";
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

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

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
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);

  function handleFrontSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFrontFile(file);
    uploadFront.mutate(file, { onSuccess: (d) => setFrontUrl(d.url) });
  }

  function handleBackSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackFile(file);
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
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-xl mx-auto space-y-6 py-8 px-4">
      <motion.div variants={item} className="text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
          <Store className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Apply as a merchant</h1>
        <p className="text-muted-foreground mt-1">Tell us about your business and verify your identity to unlock the merchant dashboard.</p>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1"><Label>Business name</Label><Input value={form.businessName} onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))} required /></div>
              <div className="space-y-1">
                <Label>Category</Label>
                <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label>Business description</Label><Textarea rows={3} placeholder="What do you sell or offer?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required minLength={10} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Contact phone</Label><Input value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} required /></div>
                <div className="space-y-1"><Label>Contact email</Label><Input type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} required /></div>
              </div>
              <div className="space-y-1"><Label>Business address</Label><Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} maxLength={3} /></div>

              <div className="pt-2 border-t border-border space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">Identity verification</p>
                <div className="space-y-1">
                  <Label>ID document type</Label>
                  <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.idDocumentType} onChange={(e) => setForm((f) => ({ ...f, idDocumentType: e.target.value }))}>
                    {ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label>ID number</Label><Input value={form.idDocumentNumber} onChange={(e) => setForm((f) => ({ ...f, idDocumentNumber: e.target.value }))} required /></div>
                <div className="space-y-1">
                  <Label>Front of ID (required)</Label>
                  <Input type="file" accept="image/*,.pdf" onChange={handleFrontSelect} required={!frontUrl} />
                  {frontFile && <p className="text-[11px] text-muted-foreground">{uploadFront.isPending ? "Uploading..." : frontUrl ? `Uploaded: ${frontFile.name}` : frontFile.name}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Back of ID (optional)</Label>
                  <Input type="file" accept="image/*,.pdf" onChange={handleBackSelect} />
                  {backFile && <p className="text-[11px] text-muted-foreground">{uploadBack.isPending ? "Uploading..." : backUrl ? `Uploaded: ${backFile.name}` : backFile.name}</p>}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={applyMerchant.isPending || idUploading || !frontUrl}>
                {applyMerchant.isPending ? "Submitting..." : idUploading ? "Uploading ID..." : "Submit application"}
              </Button>
              {applyMerchant.isError && <p className="text-xs text-destructive text-center">{(applyMerchant.error as Error).message}</p>}
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}