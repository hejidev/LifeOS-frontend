export type Method = "CASH" | "CARD" | "TRANSFER" | "MOBILE_MONEY" | "LATER";
export type DiscountMode = "amount" | "percent";

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  lowStockAt: number;
  imageUrl?: string;
  barcode?: string;
  sku?: string;
  category?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  loyaltyPoints?: number;
  balance?: number;
}

export interface Line {
  productId: string;
  name: string;
  unitPrice: number;
  listPrice: number;
  quantity: number;
}

export interface Draft {
  lines: Line[];
  customerId: string;
  discountMode: DiscountMode;
  discountValue: string;
  note: string;
}

export interface Held {
  id: number;
  label: string;
  at: number;
  draft: Draft;
}

export interface Prefs {
  view: "grid" | "list";
  density: "cozy" | "compact";
  sort: "name" | "price" | "stock";
  sound: boolean;
}

export const EMPTY_DRAFT: Draft = { lines: [], customerId: "", discountMode: "amount", discountValue: "", note: "" };
export const DEFAULT_PREFS: Prefs = { view: "grid", density: "cozy", sort: "name", sound: true };

export const METHOD_NAMES: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  TRANSFER: "Transfer",
  MOBILE_MONEY: "Mobile money",
  LATER: "Pay later",
};

export const matchProduct = (product: Product, query: string) => {
  const needle = query.trim().toLowerCase();
  return !needle || product.name.toLowerCase().includes(needle) || (product.sku ?? "").toLowerCase().includes(needle) || (product.barcode ?? "").toLowerCase().includes(needle);
};

export const linesSubtotal = (lines: Line[]) => lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

export function discountAmount(draft: Draft, subtotal: number) {
  const raw = Number(draft.discountValue.replace(/,/g, ""));
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  const value = draft.discountMode === "percent" ? (subtotal * Math.min(raw, 100)) / 100 : raw;
  return Math.min(subtotal, Math.round(value * 100) / 100);
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

export function tileBackground(name: string) {
  let hue = 0;
  for (const char of name) hue = (hue * 31 + char.charCodeAt(0)) % 360;
  return `linear-gradient(135deg, hsl(${hue} 55% 32%), hsl(${(hue + 40) % 360} 60% 22%))`;
}

let audio: AudioContext | null = null;

export function tone(kind: "ok" | "error" | "done") {
  try {
    const Context = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audio = audio ?? new Context();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.frequency.value = kind === "ok" ? 880 : kind === "done" ? 1200 : 220;
    gain.gain.value = 0.05;
    oscillator.start();
    oscillator.stop(audio.currentTime + (kind === "error" ? 0.22 : 0.08));
    if (kind === "error" && navigator.vibrate) navigator.vibrate(60);
  } catch {}
}

export function receiptText(sale: any, business: string, currency: string, cashReceived?: number) {
  const width = 42;
  const row = (left: string, right: string) => `${left}${" ".repeat(Math.max(1, width - left.length - right.length))}${right}`;
  const fmt = (value: number) => `${currency} ${Number(value).toLocaleString()}`;
  const unpaid = sale.status === "PENDING";

  return [
    business,
    `Receipt ${sale.receiptNumber}`,
    new Date(sale.createdAt).toLocaleString(),
    `Customer: ${sale.customerName ?? "Walk-in"}`,
    "-".repeat(width),
    ...sale.items.flatMap((item: any) => [item.name, row(`  ${item.quantity} x ${fmt(item.unitPrice)}`, fmt(item.lineTotal))]),
    "-".repeat(width),
    ...(sale.discount > 0 ? [row("Subtotal", fmt(sale.subtotal)), row("Discount", `-${fmt(sale.discount)}`)] : []),
    row("Total", fmt(sale.total)),
    "",
    ...(unpaid
      ? [row("Paid so far", fmt(sale.amountPaid ?? 0)), row("Balance due", fmt(sale.balance ?? sale.total)), "Status: UNPAID"]
      : [`Payment: ${METHOD_NAMES[sale.paymentMethod] ?? sale.paymentMethod}`]),
    ...(!unpaid && cashReceived !== undefined ? [row("Cash received", fmt(cashReceived)), row("Change", fmt(Math.max(0, cashReceived - sale.total)))] : []),
    "",
    "Thank you for your business!",
  ].join("\n");
}

export function saveReceipt(text: string, number: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `receipt-${number}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}