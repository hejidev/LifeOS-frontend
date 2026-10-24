export type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "MOBILE_MONEY";

export interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  price: number;
  stock: number;
  lowStockAt: number;
  imageUrl?: string;
  active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  loyaltyPoints: number;
  totalSpent: number;
  orderCount: number;
}

export interface LoyaltyConfig {
  enabled: boolean;
  redemptionValue: number;
  earnRate: number;
}

export interface StaffProfile {
  id: string;
  name: string;
  role: string;
}

export interface StaffMe {
  staff: StaffProfile;
  businessName?: string;
  storeName?: string;
  currency?: string;
  permissions?: string[];
  loyalty?: LoyaltyConfig;
  scope?: { bizProfileId: string; storeId: string };
}

export interface CachedSession {
  me: StaffMe;
  savedAt: number;
}

export interface SaleItemRecord {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SaleRecord {
  id: string;
  receiptNumber: string;
  customerName?: string;
  items: SaleItemRecord[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: string;
  createdAt: string;
  pending?: boolean;
}

export interface SalePayload {
  clientRequestId: string;
  receiptNumber: string;
  soldAt: string;
  offline: true;
  staffId: string;
  customerId?: string;
  items: { productId: string; name: string; unitPrice: number; quantity: number }[];
  paymentMethod: PaymentMethod;
  status: "PAID";
}

export interface QueuedSale {
  id: string;
  scope: string;
  staffId: string;
  soldAt: string;
  status: "pending" | "failed";
  attempts: number;
  lastError: string | null;
  payload: SalePayload;
  sale: SaleRecord;
}