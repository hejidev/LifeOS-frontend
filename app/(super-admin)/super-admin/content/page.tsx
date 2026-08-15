"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAllContent, useReviewContent } from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const STATUS_COLOR: Record<string, string> = { DRAFT: "outline", PENDING_REVIEW: "secondary", PUBLISHED: "default", REJECTED: "destructive" };

export default function ContentReviewPage() {
  const [status, setStatus] = useState<string>("PENDING_REVIEW");
  const { data: content = [] } = useAllContent(undefined, status === "ALL" ? undefined : status);
  const review = useReviewContent();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Content Review</h1>
        <p className="text-muted-foreground mt-1">Everything admins have written, across every status.</p>
      </motion.div>

      <motion.div variants={item}>
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            <TabsTrigger value="PENDING_REVIEW">Pending</TabsTrigger>
            <TabsTrigger value="PUBLISHED">Published</TabsTrigger>
            <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
            <TabsTrigger value="DRAFT">Drafts</TabsTrigger>
            <TabsTrigger value="ALL">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        {(content as any[]).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nothing here.</p>
        ) : (
          (content as any[]).map((c) => (
            <Card key={c.id}>
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.type} · by {c.author.name} ({c.author.email})</p>
                  </div>
                  <Badge variant={STATUS_COLOR[c.status] as any}>{c.status.replace("_", " ")}</Badge>
                </div>
                {c.excerpt && <p className="text-sm text-muted-foreground line-clamp-2">{c.excerpt}</p>}
                {c.status === "PENDING_REVIEW" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => review.mutate({ id: c.id, action: "APPROVE" })} disabled={review.isPending}>
                      <Check className="mr-1 h-3 w-3" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setRejectId(c.id)}>
                      <X className="mr-1 h-3 w-3" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </motion.div>

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reject content</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Textarea rows={3} placeholder="Why is this being rejected? (shown to the author)" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => { if (rejectId) review.mutate({ id: rejectId, action: "REJECT", note }, { onSuccess: () => { setRejectId(null); setNote(""); } }); }}>
                {review.isPending ? "Rejecting..." : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}