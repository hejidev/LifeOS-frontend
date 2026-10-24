import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Customer, Product, QueuedSale } from "./types";

interface StaffDB extends DBSchema {
  meta: { key: string; value: unknown };
  snapshots: { key: string; value: { savedAt: number; data: unknown[] } };
  queue: { key: string; value: QueuedSale; indexes: { "by-soldAt": string } };
}

let dbPromise: Promise<IDBPDatabase<StaffDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<StaffDB>("lifeos-staff-web", 1, {
      upgrade(db) {
        db.createObjectStore("meta");
        db.createObjectStore("snapshots");
        const queue = db.createObjectStore("queue", { keyPath: "id" });
        queue.createIndex("by-soldAt", "soldAt");
      },
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export async function getMeta<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const value = await db.get("meta", key);
  return (value as T | undefined) ?? null;
}

export async function setMeta(key: string, value: unknown) {
  const db = await getDb();
  await db.put("meta", value, key);
}

export async function deleteMeta(key: string) {
  const db = await getDb();
  await db.delete("meta", key);
}

export async function writeCatalog(scope: string, products: Product[], customers: Customer[]) {
  const db = await getDb();
  const savedAt = Date.now();
  const tx = db.transaction("snapshots", "readwrite");
  await Promise.all([
    tx.store.put({ savedAt, data: products }, `${scope}:products`),
    tx.store.put({ savedAt, data: customers }, `${scope}:customers`),
    tx.done,
  ]);
}

export async function readCatalog(scope: string) {
  const db = await getDb();
  const [products, customers] = await Promise.all([
    db.get("snapshots", `${scope}:products`),
    db.get("snapshots", `${scope}:customers`),
  ]);
  if (!products) return null;
  return {
    products: products.data as Product[],
    customers: (customers?.data ?? []) as Customer[],
    savedAt: products.savedAt,
  };
}

export async function queueAdd(entry: QueuedSale) {
  const db = await getDb();
  const tx = db.transaction("queue", "readwrite");
  if (!(await tx.store.get(entry.id))) await tx.store.add(entry);
  await tx.done;
}

export async function queueAll() {
  const db = await getDb();
  return db.getAllFromIndex("queue", "by-soldAt");
}

export async function queueUpdate(
  id: string,
  patch: Pick<QueuedSale, "status" | "attempts" | "lastError">
) {
  const db = await getDb();
  const tx = db.transaction("queue", "readwrite");
  const existing = await tx.store.get(id);
  if (existing) await tx.store.put({ ...existing, ...patch });
  await tx.done;
}

export async function queueDelete(id: string) {
  const db = await getDb();
  await db.delete("queue", id);
}