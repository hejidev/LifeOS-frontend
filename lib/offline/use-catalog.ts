"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, NetworkError, StaffSessionExpiredError, staffApi } from "@/lib/api/staff-client";
import { readCatalog, writeCatalog } from "./db";
import type { Customer, Product, QueuedSale } from "./types";

interface Options {
  scope: string | null;
  online: boolean;
  pending: QueuedSale[];
  syncVersion: number;
  markOffline: () => void;
  markSessionExpired: () => void;
}

export function useCatalog({ scope, online, pending, syncVersion, markOffline, markSessionExpired }: Options) {
  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const hasCatalogRef = useRef(false);
  const freshRef = useRef(false);
  const onlineRef = useRef(online);

  const pendingQty = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of pending) {
      for (const item of entry.payload.items) {
        map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
      }
    }
    return map;
  }, [pending]);

  const products = useMemo(() => {
    if (pendingQty.size === 0) return rawProducts;
    return rawProducts.map((product) => {
      const queued = pendingQty.get(product.id);
      return queued ? { ...product, stock: Math.max(0, product.stock - queued) } : product;
    });
  }, [rawProducts, pendingQty]);

  const productsRef = useRef(products);
  const pendingQtyRef = useRef(pendingQty);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    pendingQtyRef.current = pendingQty;
  }, [pendingQty]);

  useEffect(() => {
    onlineRef.current = online;
  }, [online]);

  const refresh = useCallback(async () => {
    if (!scope) return;
    try {
      const [productData, customerData] = await Promise.all([
        staffApi.get<{ products: Product[] }>("/staff-pos/products", { redirectOnExpire: false, timeoutMs: 15000 }),
        staffApi.get<{ customers: Customer[] }>("/staff-pos/customers", { redirectOnExpire: false, timeoutMs: 15000 }),
      ]);
      freshRef.current = true;
      hasCatalogRef.current = true;
      setRawProducts(productData.products);
      setCustomers(customerData.customers);
      setSavedAt(Date.now());
      setError(null);
      void writeCatalog(scope, productData.products, customerData.customers).catch(() => {});
    } catch (err) {
      if (err instanceof StaffSessionExpiredError) {
        markSessionExpired();
      } else if (err instanceof NetworkError) {
        markOffline();
      }
      if (!hasCatalogRef.current) setError(err instanceof Error ? err.message : "Couldn't load products.");
    } finally {
      setLoading(false);
    }
  }, [scope, markOffline, markSessionExpired]);

  useEffect(() => {
    if (!scope) return;
    let cancelled = false;
    freshRef.current = false;
    hasCatalogRef.current = false;
    setRawProducts([]);
    setCustomers([]);
    setSavedAt(null);
    setError(null);
    setLoading(true);

    (async () => {
      const cached = await readCatalog(scope).catch(() => null);
      if (cancelled || freshRef.current) return;
      if (cached) {
        hasCatalogRef.current = true;
        setRawProducts(cached.products);
        setCustomers(cached.customers);
        setSavedAt(cached.savedAt);
        setLoading(false);
      } else if (!onlineRef.current) {
        setError("Connect to the internet once to download your product catalog.");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scope]);

  useEffect(() => {
    if (scope && online) void refresh();
  }, [scope, online, syncVersion, refresh]);

  const findByBarcode = useCallback(
    async (code: string): Promise<Product | null> => {
      const local = productsRef.current.find((product) => product.barcode === code) ?? null;
      if (local && local.stock > 0) return local;
      if (!onlineRef.current) return local;
      try {
        const { product } = await staffApi.get<{ product: Product }>(
          `/staff-pos/products/by-barcode/${encodeURIComponent(code)}`,
          { redirectOnExpire: false, timeoutMs: 6000 }
        );
        setRawProducts((previous) =>
          previous.some((item) => item.id === product.id)
            ? previous.map((item) => (item.id === product.id ? product : item))
            : [...previous, product]
        );
        return { ...product, stock: Math.max(0, product.stock - (pendingQtyRef.current.get(product.id) ?? 0)) };
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        if (err instanceof NetworkError) {
          markOffline();
          return local;
        }
        if (err instanceof StaffSessionExpiredError) {
          markSessionExpired();
          return local;
        }
        throw err;
      }
    },
    [markOffline, markSessionExpired]
  );

  return { products, customers, loading, error, savedAt, refresh, findByBarcode };
}