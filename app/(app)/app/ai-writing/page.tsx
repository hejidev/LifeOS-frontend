"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PenTool, Sparkles, Copy, Save, FileText, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { PaywallDialog } from "@/components/PaywallDialog";
import {
    useStreamWriting, useWritingDocuments, useBillingSummary, useSaveWritingDocument, useDeleteWritingDocument, useConvertWritingToNote,
} from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const MODES = [
    { key: "GENERATE", label: "Generate" }, { key: "REWRITE", label: "Rewrite" },
    { key: "IMPROVE", label: "Fix grammar" }, { key: "SHORTEN", label: "Shorten" },
    { key: "EXPAND", label: "Expand" }, { key: "SUMMARIZE", label: "Summarize" },
    { key: "TRANSLATE", label: "Translate" }, { key: "TONE_CHANGE", label: "Change tone" },
];
const TONES = ["Professional", "Casual", "Friendly", "Persuasive", "Confident", "Formal"];
const LANGUAGES = ["Spanish", "French", "German", "Portuguese", "Italian", "Japanese", "Chinese", "Arabic"];

export default function AIWritingPage() {
    const { output, isStreaming, error, generate, reset } = useStreamWriting();
    const { data: documents = [] } = useWritingDocuments();
    const saveDoc = useSaveWritingDocument();
    const deleteDoc = useDeleteWritingDocument();
    const convertToNote = useConvertWritingToNote();

    const { data: billing } = useBillingSummary();
    const [paywallOpen, setPaywallOpen] = useState(false);

    const [mode, setMode] = useState("GENERATE");
    const [input, setInput] = useState("");
    const [tone, setTone] = useState(TONES[0]);
    const [language, setLanguage] = useState(LANGUAGES[0]);
    const [saveOpen, setSaveOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [savedMsg, setSavedMsg] = useState<string | null>(null);

    function handleGenerate() {
        if (!input.trim()) return;
        reset();
        generate({ mode, input, tone: mode === "TONE_CHANGE" ? tone : undefined, targetLanguage: mode === "TRANSLATE" ? language : undefined })
            .catch(() => { });
    }

    function handleSave() {
        saveDoc.mutate(
            { title: title || input.slice(0, 40), mode, input, output, tone: mode === "TONE_CHANGE" ? tone : undefined },
            { onSuccess: () => { setSaveOpen(false); setTitle(""); } }
        );
    }

    function handleSendToNotes(id: string) {
        convertToNote.mutate(id, { onSuccess: () => setSavedMsg("Added to Notes") });
        setTimeout(() => setSavedMsg(null), 2000);
    }

    const wordCount = output.trim() ? output.trim().split(/\s+/).length : 0;

    useEffect(() => {
        if (error?.includes("free uses")) setPaywallOpen(true);
    }, [error]);

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={item}>
                <h1 className="text-xl sm:text-3xl font-bold tracking-tight flex items-center gap-2"><PenTool className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> AI Writing</h1>
                <p className="text-muted-foreground mt-1 text-xs sm:text-sm">Generate, rewrite, and polish text — streamed live from Claude.</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                <motion.div variants={item} className="lg:col-span-2 space-y-4">
                    <Card className="hover:border-primary/20 transition-colors">
                        <CardHeader className="pb-3">
                            <div className="flex flex-wrap gap-1">
                                {MODES.map((m) => (
                                    <Button key={m.key} type="button" size="sm" variant={mode === m.key ? "default" : "outline"} onClick={() => setMode(m.key)} className="text-[10px] sm:text-xs h-7 sm:h-8">
                                        {m.label}
                                    </Button>
                                ))}

                                {billing && !billing.isPaid && (
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                                        {Math.max(0, billing.freeUsesPerTool - billing.usage.AI_WRITING)} free uses left
                                    </p>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {mode === "TONE_CHANGE" && (
                                <select className="flex h-8 sm:h-9 w-full rounded-lg border border-input bg-background px-3 text-xs sm:text-sm" value={tone} onChange={(e) => setTone(e.target.value)}>
                                    {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            )}
                            {mode === "TRANSLATE" && (
                                <select className="flex h-8 sm:h-9 w-full rounded-lg border border-input bg-background px-3 text-xs sm:text-sm" value={language} onChange={(e) => setLanguage(e.target.value)}>
                                    {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                                </select>
                            )}
                            <Textarea rows={4} placeholder="Paste or write your text here..." value={input} onChange={(e) => setInput(e.target.value)} className="text-xs sm:text-sm" />
                            <Button onClick={handleGenerate} disabled={isStreaming || !input.trim()} className="text-xs sm:text-sm">
                                {isStreaming ? <><Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> Generating...</> : <><Sparkles className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Generate</>}
                            </Button>
                            {error && <p className="text-[10px] sm:text-xs text-destructive">{error}</p>}
                        </CardContent>
                    </Card>

                    {(output || isStreaming) && (
                        <Card className="hover:border-primary/20 transition-colors">
                            <CardHeader className="pb-3 flex items-center justify-between">
                                <CardTitle className="text-sm sm:text-base">Output</CardTitle>
                                <Badge variant="secondary" className="text-[10px] sm:text-[11px]">{wordCount} words</Badge>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="whitespace-pre-wrap text-xs sm:text-sm rounded-lg border border-border/60 bg-card/60 p-3 sm:p-4 min-h-[80px] sm:min-h-[100px]">
                                    {output}{isStreaming && <span className="inline-block w-1.5 h-3 sm:h-4 bg-primary ml-0.5 animate-pulse" />}
                                </div>
                                {!isStreaming && output && (
                                    <div className="flex gap-2 flex-wrap">
                                        <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(output)} className="text-xs sm:text-sm"><Copy className="mr-1 h-3 w-3" /> Copy</Button>
                                        <Button size="sm" variant="outline" onClick={() => setSaveOpen(true)} className="text-xs sm:text-sm"><Save className="mr-1 h-3 w-3" /> Save</Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </motion.div>

                <motion.div variants={item}>
                    <Card className="hover:border-primary/20 transition-colors">
                        <CardHeader className="pb-3"><CardTitle className="text-sm sm:text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> History</CardTitle></CardHeader>
                        <CardContent>
                            {documents.length === 0 ? (
                                <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No saved documents yet.</p>
                            ) : (
                                <ScrollArea className="max-h-[400px] sm:max-h-[500px]">
                                    <div className="space-y-2">
                                        {documents.map((d: any) => (
                                            <div key={d.id} className="rounded-lg border border-border/60 bg-card/60 p-2 sm:p-3 space-y-1">
                                                <p className="text-xs sm:text-sm font-medium truncate">{d.title}</p>
                                                <p className="text-[10px] sm:text-[11px] text-muted-foreground">{d.mode.replace("_", " ").toLowerCase()} · {new Date(d.createdAt).toLocaleDateString()}</p>
                                                <div className="flex gap-1 pt-1">
                                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] sm:text-[11px]" onClick={() => handleSendToNotes(d.id)}>To Notes</Button>
                                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive ml-auto" onClick={() => deleteDoc.mutate(d.id)}><Trash2 className="h-3 w-3" /></Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                            {savedMsg && <p className="text-[10px] sm:text-xs text-emerald-500 mt-2">{savedMsg}</p>}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Save document</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                        <Input placeholder="Document title" value={title} onChange={(e) => setTitle(e.target.value)} />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={saveDoc.isPending}>{saveDoc.isPending ? "Saving..." : "Save"}</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <PaywallDialog open={paywallOpen} onOpenChange={setPaywallOpen} toolName="AI Writing" />
        </motion.div>
    );
}