"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Store, Check, X, ShieldOff, RotateCcw, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useMerchantApplications, useChangeMerchantStatus, useMerchantApplicationDetail,
} from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const TABS = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "SUSPENDED", label: "Suspended" },
] as const;

export default function MerchantApplicationsPage() {
  const [tab, setTab] = useState<typeof TABS[number]["key"]>("PENDING");
  const { data: applications = [], isLoading } = useMerchantApplications(tab);
  const changeStatus = useChangeMerchantStatus();

  const [reasonDialog, setReasonDialog] = useState<{ id: string; action: "REJECT" | "SUSPEND" } | null>(null);
  const [reason, setReason] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data: detail } = useMerchantApplicationDetail(detailId);

  function handleReasonSubmit() {
    if (!reasonDialog) return;
    changeStatus.mutate(
      { id: reasonDialog.id, action: reasonDialog.action, rejectionReason: reason },
      { onSuccess: () => { setReasonDialog(null); setReason(""); } }
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Store className="h-6 w-6 text-primary" /> Merchant Management</h1>
        <p className="text-muted-foreground mt-1">Review applications and manage merchant status.</p>
      </motion.div>

      <motion.div variants={item}>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            {TABS.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : applications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No {tab.toLowerCase()} merchants.</p>
        ) : (
          (applications as any[]).map((app) => (
            <Card key={app.id}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{app.businessName}</p>
                    <p className="text-xs text-muted-foreground">{app.user.name} · {app.user.email}</p>
                  </div>
                  <Badge variant="outline">{app.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{app.description}</p>
                {app.status === "REJECTED" && app.rejectionReason && (
                  <p className="text-xs text-destructive">Reason: {app.rejectionReason}</p>
                )}
                {app.status === "SUSPENDED" && app.rejectionReason && (
                  <p className="text-xs text-destructive">Suspended: {app.rejectionReason}</p>
                )}
                <div className="flex gap-2 pt-1 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setDetailId(app.id)}><Eye className="mr-1 h-3 w-3" /> View profile</Button>
                  {tab === "PENDING" && (
                    <>
                      <Button size="sm" onClick={() => changeStatus.mutate({ id: app.id, action: "APPROVE" })} disabled={changeStatus.isPending}><Check className="mr-1 h-3 w-3" /> Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => setReasonDialog({ id: app.id, action: "REJECT" })}><X className="mr-1 h-3 w-3" /> Reject</Button>
                    </>
                  )}
                  {tab === "APPROVED" && (
                    <Button size="sm" variant="destructive" onClick={() => setReasonDialog({ id: app.id, action: "SUSPEND" })}><ShieldOff className="mr-1 h-3 w-3" /> Suspend</Button>
                  )}
                  {tab === "SUSPENDED" && (
                    <Button size="sm" onClick={() => changeStatus.mutate({ id: app.id, action: "REACTIVATE" })} disabled={changeStatus.isPending}><RotateCcw className="mr-1 h-3 w-3" /> Reactivate</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </motion.div>

      <Dialog open={!!reasonDialog} onOpenChange={(o) => !o && setReasonDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{reasonDialog?.action === "SUSPEND" ? "Suspend merchant" : "Reject application"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea rows={3} placeholder="Reason (shown to the merchant)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReasonDialog(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReasonSubmit} disabled={changeStatus.isPending}>
                {changeStatus.isPending ? "Submitting..." : reasonDialog?.action === "SUSPEND" ? "Suspend" : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Merchant profile</DialogTitle></DialogHeader>
          {detail ? (
            <div className="space-y-2 text-sm pt-2">
              <p><span className="text-muted-foreground">Business:</span> {(detail as any).businessName}</p>
              <p><span className="text-muted-foreground">Category:</span> {(detail as any).category}</p>
              <p><span className="text-muted-foreground">Description:</span> {(detail as any).description}</p>
              <p><span className="text-muted-foreground">Contact:</span> {(detail as any).contactPhone} · {(detail as any).contactEmail}</p>
              <p><span className="text-muted-foreground">Address:</span> {(detail as any).address}</p>
              <p><span className="text-muted-foreground">Owner:</span> {(detail as any).user.name} ({(detail as any).user.email})</p>
              <p><span className="text-muted-foreground">Staff members:</span> {(detail as any).staffCount}</p>
              <p><span className="text-muted-foreground">Applied:</span> {new Date((detail as any).appliedAt).toLocaleString()}</p>
            </div>
          ) : (
            <Skeleton className="h-40 rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}