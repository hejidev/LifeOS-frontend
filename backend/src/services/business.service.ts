import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { cloudinary } from "../config/cloudinary";
import * as storeService from "./store.service";
import { createNotification } from "./notification.service";
import { toCSV } from "../lib/csv";

const num = (d: Prisma.Decimal | number | null | undefined) =>
  d == null ? 0 : Number(d);

function serializeProduct(p: any, storeStock?: { stock: number; lowStockAt: number }) {
  const stock = storeStock?.stock ?? p.stock;
  const lowStockAt = storeStock?.lowStockAt ?? p.lowStockAt;
  return {
    id: p.id,
    name: p.name,
    sku: p.sku ?? undefined,
    barcode: p.barcode ?? undefined,
    category: p.category ?? undefined,
    price: num(p.price),
    cost: p.cost != null ? num(p.cost) : undefined,
    stock,
    lowStockAt,
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

function serializeCustomer(c: any, totalSpent = 0, orderCount = 0, lastOrderAt: string | null = null) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone ?? undefined,
    email: c.email ?? undefined,
    notes: c.notes ?? undefined,
    totalSpent,
    orderCount,
    loyaltyPoints: c.loyaltyPoints ?? 0,
    lastOrderAt: lastOrderAt ?? undefined,
    createdAt: c.createdAt.toISOString(),
  };
}


function serializeSale(s: any) {
  return {
    id: s.id,
    receiptNumber: s.receiptNumber,
    customerId: s.customerId ?? undefined,
    customerName: s.customer?.name ?? undefined,
    storeId: s.storeId ?? undefined,
    storeName: s.store?.name ?? undefined,
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
export async function listProducts(userId: string, activeOnly = false, storeId?: string) {
  const resolvedStoreId = await storeService.resolveStoreId(userId, storeId);
  const products = await prisma.bizProduct.findMany({
    where: { userId, ...(activeOnly ? { active: true } : {}) },
    include: { storeInventory: { where: { storeId: resolvedStoreId } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return products.map((p) => {
    const inv = p.storeInventory[0];
    return serializeProduct(p, inv ? { stock: inv.stock, lowStockAt: inv.lowStockAt } : { stock: 0, lowStockAt: p.lowStockAt });
  });
}

export async function createProduct(userId: string, data: any, storeId?: string) {
  const profile = await getOrCreateProfile(userId);
  const resolvedStoreId = await storeService.resolveStoreId(userId, storeId);
  const { stock, lowStockAt, ...productData } = data;
  const effectiveLowStockAt = lowStockAt ?? 3;

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.bizProduct.create({
      data: { ...productData, lowStockAt: effectiveLowStockAt, userId },
    });

    const allStores = await tx.store.findMany({ where: { bizProfileId: profile.id, active: true } });

    await tx.storeInventory.createMany({
      data: allStores.map((s) => ({
        storeId: s.id,
        productId: created.id,
        stock: s.id === resolvedStoreId ? (stock ?? 0) : 0,
        lowStockAt: effectiveLowStockAt,
      })),
    });

    return created;
  });

  return serializeProduct(product, { stock: stock ?? 0, lowStockAt: effectiveLowStockAt });
}

export async function uploadProductImage(buffer: Buffer, fileName: string) {
  const uploaded = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { 
        folder: "lifeos/product-images", 
        resource_type: "image",
        public_id: `product-${Date.now()}-${fileName.replace(/\.[^/.]+$/, "")}`,
        transformation: [
          { width: 800, height: 800, crop: "limit", quality: "auto" },
          { fetch_format: "auto" }
        ]
      },
      (err, result) => (err || !result ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
  return { url: uploaded.secure_url, publicId: uploaded.public_id };
}

export async function updateProduct(userId: string, id: string, data: any, storeId?: string) {
  const existing = await prisma.bizProduct.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Product not found", 404);

  const resolvedStoreId = await storeService.resolveStoreId(userId, storeId);
  const { stock, lowStockAt, ...productData } = data;

  let previousInv: { stock: number; lowStockAt: number } | null = null;
  if (stock !== undefined || lowStockAt !== undefined) {
    previousInv = await prisma.storeInventory.findUnique({
      where: { storeId_productId: { storeId: resolvedStoreId, productId: id } },
    });
  }

  const [product] = await prisma.$transaction([
    prisma.bizProduct.update({ where: { id }, data: productData }),
    ...(stock !== undefined || lowStockAt !== undefined
      ? [
          prisma.storeInventory.upsert({
            where: { storeId_productId: { storeId: resolvedStoreId, productId: id } },
            update: { ...(stock !== undefined && { stock }), ...(lowStockAt !== undefined && { lowStockAt }) },
            create: { storeId: resolvedStoreId, productId: id, stock: stock ?? 0, lowStockAt: lowStockAt ?? 3 },
          }),
        ]
      : []),
  ]);

  const inv = await prisma.storeInventory.findUnique({ where: { storeId_productId: { storeId: resolvedStoreId, productId: id } } });

  if (inv && previousInv) {
    const wasAbove = previousInv.stock > previousInv.lowStockAt;
    const nowAtOrBelow = inv.stock <= inv.lowStockAt;
    if (wasAbove && nowAtOrBelow) {
      const profile = await getOrCreateProfile(userId);
      if (profile.notifyLowStock) {
        const store = await prisma.store.findUnique({ where: { id: resolvedStoreId }, select: { name: true } });
        const storeLabel = store?.name ? ` at ${store.name}` : "";
        await createNotification(userId, {
          type: "ALERT",
          title: "Low stock alert",
          message: `${product.name} is running low${storeLabel} — ${inv.stock} left`,
          actionUrl: "/merchant/products",
        });
      }
    }
  }

  return serializeProduct(product, inv ? { stock: inv.stock, lowStockAt: inv.lowStockAt } : undefined);
}

export async function deleteProduct(userId: string, id: string) {
  const existing = await prisma.bizProduct.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Product not found", 404);
  await prisma.bizProduct.update({ where: { id }, data: { active: false } });
}

export async function getProductByBarcode(userId: string, barcode: string, storeId?: string) {
  const resolvedStoreId = await storeService.resolveStoreId(userId, storeId);
  const product = await prisma.bizProduct.findFirst({
    where: { userId, barcode, active: true },
    include: { storeInventory: { where: { storeId: resolvedStoreId } } },
  });
  if (!product) throw new AppError("No product found for this barcode", 404);
  const inv = product.storeInventory[0];
  return serializeProduct(product, inv ? { stock: inv.stock, lowStockAt: inv.lowStockAt } : { stock: 0, lowStockAt: product.lowStockAt });
}

// ── Customers ───────────────────────────────────────────────────────────
export async function listCustomers(userId: string) {
  const customers = await prisma.bizCustomer.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { sales: { select: { total: true, status: true, createdAt: true } } },
  });
  return customers.map((c) => {
    const paid = c.sales.filter((s) => s.status === "PAID");
    const totalSpent = paid.reduce((sum, s) => sum + num(s.total), 0);
    const lastOrderAt = paid.length > 0
      ? paid.reduce((latest, s) => (s.createdAt > latest ? s.createdAt : latest), paid[0].createdAt).toISOString()
      : null;
    return serializeCustomer(c, totalSpent, paid.length, lastOrderAt);
  });
}

export async function createCustomer(userId: string, data: any) {
  const customer = await prisma.bizCustomer.create({ data: { ...data, userId } });
  return serializeCustomer(customer);
}

export async function updateCustomer(userId: string, id: string, data: any) {
  const existing = await prisma.bizCustomer.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Customer not found", 404);

  const customer = await prisma.bizCustomer.update({ where: { id }, data });

  const sales = await prisma.bizSale.findMany({
    where: { customerId: id, status: "PAID" },
    select: { total: true, createdAt: true },
  });
  const totalSpent = sales.reduce((sum, s) => sum + num(s.total), 0);
  const lastOrderAt = sales.length > 0
    ? sales.reduce((latest, s) => (s.createdAt > latest ? s.createdAt : latest), sales[0].createdAt).toISOString()
    : null;

  return serializeCustomer(customer, totalSpent, sales.length, lastOrderAt);
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
    redeemPoints?: number;
  },
  storeId?: string
) {
  const resolvedStoreId = await storeService.resolveStoreId(userId, storeId);
  const profile = await getOrCreateProfile(userId);
  const status = (data.status as any) ?? "PAID";

  const subtotal = data.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const manualDiscount = data.discount ?? 0;
  let pointsToRedeem = 0;
  const lowStockCrossings: { productName: string; remaining: number }[] = [];

  const sale = await prisma.$transaction(async (tx) => {
    let customer: any = null;
    if (data.customerId) {
      customer = await tx.bizCustomer.findFirst({ where: { id: data.customerId, userId } });
      if (!customer) throw new AppError("Customer not found", 404);
    }

    let redemptionDiscount = 0;
    if (profile.loyaltyEnabled && data.redeemPoints && data.redeemPoints > 0) {
      if (status !== "PAID") throw new AppError("Points can only be redeemed on a paid sale", 400);
      if (!customer) throw new AppError("Select a customer to redeem loyalty points", 400);
      if (customer.loyaltyPoints < data.redeemPoints) {
        throw new AppError(`${customer.name} only has ${customer.loyaltyPoints} points available`, 400);
      }
      pointsToRedeem = data.redeemPoints;
      redemptionDiscount = pointsToRedeem * profile.loyaltyRedemptionValue;
    }

    const totalDiscount = Math.min(subtotal, manualDiscount + redemptionDiscount);
    const total = Math.max(0, subtotal - totalDiscount);

    for (const it of data.items) {
      if (!it.productId) continue;
      const inv = await tx.storeInventory.findUnique({
        where: { storeId_productId: { storeId: resolvedStoreId, productId: it.productId } },
        include: { product: { select: { name: true } } },
      });
      if (!inv) continue;
      if (inv.stock < it.quantity) {
        throw new AppError(`Not enough stock for "${inv.product.name}" (${inv.stock} left)`, 400);
      }

      const nextStock = inv.stock - it.quantity;
      await tx.storeInventory.update({
        where: { storeId_productId: { storeId: resolvedStoreId, productId: it.productId } },
        data: { stock: { decrement: it.quantity } },
      });

      if (inv.stock > inv.lowStockAt && nextStock <= inv.lowStockAt) {
        lowStockCrossings.push({ productName: inv.product.name, remaining: nextStock });
      }
    }

    const created = await tx.bizSale.create({
      data: {
        userId,
        storeId: resolvedStoreId,
        customerId: data.customerId,
        receiptNumber: genReceiptNumber(),
        subtotal,
        discount: totalDiscount,
        total,
        paymentMethod: (data.paymentMethod as any) ?? "CASH",
        status,
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
      include: { items: true, customer: true, store: true },
    });

    if (customer && status === "PAID") {
      const pointsEarned = profile.loyaltyEnabled ? Math.floor(total / 100) * profile.loyaltyEarnRate : 0;
      const netChange = pointsEarned - pointsToRedeem;
      if (netChange !== 0) {
        await tx.bizCustomer.update({ where: { id: customer.id }, data: { loyaltyPoints: { increment: netChange } } });
      }
    }

    return created;
  });

  if (profile.notifyLowStock && lowStockCrossings.length > 0) {
    const storeLabel = sale.store?.name ? ` at ${sale.store.name}` : "";
    for (const c of lowStockCrossings) {
      await createNotification(userId, {
        type: "ALERT",
        title: "Low stock alert",
        message: `${c.productName} is running low${storeLabel} — ${c.remaining} left`,
        actionUrl: "/merchant/products",
      });
    }
  }

  return serializeSale(sale);
}

export async function listSales(userId: string, range: "today" | "week" | "month" = "month", storeId?: string) {
  const sales = await prisma.bizSale.findMany({
    where: { userId, createdAt: { gte: rangeStart(range) }, ...(storeId ? { storeId } : {}) },
    include: { items: true, customer: true, store: true },
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
export async function listExpenses(userId: string, range: "today" | "week" | "month" = "month", storeId?: string) {
  const expenses = await prisma.bizExpense.findMany({
    where: { userId, date: { gte: rangeStart(range) }, ...(storeId ? { storeId } : {}) },
    orderBy: { date: "desc" },
  });
  return expenses.map(serializeExpense);
}

export async function createExpense(userId: string, data: any, storeId?: string) {
  const resolvedStoreId = await storeService.resolveStoreId(userId, storeId);
  const expense = await prisma.bizExpense.create({
    data: { ...data, userId, storeId: resolvedStoreId, date: data.date ? new Date(data.date) : new Date() },
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

export async function getDashboard(userId: string, params: { range?: string; from?: string; to?: string }, storeId?: string) {
  const profile = await getOrCreateProfile(userId);
  const { start, end } = resolveRange(params);
  const windowMs = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - windowMs);
  const storeFilter = storeId ? { storeId } : {};

  const [sales, prevSales, customers, expenses] = await Promise.all([
    prisma.bizSale.findMany({ where: { userId, createdAt: { gte: start, lt: end }, status: "PAID", ...storeFilter }, include: { items: true, customer: true } }),
    prisma.bizSale.findMany({ where: { userId, status: "PAID", createdAt: { gte: prevStart, lt: start }, ...storeFilter } }),
    prisma.bizCustomer.count({ where: { userId } }),
    prisma.bizExpense.findMany({ where: { userId, date: { gte: start, lt: end }, ...storeFilter } }),
  ]);

  const revenue = sales.reduce((sum, s) => sum + num(s.total), 0);
  const prevRevenue = prevSales.reduce((sum, s) => sum + num(s.total), 0);
  const revenueChange = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null;
  const totalExpenses = expenses.reduce((sum, e) => sum + num(e.amount), 0);

  const lowStockRows = await prisma.storeInventory.findMany({
    where: { product: { userId, active: true }, ...(storeId ? { storeId } : {}) },
    include: { product: true, store: true },
  });
  const lowStock = lowStockRows.filter((r) => r.stock <= r.lowStockAt);

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
      insight = `${lowStock.length} product${lowStock.length > 1 ? "s are" : " is"} running low on stock — ${lowStock.slice(0, 3).map((r) => r.product.name).join(", ")}.`;
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
    lowStockProducts: lowStock.slice(0, 5).map((r) => ({
      ...serializeProduct(r.product, { stock: r.stock, lowStockAt: r.lowStockAt }),
      storeName: storeId ? undefined : r.store?.name,
    })),
    totalExpenses,
    insight,
  };
}

export async function listProductsPaged(userId: string, opts: { page?: number; pageSize?: number; search?: string; activeOnly?: boolean; storeId?: string } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const resolvedStoreId = await storeService.resolveStoreId(userId, opts.storeId);
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
      include: { storeInventory: { where: { storeId: resolvedStoreId } } },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.bizProduct.count({ where }),
  ]);

  return {
    products: products.map((p) => {
      const inv = p.storeInventory[0];
      return serializeProduct(p, inv ? { stock: inv.stock, lowStockAt: inv.lowStockAt } : { stock: 0, lowStockAt: p.lowStockAt });
    }),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function bulkImportProducts(userId: string, products: any[], storeId?: string) {
  const profile = await getOrCreateProfile(userId);
  const resolvedStoreId = await storeService.resolveStoreId(userId, storeId);
  const allStores = await prisma.store.findMany({ where: { bizProfileId: profile.id, active: true } });

  const results = { successful: 0, failed: 0, errors: [] as { row: number; name: string; error: string }[] };

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    try {
      if (!product.name || !product.price) throw new Error("Missing required fields (name, price)");
      const price = parseFloat(product.price);
      const stock = product.stock ? parseInt(product.stock) : 0;
      const cost = product.cost ? parseFloat(product.cost) : undefined;
      if (isNaN(price) || price <= 0) throw new Error("Invalid price value");
      if (isNaN(stock) || stock < 0) throw new Error("Invalid stock value");

      if (product.barcode) {
        const existing = await prisma.bizProduct.findFirst({ where: { userId, barcode: product.barcode } });
        if (existing) throw new Error("Barcode already exists");
      }

      const lowStockAt = product.lowStockAt ? parseInt(product.lowStockAt) : 3;

      await prisma.$transaction(async (tx) => {
        const created = await tx.bizProduct.create({
          data: {
            userId, name: product.name, price, cost,
            barcode: product.barcode || undefined,
            sku: product.sku || undefined,
            category: product.category || undefined,
            lowStockAt, active: true,
          },
        });

        await tx.storeInventory.createMany({
          data: allStores.map((s) => ({
            storeId: s.id,
            productId: created.id,
            stock: s.id === resolvedStoreId ? stock : 0,
            lowStockAt,
          })),
        });
      });

      results.successful++;
    } catch (error: any) {
      results.failed++;
      results.errors.push({ row: i + 1, name: product.name || "Unknown", error: error.message });
    }
  }

  return results;
}

export async function exportProductsCSV(userId: string, opts: { storeId?: string; activeOnly?: boolean } = {}) {
  const products = await listProducts(userId, opts.activeOnly ?? false, opts.storeId);
  return toCSV(products, [
    { key: "name", label: "Name" },
    { key: "sku", label: "SKU" },
    { key: "barcode", label: "Barcode" },
    { key: "category", label: "Category" },
    { key: "price", label: "Price" },
    { key: "cost", label: "Cost" },
    { key: "stock", label: "Stock" },
    { key: "lowStockAt", label: "Low Stock At" },
    { key: "margin", label: "Margin %" },
    { key: "active", label: "Active" },
  ]);
}

export async function exportSalesCSV(userId: string, opts: { range?: "today" | "week" | "month"; storeId?: string } = {}) {
  const sales = await listSales(userId, opts.range ?? "month", opts.storeId);
  return toCSV(sales, [
    { key: "receiptNumber", label: "Receipt #" },
    { key: "createdAt", label: "Date", value: (s) => new Date(s.createdAt).toISOString() },
    { key: "customerName", label: "Customer", value: (s) => s.customerName ?? "Walk-in" },
    { key: "storeName", label: "Store", value: (s) => s.storeName ?? "" },
    { key: "subtotal", label: "Subtotal" },
    { key: "discount", label: "Discount" },
    { key: "total", label: "Total" },
    { key: "paymentMethod", label: "Payment Method" },
    { key: "status", label: "Status" },
    { key: "itemCount", label: "Item Count", value: (s) => s.items.length },
  ]);
}

export async function exportCustomersCSV(userId: string) {
  const customers = await listCustomers(userId);
  return toCSV(customers, [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "totalSpent", label: "Total Spent" },
    { key: "orderCount", label: "Order Count" },
    { key: "loyaltyPoints", label: "Loyalty Points" },
    { key: "createdAt", label: "Customer Since", value: (c) => new Date(c.createdAt).toISOString() },
  ]);
}