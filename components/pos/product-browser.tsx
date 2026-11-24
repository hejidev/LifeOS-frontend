"use client";

import { useMemo, useState } from "react";
import type { RefObject } from "react";
import { Camera, LayoutGrid, List, Package, Plus, ScanLine, Search, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/components/merchant/ops-ui";
import { initials, matchProduct, tileBackground } from "@/lib/pos/helpers";
import type { Prefs, Product } from "@/lib/pos/helpers";
import { cn } from "@/lib/utils";

interface Props {
  products: Product[];
  currency: string;
  quantities: Map<string, number>;
  pins: string[];
  query: string;
  prefs: Prefs;
  inputRef: RefObject<HTMLInputElement | null>;
  onQuery: (value: string) => void;
  onSubmit: () => void;
  onAdd: (product: Product) => void;
  onPin: (id: string) => void;
  onPrefs: (prefs: Prefs) => void;
  onCamera: () => void;
}

function StockBar({ product }: { product: Product }) {
  const percent = Math.min(100, Math.round((product.stock / Math.max(product.lowStockAt * 4, 8)) * 100));
  const tint = product.stock <= 0 ? "bg-red-400" : product.stock <= product.lowStockAt ? "bg-amber-400" : "bg-emerald-400/70";
  return (
    <div className="h-1 overflow-hidden rounded-full bg-white/10">
      <div className={cn("h-full rounded-full", tint)} style={{ width: `${product.stock <= 0 ? 0 : Math.max(8, percent)}%` }} />
    </div>
  );
}

function Thumb({ product, className }: { product: Product; className?: string }) {
  if (product.imageUrl) return <img src={product.imageUrl} alt="" className={cn("object-cover", className)} />;
  return (
    <div className={cn("flex items-center justify-center font-bold text-white/80", className)} style={{ background: tileBackground(product.name) }}>
      {initials(product.name)}
    </div>
  );
}

function PinButton({ pinned, onClick, className }: { pinned: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={pinned ? "Remove from quick access" : "Pin to quick access"}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full bg-black/45 backdrop-blur transition",
        pinned ? "text-amber-300" : "text-white/70 opacity-0 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100",
        className
      )}
    >
      <Star className={cn("h-3.5 w-3.5", pinned && "fill-current")} />
    </button>
  );
}

export function ProductBrowser({ products, currency, quantities, pins, query, prefs, inputRef, onQuery, onSubmit, onAdd, onPin, onPrefs, onCamera }: Props) {
  const [category, setCategory] = useState("all");
  const pinned = useMemo(() => new Set(pins), [pins]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((product) => product.category && counts.set(product.category, (counts.get(product.category) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);

  const active = category === "all" || (category === "pinned" && pins.length > 0) || categories.some(([name]) => name === category) ? category : "all";

  const list = useMemo(() => {
    const rows = products.filter((product) => {
      if (active === "pinned" && !pinned.has(product.id)) return false;
      if (active !== "all" && active !== "pinned" && product.category !== active) return false;
      return matchProduct(product, query);
    });
    const order =
      prefs.sort === "price" ? (a: Product, b: Product) => b.price - a.price : prefs.sort === "stock" ? (a: Product, b: Product) => a.stock - b.stock : (a: Product, b: Product) => a.name.localeCompare(b.name);
    return rows.sort(order);
  }, [products, active, pinned, query, prefs.sort]);

  const quick = useMemo(() => products.filter((product) => pinned.has(product.id) && product.stock > 0).slice(0, 10), [products, pinned]);
  const compact = prefs.density === "compact";

  const chip = (selected: boolean) =>
    cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors", selected ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-white/55 hover:bg-white/[0.06]");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-3 border-b border-white/[0.06] px-3 py-3 sm:px-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSubmit();
                }
                if (event.key === "Escape") onQuery("");
              }}
              placeholder="Search, scan or type a barcode"
              className="h-12 rounded-xl border-white/10 bg-white/[0.05] pl-12 pr-24 text-base text-white placeholder:text-white/30 focus-visible:ring-emerald-400/40"
            />
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
              {query ? (
                <button type="button" aria-label="Clear search" onClick={() => onQuery("")} className="text-white/40 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="hidden rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-white/40 sm:block">F2</kbd>
              )}
              <ScanLine className="h-4 w-4 text-emerald-400/70" />
            </div>
          </div>
          <Button variant="outline" size="icon" aria-label="Scan with camera" onClick={onCamera} className="h-12 w-12 shrink-0 rounded-xl border-white/10 bg-white/5 hover:bg-white/10">
            <Camera className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="-mx-3 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:px-0">
            <button type="button" className={chip(active === "all")} onClick={() => setCategory("all")}>All <span className="opacity-60">{products.length}</span></button>
            {pins.length > 0 ? (
              <button type="button" className={chip(active === "pinned")} onClick={() => setCategory("pinned")}>
                <Star className="mr-1 inline h-3 w-3 fill-current" />Pinned
              </button>
            ) : null}
            {categories.map(([name, count]) => (
              <button key={name} type="button" className={cn(chip(active === name), "capitalize")} onClick={() => setCategory(name)}>
                {name} <span className="opacity-60">{count}</span>
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <select
              aria-label="Sort products"
              value={prefs.sort}
              onChange={(event) => onPrefs({ ...prefs, sort: event.target.value as Prefs["sort"] })}
              className="hidden h-8 rounded-lg border border-white/10 bg-white/[0.05] px-2 text-xs text-white/70 sm:block"
            >
              <option value="name" className="bg-[#0F1420]">A to Z</option>
              <option value="price" className="bg-[#0F1420]">Price, high first</option>
              <option value="stock" className="bg-[#0F1420]">Low stock first</option>
            </select>
            <button type="button" aria-label="Toggle density" onClick={() => onPrefs({ ...prefs, density: compact ? "cozy" : "compact" })} className={cn("hidden h-8 rounded-lg border px-2.5 text-xs sm:block", compact ? "border-emerald-400/40 text-emerald-300" : "border-white/10 text-white/60")}>
              Compact
            </button>
            <div className="flex rounded-lg border border-white/10 p-0.5">
              {([["grid", LayoutGrid], ["list", List]] as const).map(([view, Icon]) => (
                <button key={view} type="button" aria-label={`${view} view`} onClick={() => onPrefs({ ...prefs, view })} className={cn("flex h-7 w-7 items-center justify-center rounded-md", prefs.view === view ? "bg-white/15 text-white" : "text-white/45 hover:text-white")}>
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {quick.length > 0 && !query && active === "all" ? (
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:px-0">
            {quick.map((product) => (
              <button key={product.id} type="button" onClick={() => onAdd(product)} className="flex shrink-0 items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.07] py-1 pl-1 pr-3 text-xs hover:bg-amber-300/15">
                <Thumb product={product} className="h-6 w-6 rounded-full text-[9px]" />
                <span className="max-w-28 truncate font-medium">{product.name}</span>
                <span className="font-mono text-amber-200/80">{money(currency, product.price)}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
        {products.length === 0 ? (
          <div className="py-24 text-center"><Package className="mx-auto mb-3 h-12 w-12 text-white/10" /><p className="text-white/40">No products at this location yet.</p></div>
        ) : list.length === 0 ? (
          <div className="py-24 text-center"><Search className="mx-auto mb-3 h-12 w-12 text-white/10" /><p className="text-white/40">{active === "pinned" ? "Nothing pinned yet. Tap the star on a product." : `Nothing matches "${query}".`}</p></div>
        ) : prefs.view === "list" ? (
          <div className="space-y-1.5">
            {list.map((product) => {
              const inCart = quantities.get(product.id) ?? 0;
              const out = product.stock <= 0;
              return (
                <div
                  key={product.id}
                  role="button"
                  tabIndex={out ? -1 : 0}
                  aria-disabled={out}
                  onClick={() => !out && onAdd(product)}
                  onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && !out && (event.preventDefault(), onAdd(product))}
                  className={cn("group flex items-center gap-3 rounded-xl border bg-white/[0.03] px-3 py-2 transition", inCart > 0 ? "border-emerald-400/40" : "border-white/[0.07] hover:border-emerald-400/25 hover:bg-white/[0.06]", out && "pointer-events-none opacity-35")}
                >
                  <Thumb product={product} className="h-10 w-10 shrink-0 rounded-lg text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className={cn("text-[11px]", out ? "text-red-400" : product.stock <= product.lowStockAt ? "text-amber-400" : "text-white/40")}>
                      {out ? "Out of stock" : `${product.stock} left`}{product.sku ? ` · ${product.sku}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">{money(currency, product.price)}</span>
                  <PinButton pinned={pinned.has(product.id)} onClick={() => onPin(product.id)} />
                  {inCart > 0 ? (
                    <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-emerald-400 px-2 text-xs font-bold text-[#0B0F1A]">{inCart}</span>
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10"><Plus className="h-4 w-4" /></span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={cn("grid gap-2.5 sm:gap-3", compact ? "grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5")}>
            {list.map((product) => {
              const inCart = quantities.get(product.id) ?? 0;
              const out = product.stock <= 0;
              return (
                <div
                  key={product.id}
                  role="button"
                  tabIndex={out ? -1 : 0}
                  aria-disabled={out}
                  onClick={() => !out && onAdd(product)}
                  onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && !out && (event.preventDefault(), onAdd(product))}
                  className={cn("group relative flex flex-col overflow-hidden rounded-2xl border bg-white/[0.03] text-left transition active:scale-[0.97]", inCart > 0 ? "border-emerald-400/50 shadow-[0_0_0_1px_rgba(52,211,153,0.15)]" : "border-white/[0.07] hover:border-emerald-400/30 hover:bg-white/[0.06]", out && "pointer-events-none opacity-35")}
                >
                  <div className={cn("relative w-full", compact ? "h-16" : "h-24 sm:h-28")}>
                    <Thumb product={product} className={cn("h-full w-full", compact ? "text-lg" : "text-3xl")} />
                    <PinButton pinned={pinned.has(product.id)} onClick={() => onPin(product.id)} className="absolute left-2 top-2" />
                    {inCart > 0 ? <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-400 px-1.5 text-xs font-bold text-[#0B0F1A] shadow">{inCart}</span> : null}
                    {out ? <span className="absolute inset-x-0 bottom-0 bg-red-500/80 py-0.5 text-center text-[10px] font-semibold">OUT OF STOCK</span> : null}
                  </div>
                  <div className={cn("flex flex-1 flex-col gap-1.5", compact ? "p-2" : "p-3")}>
                    <p className={cn("line-clamp-2 font-medium leading-tight", compact ? "text-xs" : "text-sm")}>{product.name}</p>
                    <div className="mt-auto space-y-1.5">
                      <p className={cn("font-mono font-bold tabular-nums", compact ? "text-xs" : "text-base")}>{money(currency, product.price)}</p>
                      <StockBar product={product} />
                      {!compact ? <p className={cn("text-[11px]", out ? "text-red-400" : product.stock <= product.lowStockAt ? "text-amber-400" : "text-white/35")}>{out ? "Out of stock" : `${product.stock} left`}</p> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}