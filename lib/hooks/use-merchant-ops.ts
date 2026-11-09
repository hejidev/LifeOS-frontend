"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useStoreContext } from "@/lib/context/store-context";

export type Range = "today" | "week" | "month";

export interface SaleItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  customerId?: string;
  customerName?: string;
  storeName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  balance: number;
  paymentMethod: string;
  status: string;
  note?: string;
  soldOffline?: boolean;
  needsReview?: boolean;
  reviewNotes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  amount: number;
  method: string;
  kind: string;
  actorName: string;
  createdAt: string;
}

export interface Overview {
  businessName: string;
  currency: string;
  metrics: { id: string; label: string; value: string; change?: string }[];
  recentActivity: { id: string; title: string; type: "order" | "expense"; amount: number; currency: string; date: string; status?: string }[];
  topProducts: { name: string; units: number; revenue: number }[];
  lowStockCount: number;
  lowStockProducts: { id: string; name: string; stock: number; lowStockAt: number; storeName?: string }[];
  insight: string;
}

export interface Attention {
  lowStock: number;
  needsReview: number;
  owedCount: number;
  owedTotal: number;
  unreadNotifications: number;
  unreadChat: number;
}

export interface DailyReport {
  date: string;
  currency: string;
  summary: {
    revenue: number;
    orders: number;
    avgOrderValue: number;
    discounts: number;
    refundedCount: number;
    refundedTotal: number;
    expenses: number;
    expenseCount: number;
    net: number;
    needsReview: number;
    creditCount: number;
    creditTotal: number;
  };
  byPayment: { method: string; count: number; total: number }[];
  byStaff: { id: string | null; name: string; count: number; total: number }[];
  hourly: { hour: number; total: number; count: number }[];
  topProducts: { name: string; units: number; revenue: number }[];
}

export interface CustomerRow {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  balance?: number;
  totalSpent: number;
  orderCount: number;
  lastOrderAt?: string;
}

export interface SaleLite {
  id: string;
  receiptNumber: string;
  total: number;
  amountPaid: number;
  balance: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  storeName?: string | null;
  itemCount: number;
  summary: string;
}

export interface CustomerProfile {
  currency: string;
  customer: CustomerRow & { notes?: string; loyaltyPoints: number; createdAt: string };
  stats: { lifetimeSpend: number; orders: number; averageOrder: number; firstPurchaseAt: string | null; lastPurchaseAt: string | null; balance: number; pendingCount: number };
  favourites: { name: string; units: number; revenue: number }[];
  pending: SaleLite[];
  recent: SaleLite[];
}

export interface RegisterMovement {
  id: string;
  kind: "PAY_IN" | "PAY_OUT";
  amount: number;
  reason: string;
  actorName: string;
  createdAt: string;
}

export interface RegisterSession {
  id: string;
  storeId: string;
  openedAt: string;
  closedAt: string | null;
  openedByName: string;
  closedByName: string | null;
  openingFloat: number;
  cash: { sales: number; collections: number; refunds: number; payIns: number; payOuts: number; expected: number };
  other: { method: string; total: number }[];
  salesCount: number;
  movements: RegisterMovement[];
  counted: number | null;
  variance: number | null;
  note: string | null;
}

export interface RegisterHistoryRow {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openedByName: string;
  closedByName: string | null;
  openingFloat: number;
  expectedCash: number;
  countedCash: number;
  variance: number;
  note: string | null;
}

const pad = (value: number) => String(value).padStart(2, "0");
export const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const offsetFor = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return -new Date(year, month - 1, day, 12).getTimezoneOffset();
};

export function useRefreshOps() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["ops"] });
    void qc.invalidateQueries({ predicate: (query) => /^(biz|business)/.test(String(query.queryKey[0])) });
  };
}

export function useOverview(range: Range) {
  const { currentStoreId } = useStoreContext();
  return useQuery<Overview>({
    queryKey: ["ops", "overview", range, currentStoreId],
    queryFn: () => api.get(`/business/dashboard?range=${range}&storeId=${currentStoreId}`),
    enabled: !!currentStoreId,
    refetchInterval: 60000,
  });
}

export function useAttention() {
  const { currentStoreId } = useStoreContext();
  return useQuery<Attention>({
    queryKey: ["ops", "attention", currentStoreId],
    queryFn: () => api.get(`/ops/attention?storeId=${currentStoreId}`),
    enabled: !!currentStoreId,
    refetchInterval: 30000,
  });
}

export function useDailyReport(date: string) {
  const { currentStoreId } = useStoreContext();
  return useQuery<DailyReport>({
    queryKey: ["ops", "report", date, currentStoreId],
    queryFn: () => api.get(`/ops/reports/daily?date=${date}&offset=${offsetFor(date)}&storeId=${currentStoreId}`),
    enabled: !!currentStoreId && /^\d{4}-\d{2}-\d{2}$/.test(date),
  });
}

export function useSales(range: Range) {
  const { currentStoreId } = useStoreContext();
  return useQuery<Sale[]>({
    queryKey: ["ops", "sales", range, currentStoreId],
    queryFn: () => api.get(`/business/sales?range=${range}&storeId=${currentStoreId}`).then((d) => d.sales),
    enabled: !!currentStoreId,
  });
}

export function useSalePayments(saleId: string | null) {
  return useQuery<Payment[]>({
    queryKey: ["ops", "payments", saleId],
    queryFn: () => api.get(`/ops/sales/${saleId}/payments`).then((d) => d.payments),
    enabled: !!saleId,
  });
}

export function useCollectPayment() {
  const refresh = useRefreshOps();
  return useMutation({
    mutationFn: ({ saleId, paymentMethod, amount }: { saleId: string; paymentMethod: string; amount?: number }) =>
      api.post(`/ops/sales/${saleId}/collect`, { paymentMethod, amount }),
    onSuccess: refresh,
  });
}

export function useSaleActions() {
  const refresh = useRefreshOps();
  const reviewed = useMutation({ mutationFn: (id: string) => api.patch(`/business/sales/${id}/reviewed`), onSuccess: refresh });
  const status = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "REFUNDED" | "CANCELLED" }) => api.patch(`/business/sales/${id}/status`, { status }),
    onSuccess: refresh,
  });
  return { reviewed, status };
}

export function useCustomers() {
  return useQuery<CustomerRow[]>({
    queryKey: ["ops", "customers"],
    queryFn: () => api.get("/business/customers").then((d) => d.customers),
  });
}

export function useCustomerProfile(id: string) {
  return useQuery<CustomerProfile>({
    queryKey: ["ops", "customer", id],
    queryFn: () => api.get(`/ops/customers/${id}/profile`),
    enabled: !!id,
  });
}

export function useRegisterCurrent() {
  const { currentStoreId } = useStoreContext();
  return useQuery<RegisterSession | null>({
    queryKey: ["ops", "register", currentStoreId],
    queryFn: () => api.get(`/ops/register/current?storeId=${currentStoreId}`).then((d) => d.session),
    enabled: !!currentStoreId,
    refetchInterval: 30000,
  });
}

export function useRegisterHistory() {
  const { currentStoreId } = useStoreContext();
  return useQuery<RegisterHistoryRow[]>({
    queryKey: ["ops", "registerHistory", currentStoreId],
    queryFn: () => api.get(`/ops/register/history?storeId=${currentStoreId}`).then((d) => d.sessions),
    enabled: !!currentStoreId,
  });
}

export type StockReason = "RECEIVED" | "DAMAGED" | "EXPIRED" | "COUNT_CORRECTION" | "RETURNED_TO_SUPPLIER" | "OTHER";

export interface StockMovement {
  id: string;
  delta: number;
  stockAfter: number;
  reason: string;
  note: string | null;
  actorName: string;
  createdAt: string;
}

export function useStockHistory(productId: string | null) {
  const { currentStoreId } = useStoreContext();
  return useQuery<StockMovement[]>({
    queryKey: ["ops", "stockHistory", productId, currentStoreId],
    queryFn: () => api.get(`/ops/products/${productId}/stock-history?storeId=${currentStoreId}`).then((d) => d.movements),
    enabled: !!productId && !!currentStoreId,
  });
}

export function useAdjustStock() {
  const refresh = useRefreshOps();
  const { currentStoreId } = useStoreContext();
  return useMutation({
    mutationFn: ({ productId, delta, reason, note }: { productId: string; delta: number; reason: StockReason; note?: string }) =>
      api.post(`/ops/products/${productId}/stock`, { delta, reason, note, storeId: currentStoreId }) as Promise<{ stock: number; movement: StockMovement }>,
    onSuccess: refresh,
  });
}