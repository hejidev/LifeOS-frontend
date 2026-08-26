import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";

const num = (d: Prisma.Decimal | number | null | undefined) =>
  d == null ? 0 : Number(d);

function serializeProduct(p: any) {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku ?? undefined,
    category: p.category ?? undefined,
    price: num(p.price),
    cost: p.cost != null ? num(p.cost) : undefined,
    stock: p.stock,
    lowStockAt: p.lowStockAt,
    imageUrl: p.imageUrl ?? undefined,
    active: p.active,
    margin:
      p.cost != null && num(p.price) > 0
        ? Math.round(((num(p.price) - num(p.cost)) / num(p.price)) * 100)
        : undefined,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function serializeCustomer(c: any, totalSpent = 0, orderCount = 0) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone ?? undefined,
    email: c.email ?? undefined,
    notes: c.notes ?? undefined,
    totalSpent,
    orderCount,
    createdAt: c.createdAt.toISOString(),
  };
}

function serializeSale(s: any) {
  return {
    id: s.id,
    receiptNumber: s.receiptNumber,
    customerId: s.customerId ?? undefined,
    customerName: s.customer?.name ?? undefined,
    items: s.items.map((it: any) => ({
      id: it.id,
      productId: it.productId ?? undefined,
      name: it.name,
      quantity: it.quantity,
      unitPrice: num(it.unitPrice),
      lineTotal: num(it.lineTotal),
    })),
    subtotal: num(s.subtotal),
    discount: num(s.discount),
    total: num(s.total),
    paymentMethod: s.paymentMethod,
    status: s.status,
    note: s.note ?? undefined,
    createdAt: s.createdAt.toISOString(),
  };
}

function serializeExpense(e: any) {
  return {
    id: e.id,
    title: e.title,
    category: e.category,
    amount: num(e.amount),
    date: e.date.toISOString(),
    note: e.note ?? undefined,
    createdAt: e.createdAt.toISOString(),
  };
}

function genReceiptNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `RCPT-${stamp}-${rand}`;
}

function rangeStart(range: "today" | "week" | "month") {
  const now = new Date();
  if (range === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "week") {
    const d = new Date(now);
    const day = d.getDay() === 0 ? 7 : d.getDay();
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// ── Profile ─────────────────────────────────────────────────────────────

export async function getOrCreateProfile(userId: string) {
  let profile = await prisma.bizProfile.findUnique({ where: { userId } });
  if (!profile) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    profile = await prisma.bizProfile.create({
      data: { userId, businessName: `${user?.name ?? "My"}'s Business` },
    });
  }
  return profile;
}

export async function updateProfile(userId: string, data: { businessName?: string; currency?: string; logoUrl?: string }) {
  await getOrCreateProfile(userId);
  return prisma.bizProfile.update({ where: { userId }, data });
}

// ── Products ────────────────────────────────────────────────────────────

export async function listProducts(userId: string, activeOnly = false) {
  const products = await prisma.bizProduct.findMany({
    where: { userId, ...(activeOnly ? { active: true } : {}) },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return products.map(serializeProduct);
}

export async function createProduct(userId: string, data: any) {
  const product = await prisma.bizProduct.create({ data: { ...data, userId } });
  return serializeProduct(product);
}

export async function updateProduct(userId: string, id: string, data: any) {
  const existing = await prisma.bizProduct.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Product not found", 404);
  const product = await prisma.bizProduct.update({ where: { id }, data });
  return serializeProduct(product);
}

export async function deleteProduct(userId: string, id: string) {
  const existing = await prisma.bizProduct.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Product not found", 404);
  await prisma.bizProduct.update({ where: { id }, data: { active: false } });
}

// ── Customers ───────────────────────────────────────────────────────────

export async function listCustomers(userId: string) {
  const customers = await prisma.bizCustomer.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { sales: { select: { total: true, status: true } } },
  });
  return customers.map((c) => {
    const paid = c.sales.filter((s) => s.status === "PAID");
    const totalSpent = paid.reduce((sum, s) => sum + num(s.total), 0);
    return serializeCustomer(c, totalSpent, paid.length);
  });
}

export async function createCustomer(userId: string, data: any) {
  const customer = await prisma.bizCustomer.create({ data: { ...data, userId } });
  return serializeCustomer(customer);
}

// ── Sales (POS checkout) ────────────────────────────────────────────────

export async function createSale(
  userId: string,
  data: {
    customerId?: string;
    items: { productId?: string; name: string; quantity: number; unitPrice: number }[];
    discount?: number;
    paymentMethod?: string;
    status?: string;
    note?: string;
  }
) {
  const subtotal = data.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const discount = data.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

  const sale = await prisma.$transaction(async (tx) => {
    // Decrement stock for any items linked to a real product
    for (const it of data.items) {
      if (!it.productId) continue;
      const product = await tx.bizProduct.findFirst({ where: { id: it.productId, userId } });
      if (!product) continue; // allow ad-hoc items not in catalog
      if (product.stock < it.quantity) {
        throw new AppError(`Not enough stock for "${product.name}" (${product.stock} left)`, 400);
      }
      await tx.bizProduct.update({
        where: { id: product.id },
        data: { stock: { decrement: it.quantity } },
      });
    }

    return tx.bizSale.create({
      data: {
        userId,
        customerId: data.customerId,
        receiptNumber: genReceiptNumber(),
        subtotal,
        discount,
        total,
        paymentMethod: (data.paymentMethod as any) ?? "CASH",
        status: (data.status as any) ?? "PAID",
        note: data.note,
        items: {
          create: data.items.map((it) => ({
            productId: it.productId,
            name: it.name,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            lineTotal: it.quantity * it.unitPrice,
          })),
        },
      },
      include: { items: true, customer: true },
    });
  });

  return serializeSale(sale);
}

export async function listSales(userId: string, range: "today" | "week" | "month" = "month") {
  const sales = await prisma.bizSale.findMany({
    where: { userId, createdAt: { gte: rangeStart(range) } },
    include: { items: true, customer: true },
    orderBy: { createdAt: "desc" },
  });
  return sales.map(serializeSale);
}

export async function updateSaleStatus(userId: string, id: string, status: string) {
  const existing = await prisma.bizSale.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Sale not found", 404);
  const sale = await prisma.bizSale.update({
    where: { id },
    data: { status: status as any },
    include: { items: true, customer: true },
  });
  return serializeSale(sale);
}

// ── Expenses ────────────────────────────────────────────────────────────

export async function listExpenses(userId: string, range: "today" | "week" | "month" = "month") {
  const expenses = await prisma.bizExpense.findMany({
    where: { userId, date: { gte: rangeStart(range) } },
    orderBy: { date: "desc" },
  });
  return expenses.map(serializeExpense);
}

export async function createExpense(userId: string, data: any) {
  const expense = await prisma.bizExpense.create({
    data: { ...data, userId, date: data.date ? new Date(data.date) : new Date() },
  });
  return serializeExpense(expense);
}

export async function deleteExpense(userId: string, id: string) {
  const existing = await prisma.bizExpense.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Expense not found", 404);
  await prisma.bizExpense.delete({ where: { id } });
}

// ── Dashboard ───────────────────────────────────────────────────────────

function resolveRange(params: { range?: string; from?: string; to?: string }): { start: Date; end: Date } {
  if (params.from) {
    const start = new Date(params.from);
    const end = params.to ? new Date(params.to) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  switch (params.range) {
    case "week": {
      const d = new Date(now);
      const day = d.getDay() === 0 ? 7 : d.getDay();
      return { start: new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + 1), end };
    }
    case "month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
    case "year":
      return { start: new Date(now.getFullYear(), 0, 1), end };
    case "today":
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end };
  }
}

export async function getDashboard(userId: string, params: { range?: string; from?: string; to?: string }) {
  const profile = await getOrCreateProfile(userId);
  const { start, end } = resolveRange(params);
  const windowMs = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - windowMs);

  const [sales, prevSales, customers, products, expenses] = await Promise.all([
    prisma.bizSale.findMany({ where: { userId, createdAt: { gte: start, lt: end }, status: "PAID" }, include: { items: true, customer: true } }),
    prisma.bizSale.findMany({ where: { userId, status: "PAID", createdAt: { gte: prevStart, lt: start } } }),
    prisma.bizCustomer.count({ where: { userId } }),
    prisma.bizProduct.findMany({ where: { userId, active: true } }),
    prisma.bizExpense.findMany({ where: { userId, date: { gte: start, lt: end } } }),
  ]);

  const revenue = sales.reduce((sum, s) => sum + num(s.total), 0);
  const prevRevenue = prevSales.reduce((sum, s) => sum + num(s.total), 0);
  const revenueChange = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null;

  const totalExpenses = expenses.reduce((sum, e) => sum + num(e.amount), 0);
  const lowStock = products.filter((p) => p.stock <= p.lowStockAt);

  const unitsByProduct = new Map<string, { name: string; units: number; revenue: number }>();
  for (const s of sales) {
    for (const it of s.items) {
      const key = it.productId ?? it.name;
      const cur = unitsByProduct.get(key) ?? { name: it.name, units: 0, revenue: 0 };
      cur.units += it.quantity;
      cur.revenue += num(it.lineTotal);
      unitsByProduct.set(key, cur);
    }
  }
  const topProducts = [...unitsByProduct.values()].sort((a, b) => b.units - a.units).slice(0, 5);

  const metrics = [
    { id: "revenue", label: "Revenue", value: `${profile.currency} ${revenue.toLocaleString()}`, change: revenueChange == null ? undefined : `${revenueChange >= 0 ? "+" : ""}${revenueChange}% vs prior period` },
    { id: "orders", label: "Orders", value: `${sales.length}`, change: undefined },
    { id: "customers", label: "Customers", value: `${customers}`, change: undefined },
    { id: "profit", label: "Net (rev - exp)", value: `${profile.currency} ${(revenue - totalExpenses).toLocaleString()}`, change: undefined },
  ];

  const recentActivity = [
    ...sales.slice(0, 8).map((s) => ({ id: s.id, title: s.customer?.name ? `Sale to ${s.customer.name}` : `Sale ${s.receiptNumber}`, type: "order" as const, amount: num(s.total), currency: profile.currency, date: s.createdAt.toISOString(), status: s.status })),
    ...expenses.slice(0, 5).map((e) => ({ id: e.id, title: e.title, type: "expense" as const, amount: num(e.amount), currency: profile.currency, date: e.date.toISOString(), status: undefined })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  let insight = "Log a few sales to start seeing trends here.";
  if (sales.length > 0) {
    if (lowStock.length > 0) {
      insight = `${lowStock.length} product${lowStock.length > 1 ? "s are" : " is"} running low on stock — ${lowStock.slice(0, 3).map((p) => p.name).join(", ")}.`;
    } else if (topProducts[0]) {
      insight = `"${topProducts[0].name}" is your top seller this period with ${topProducts[0].units} units sold.`;
    } else if (revenueChange != null) {
      insight = `Revenue is ${revenueChange >= 0 ? "up" : "down"} ${Math.abs(revenueChange)}% versus the prior period.`;
    }
  }

  return {
    businessName: profile.businessName,
    currency: profile.currency,
    metrics,
    recentActivity,
    topProducts,
    lowStockCount: lowStock.length,
    lowStockProducts: lowStock.slice(0, 5).map(serializeProduct),
    totalExpenses,
    insight,
  };
}

export async function listProductsPaged(userId: string, opts: { page?: number; pageSize?: number; search?: string; activeOnly?: boolean } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const where: any = { userId, ...(opts.activeOnly ? { active: true } : {}) };
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search, mode: "insensitive" } },
      { sku: { contains: opts.search, mode: "insensitive" } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.bizProduct.findMany({
      where,
      orderBy: [{ active: "desc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.bizProduct.count({ where }),
  ]);

  return {
    products: products.map(serializeProduct),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}