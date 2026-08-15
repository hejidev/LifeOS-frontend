"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ImageIcon, Sparkles, Upload, Download, Eraser, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaywallDialog } from "@/components/PaywallDialog";
import {
    useUploadImageForTools, useApplyImageTool, useBillingSummary, useConvertImageFormat, useGenerativeImageEdit,
} from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const TOOLS = [
    { key: "REMOVE_BACKGROUND", label: "Remove background" }, { key: "UPSCALE", label: "Upscale" },
    { key: "ENHANCE", label: "Auto enhance" }, { key: "GRAYSCALE", label: "Grayscale" }, { key: "SEPIA", label: "Sepia" },
];
const FORMATS = ["webp", "png", "jpg", "avif"];

export default function AIImageToolsPage() {
    const uploadImage = useUploadImageForTools();
    const applyTool = useApplyImageTool();
    const convertFormat = useConvertImageFormat();
    const generativeEdit = useGenerativeImageEdit();


    const { data: billing } = useBillingSummary();
    const [paywallOpen, setPaywallOpen] = useState(false);

    const [uploaded, setUploaded] = useState<{ publicId: string; url: string } | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [genPrompt, setGenPrompt] = useState("");
    const [genMode, setGenMode] = useState<"remove" | "fill">("remove");

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setResultUrl(null);
        uploadImage.mutate(file, { onSuccess: (data) => setUploaded(data) });
    }

    function runTool(tool: string) {
        if (!uploaded) return;
        applyTool.mutate({ publicId: uploaded.publicId, tool }, { onSuccess: (d) => setResultUrl(d.url) });
    }

    function runFormat(format: string) {
        if (!uploaded) return;
        convertFormat.mutate({ publicId: uploaded.publicId, format }, { onSuccess: (d) => setResultUrl(d.url) });
    }

    function runGenerative() {
        if (!uploaded || !genPrompt.trim()) return;
        setResultUrl(null);
        generativeEdit.mutate({ publicId: uploaded.publicId, prompt: genPrompt, mode: genMode }, { onSuccess: (d) => setResultUrl(d.url) });
    }

    const isBusy = applyTool.isPending || convertFormat.isPending || generativeEdit.isPending;

    useEffect(() => {
        if (applyTool.error?.message?.includes("free uses") || convertFormat.error?.message?.includes("free uses") || generativeEdit.error?.message?.includes("free uses")) {
            setPaywallOpen(true);
        }
    }, [applyTool.error, convertFormat.error, generativeEdit.error]);

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={item}>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><ImageIcon className="h-6 w-6 text-primary" /> AI Image Tools</h1>
                <p className="text-muted-foreground mt-1">Background removal, upscaling, generative edits, and format conversion.</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <motion.div variants={item} className="lg:col-span-2 space-y-4">
                    <Card className="hover:border-primary/20 transition-colors">
                        <CardContent className="pt-6">
                            {!uploaded ? (
                                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-16 cursor-pointer hover:border-primary/40 transition-colors">
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">{uploadImage.isPending ? "Uploading..." : "Click to upload an image"}</p>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                                </label>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground">Original</p>
                                        <img src={uploaded.url} alt="Original" className="w-full rounded-lg border border-border/60" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground">Result</p>
                                        <div className="w-full rounded-lg border border-border/60 min-h-37.5 flex items-center justify-center bg-card/40">
                                            {isBusy ? <p className="text-sm text-muted-foreground">Processing...</p> :
                                                resultUrl ? <img src={resultUrl} alt="Result" className="w-full rounded-lg" /> :
                                                    <p className="text-sm text-muted-foreground">Apply a tool to see the result</p>}
                                        </div>
                                        {resultUrl && (
                                            <Button size="sm" variant="outline" asChild>
                                                <a href={resultUrl} download target="_blank" rel="noopener noreferrer"><Download className="mr-1 h-3 w-3" /> Download</a>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {uploaded && (
                        <Card className="hover:border-primary/20 transition-colors">
                            <CardHeader className="pb-3"><CardTitle className="text-base">Quick tools</CardTitle></CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                {TOOLS.map((t) => (
                                    <Button key={t.key} size="sm" variant="outline" onClick={() => runTool(t.key)} disabled={isBusy}>{t.label}</Button>
                                ))}
                                {FORMATS.map((f) => (
                                    <Button key={f} size="sm" variant="outline" onClick={() => runFormat(f)} disabled={isBusy}>To {f.toUpperCase()}</Button>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </motion.div>

                <motion.div variants={item} className="space-y-4">
                    <Card className="border-primary/20 bg-primary/5 hover:border-primary/30 transition-colors">
                        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Wand2 className="h-4 w-4 text-primary" /> Generative edit</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex gap-2">
                                <Button size="sm" variant={genMode === "remove" ? "default" : "outline"} className="flex-1" onClick={() => setGenMode("remove")}><Eraser className="mr-1 h-3 w-3" /> Remove</Button>
                                <Button size="sm" variant={genMode === "fill" ? "default" : "outline"} className="flex-1" onClick={() => setGenMode("fill")}><Sparkles className="mr-1 h-3 w-3" /> Fill</Button>
                            </div>

                            {billing && !billing.isPaid && (
                                <p className="text-xs text-muted-foreground">
                                    {Math.max(0, billing.freeUsesPerTool - billing.usage.AI_WRITING)} free uses left
                                </p>
                            )}

                            <div className="space-y-1">
                                <Label className="text-xs">{genMode === "remove" ? "What to remove" : "What to generate"}</Label>
                                <Input placeholder={genMode === "remove" ? "e.g. the person in the background" : "e.g. a sunset sky"} value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)} />
                            </div>
                            <Button size="sm" className="w-full" onClick={runGenerative} disabled={!uploaded || isBusy || !genPrompt.trim()}>
                                {isBusy ? "Working..." : "Apply"}
                            </Button>
                            <p className="text-[11px] text-muted-foreground">Requires Cloudinary's Generative AI add-on to be enabled on your account.</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            <PaywallDialog open={paywallOpen} onOpenChange={setPaywallOpen} toolName="AI Writing" />
        </motion.div>
    );
}