"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Package, Users, Receipt,
  UserCog, Activity, Settings, Search,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useBusinessProducts, useBusinessCustomers } from "@/lib/hooks/use-life-data";

const PAGES = [
  { label: "Dashboard", href: "/merchant/dashboard", icon: LayoutDashboard },
  { label: "Point of Sale", href: "/merchant/pos", icon: ShoppingCart },
  { label: "Products", href: "/merchant/products", icon: Package },
  { label: "Customers", href: "/merchant/customers", icon: Users },
  { label: "Expenses", href: "/merchant/expenses", icon: Receipt },
  { label: "Staff", href: "/merchant/staff", icon: UserCog },
  { label: "Staff Activity", href: "/merchant/staff/activity", icon: Activity },
  { label: "Settings", href: "/merchant/settings", icon: Settings },
];

export function MerchantCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: products = [] } = useBusinessProducts();
  const { data: customers = [] } = useBusinessCustomers();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full max-w-sm justify-between text-sm text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4" /> Search...
        </div>
        <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, products, customers..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Pages">
            {PAGES.map((p) => (
              <CommandItem key={p.href} onSelect={() => go(p.href)} className="text-sm">
                <p.icon className="mr-2 h-4 w-4" /> {p.label}
              </CommandItem>
            ))}
          </CommandGroup>

          {products.length > 0 && (
            <CommandGroup heading="Products">
              {(products as any[]).slice(0, 8).map((p) => (
                <CommandItem key={p.id} onSelect={() => go(`/merchant/products?highlight=${p.id}`)} className="text-sm">
                  <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.stock} in stock</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {customers.length > 0 && (
            <CommandGroup heading="Customers">
              {(customers as any[]).slice(0, 8).map((c) => (
                <CommandItem key={c.id} onSelect={() => go(`/merchant/customers?highlight=${c.id}`)} className="text-sm">
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}