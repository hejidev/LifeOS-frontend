"use client";

import { useMemo, useState } from "react";
import { Package, Receipt, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AttachmentRef, PickItem } from "@/lib/hooks/use-chat";

export interface AttachPickers {
  products: PickItem[];
  sales?: PickItem[];
}

interface AttachPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickers: AttachPickers;
  onPick: (ref: AttachmentRef, label: string) => void;
}

const LIMIT = 50;

export function AttachPicker({ open, onOpenChange, pickers, onPick }: AttachPickerProps) {
  const [tab, setTab] = useState<"PRODUCT" | "SALE">("PRODUCT");
  const [query, setQuery] = useState("");

  const items = tab === "PRODUCT" ? pickers.products : pickers.sales ?? [];
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? items.filter((item) => item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q)) : items;
    return list.slice(0, LIMIT);
  }, [items, query]);

  function handleOpenChange(next: boolean) {
    if (next) setQuery("");
    onOpenChange(next);
  }

  const Icon = tab === "PRODUCT" ? Package : Receipt;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-md flex-col gap-3">
        <DialogHeader>
          <DialogTitle>Attach to message</DialogTitle>
        </DialogHeader>

        {pickers.sales ? (
          <Tabs value={tab} onValueChange={(value) => setTab(value as "PRODUCT" | "SALE")}>
            <TabsList>
              <TabsTrigger value="PRODUCT">Products</TabsTrigger>
              <TabsTrigger value="SALE">Sales</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "PRODUCT" ? "Search products" : "Search receipts"} className="pl-9" />
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {shown.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{tab === "SALE" ? "No recent sales to share." : "Nothing matches."}</p>
          ) : (
            shown.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onPick({ type: tab, id: item.id }, item.title);
                  onOpenChange(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}