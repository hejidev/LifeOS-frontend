"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LifeBuoy, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useConversations, useMessages, useSendMessage, useLiveMessages } from "@/lib/hooks/use-messages";
import { useContactSupport } from "@/lib/hooks/use-messages";

export default function ContactPage() {
  const { data: conversations = [] } = useConversations();
  const contactSupport = useContactSupport();
  const sendMessage = useSendMessage();
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");

  const supportConvo = (conversations as any[])[0];
  const { data: messages = [] } = useMessages(supportConvo?.id ?? null);
  useLiveMessages(supportConvo?.id ?? null);

  function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    contactSupport.mutate(message, { onSuccess: () => setMessage("") });
  }

  function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!supportConvo || !reply.trim()) return;
    sendMessage.mutate({ conversationId: supportConvo.id, body: reply }, { onSuccess: () => setReply("") });
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-8xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><LifeBuoy className="h-5 w-5 text-primary" /> Contact support</h1>
        <p className="text-muted-foreground text-sm mt-1">Reach out to our team — we'll reply here.</p>
      </div>

      {supportConvo ? (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="max-h-80 overflow-y-auto space-y-2">
              {(messages as any[]).map((m) => (
                <div key={m.id} className={cn("max-w-[80%] rounded-lg px-3 py-2 text-sm", m.senderId === supportConvo.participant.id ? "bg-muted/40" : "bg-primary text-primary-foreground ml-auto")}>
                  {m.body}
                </div>
              ))}
            </div>
            <form onSubmit={handleReply} className="flex gap-2">
              <Textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply..." className="flex-1" />
              <Button type="submit" size="icon" disabled={sendMessage.isPending}><Send className="h-4 w-4" /></Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleStart} className="space-y-3">
              <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What can we help with?" required />
              <Button type="submit" className="w-full" disabled={contactSupport.isPending}>{contactSupport.isPending ? "Sending..." : "Send message"}</Button>
              {contactSupport.isError && <p className="text-xs text-destructive text-center">{(contactSupport.error as Error).message}</p>}
            </form>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}