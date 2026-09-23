"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileSpreadsheet, Check, X, AlertCircle, Download, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBulkImportProducts } from "@/lib/hooks/use-life-data";
import { parseCSV, generateProductTemplate, validateProduct } from "@/lib/utils/csv-parser";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

interface BulkProductImportProps {
  open: boolean;
  onClose: () => void;
}

export function BulkProductImport({ open, onClose }: BulkProductImportProps) {
  const bulkImport = useBulkImportProducts();
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedProducts, setParsedProducts] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith(".csv")) {
      setCsvError("Please upload a CSV file");
      return;
    }

    setFile(selectedFile);
    setCsvError(null);

    try {
      const text = await selectedFile.text();
      const parseResult = parseCSV(text);
      
      if (parseResult.errors.length > 0) {
        setCsvError(`CSV parsing errors: ${parseResult.errors.join(', ')}`);
        return;
      }
      
      if (parseResult.data.length === 0) {
        setCsvError("No products found in file");
        return;
      }

      // Validate each product
      const validProducts = parseResult.data.filter(product => {
        const validation = validateProduct(product);
        return validation.isValid;
      });

      if (validProducts.length === 0) {
        setCsvError("No valid products found in file. Please check the format.");
        return;
      }

      setParsedProducts(validProducts);
      setStep("preview");
    } catch (error) {
      setCsvError("Failed to parse CSV file. Please check the format.");
    }
  };

  const handleImport = () => {
    bulkImport.mutate(parsedProducts, {
      onSuccess: (result) => {
        setImportResult(result);
        setStep("result");
      },
    });
  };

  const handleReset = () => {
    setFile(null);
    setParsedProducts([]);
    setImportResult(null);
    setCsvError(null);
    setStep("upload");
  };

  const downloadTemplate = () => {
    const template = generateProductTemplate();
    
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Products</DialogTitle>
        </DialogHeader>

        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          {step === "upload" && (
            <motion.div variants={item} className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Import multiple products at once using a CSV file
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              </div>

              <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/40 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="bulk-import-file"
                />
                <label htmlFor="bulk-import-file" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileSpreadsheet className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Click to upload CSV file</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Supports .csv files up to 5MB
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {csvError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {csvError}
                </div>
              )}

              {file && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      setCsvError(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {step === "preview" && (
            <motion.div variants={item} className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Found {parsedProducts.length} products to import
                </p>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left font-medium">Name</th>
                      <th className="p-2 text-left font-medium">Price</th>
                      <th className="p-2 text-left font-medium">Stock</th>
                      <th className="p-2 text-left font-medium">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedProducts.slice(0, 50).map((product, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{product.name || "—"}</td>
                        <td className="p-2">{product.price || "—"}</td>
                        <td className="p-2">{product.stock || "0"}</td>
                        <td className="p-2">{product.category || "—"}</td>
                      </tr>
                    ))}
                    {parsedProducts.length > 50 && (
                      <tr>
                        <td colSpan={4} className="p-2 text-center text-muted-foreground">
                          ... and {parsedProducts.length - 50} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleReset}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={bulkImport.isPending}
                  className="gap-2"
                >
                  {bulkImport.isPending ? "Importing..." : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import {parsedProducts.length} Products
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {step === "result" && (
            <motion.div variants={item} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-emerald-500/10 border-emerald-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-emerald-700">
                          {importResult?.successful || 0}
                        </p>
                        <p className="text-sm text-emerald-600">Successfully imported</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-destructive/10 border-destructive/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                        <X className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-destructive">
                          {importResult?.failed || 0}
                        </p>
                        <p className="text-sm text-destructive">Failed to import</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {importResult?.errors && importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Import Errors:</p>
                  <div className="border rounded-lg max-h-40 overflow-y-auto">
                    {importResult.errors.map((error: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 border-b last:border-b-0 text-sm"
                      >
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="flex-1">
                          Row {error.row}: {error.name} - {error.error}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleReset}>
                  Import More
                </Button>
                <Button onClick={onClose}>
                  <ChevronRight className="h-4 w-4 mr-1" />
                  Done
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}