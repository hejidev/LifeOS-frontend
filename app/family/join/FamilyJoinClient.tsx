"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Users, Sparkles, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useFamilyInviteByToken, useAcceptFamilyInvite } from "@/lib/hooks/use-life-data";

const ROLE_LABELS: Record<string, string> = { PARENT: "Parent", GUARDIAN: "Guardian", CHILD: "Child" };

export default function FamilyJoinPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const { data: invite, isLoading, error } = useFamilyInviteByToken(token);
  const acceptInvite = useAcceptFamilyInvite();

  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);

  function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    acceptInvite.mutate({ token, name }, { onSuccess: () => setJoined(true) });
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Missing invite token.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Skeleton className="h-64 w-full max-w-md rounded-xl" />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-2">
            <p className="text-sm text-destructive">{(error as Error)?.message ?? "This invite is invalid or has expired."}</p>
            <Button variant="outline" onClick={() => router.push("/")}>Go home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-bg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">LifeOS</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Join Family Space
          </h1>
          <p className="text-muted-foreground mt-2">
            {invite.inviterName} invited you as a <span className="text-foreground font-medium">{ROLE_LABELS[invite.role]}</span>
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{invite.email}</CardTitle>
          </CardHeader>
          <CardContent>
            {joined ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                <p className="text-sm text-muted-foreground">You've joined the family space.</p>
                <Button onClick={() => router.push("/login")}>Sign in to continue</Button>
              </div>
            ) : (
              <form onSubmit={handleAccept} className="space-y-4">
                <div className="space-y-1">
                  <Label>Your name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" required />
                </div>
                <Button type="submit" className="w-full" disabled={acceptInvite.isPending}>
                  {acceptInvite.isPending ? "Joining..." : "Accept invite"}
                </Button>
                {acceptInvite.error && (
                  <p className="text-xs text-destructive text-center">{(acceptInvite.error as Error).message}</p>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}