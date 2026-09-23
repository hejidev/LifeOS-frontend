"use client";

import { Store, ChevronsUpDown, Check, Plus } from "lucide-react";
import Link from "next/link";
import { useStoreContext } from "@/lib/context/store-context";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function StoreSwitcher() {
  const { stores, currentStore, setCurrentStoreId, isLoading } = useStoreContext();

  if (isLoading || stores.length === 0) return null;

  if (stores.length === 1) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
        <Store className="h-3.5 w-3.5" />
        <span className="truncate">{stores[0].name}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between gap-2 text-sm">
          <span className="flex items-center gap-2 min-w-0">
            <Store className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{currentStore?.name ?? "Select store"}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {stores.map((s) => (
          <DropdownMenuItem key={s.id} onClick={() => setCurrentStoreId(s.id)} className="gap-2">
            <Check className={`h-3.5 w-3.5 ${s.id === currentStore?.id ? "opacity-100" : "opacity-0"}`} />
            <span className="truncate flex-1">{s.name}</span>
            {s.isDefault && <span className="text-[10px] text-muted-foreground">Default</span>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/merchant/locations" className="gap-2">
            <Plus className="h-3.5 w-3.5" /> Manage locations
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}