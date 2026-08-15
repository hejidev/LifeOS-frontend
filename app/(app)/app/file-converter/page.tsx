"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileCog, Upload, Copy, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useConvertText, useExtractPdfText, useExtractDocxText, useConvertGenericFile,
} from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const TARGET_FORMATS = ["pdf", "docx", "jpg", "png", "mp3", "mp4", "xlsx", "pptx", "txt"];

export default function FileConverterPage() {
  const [tab, setTab] = useState<"quick" | "pdf" | "docx" | "universal">("quick");

  const convertText = useConvertText();
  const extractPdf = useExtractPdfText();
  const extractDocx = useExtractDocxText();
  const convertGeneric = useConvertGenericFile();

  const [textInput, setTextInput] = useState("");
  const [textFrom, setTextFrom] = useState("json");
  const [textTo, setTextTo] = useState("csv");
  const [textResult, setTextResult] = useState("");

  const [pdfResult, setPdfResult] = useState<{ text: string; pages: number } | null>(null);
  const [docxResult, setDocxResult] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState("pdf");
  const [conversionResult, setConversionResult] = useState<{ url: string; filename: string } | null>(null);

  function handleTextConvert() {
    convertText.mutate({ content: textInput, from: textFrom, to: textTo }, { onSuccess: setTextResult });
  }

  function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    extractPdf.mutate(file, { onSuccess: setPdfResult });
  }

  function handleDocxUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    extractDocx.mutate(file, { onSuccess: (d) => setDocxResult(d.text) });
  }

  function handleUniversalUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setConversionResult(null);
    convertGeneric.mutate({ file, targetFormat }, { onSuccess: setConversionResult });
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><FileCog className="h-6 w-6 text-primary" /> File Converter</h1>
          <p className="text-muted-foreground mt-1">Convert between formats — instant for text, universal for everything else.</p>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="quick">JSON/CSV/YAML</TabsTrigger>
            <TabsTrigger value="pdf">PDF → Text</TabsTrigger>
            <TabsTrigger value="docx">DOCX → Text</TabsTrigger>
            <TabsTrigger value="universal">Universal</TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {tab === "quick" && (
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-3 flex items-center gap-2">
              <select className="h-9 rounded-lg border border-input bg-background px-2 text-sm" value={textFrom} onChange={(e) => setTextFrom(e.target.value)}>
                {["json", "csv", "yaml"].map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
              </select>
              <span className="text-muted-foreground text-sm">→</span>
              <select className="h-9 rounded-lg border border-input bg-background px-2 text-sm" value={textTo} onChange={(e) => setTextTo(e.target.value)}>
                {["json", "csv", "yaml"].map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
              </select>
              <Button size="sm" className="ml-auto" onClick={handleTextConvert} disabled={convertText.isPending || !textInput.trim()}>
                {convertText.isPending ? "Converting..." : "Convert"}
              </Button>
            </CardHeader>
            <CardContent>
              <Textarea rows={12} placeholder="Paste your data here..." value={textInput} onChange={(e) => setTextInput(e.target.value)} className="font-mono text-xs" />
              {convertText.isError && <p className="text-xs text-destructive mt-2">{(convertText.error as Error).message}</p>}
            </CardContent>
          </Card>
          <Card className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-base">Result</CardTitle>
              {textResult && <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(textResult)}><Copy className="mr-1 h-3 w-3" /> Copy</Button>}
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono whitespace-pre-wrap rounded-lg border border-border/60 bg-card/60 p-3 min-h-[280px]">{textResult}</pre>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === "pdf" && (
        <motion.div variants={item}>
          <Card className="hover:border-primary/20 transition-colors">
            <CardContent className="pt-6 space-y-4">
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-10 cursor-pointer hover:border-primary/40 transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{extractPdf.isPending ? "Extracting..." : "Upload a PDF"}</p>
                <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
              </label>
              {pdfResult && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{pdfResult.pages} pages extracted</p>
                  <pre className="text-xs font-mono whitespace-pre-wrap rounded-lg border border-border/60 bg-card/60 p-3 max-h-[400px] overflow-auto">{pdfResult.text}</pre>
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(pdfResult.text)}><Copy className="mr-1 h-3 w-3" /> Copy text</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === "docx" && (
        <motion.div variants={item}>
          <Card className="hover:border-primary/20 transition-colors">
            <CardContent className="pt-6 space-y-4">
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-10 cursor-pointer hover:border-primary/40 transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{extractDocx.isPending ? "Extracting..." : "Upload a DOCX file"}</p>
                <input type="file" accept=".docx" className="hidden" onChange={handleDocxUpload} />
              </label>
              {docxResult && (
                <div className="space-y-2">
                  <pre className="text-xs font-mono whitespace-pre-wrap rounded-lg border border-border/60 bg-card/60 p-3 max-h-[400px] overflow-auto">{docxResult}</pre>
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(docxResult)}><Copy className="mr-1 h-3 w-3" /> Copy text</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === "universal" && (
        <motion.div variants={item}>
          <Card className="hover:border-primary/20 transition-colors">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Convert to:</span>
                <select className="h-9 rounded-lg border border-input bg-background px-2 text-sm" value={targetFormat} onChange={(e) => setTargetFormat(e.target.value)}>
                  {TARGET_FORMATS.map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                </select>
              </div>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-10 cursor-pointer hover:border-primary/40 transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{convertGeneric.isPending ? "Converting — this can take up to 45s..." : "Upload any file"}</p>
                <input type="file" className="hidden" onChange={handleUniversalUpload} />
              </label>
              {convertGeneric.isError && <p className="text-xs text-destructive">{(convertGeneric.error as Error).message}</p>}
              {conversionResult && (
                <Button size="sm" asChild>
                  <a href={conversionResult.url} download target="_blank" rel="noopener noreferrer"><Download className="mr-1 h-3 w-3" /> Download {conversionResult.filename}</a>
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}