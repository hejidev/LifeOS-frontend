"use client";

import Link from "next/link";
import { Plus, Package, ShoppingCart, Users, Receipt, UserPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const actions = [
  { label: "New Sale", description: "Start a POS transaction", href: "/merchant/pos", icon: ShoppingCart },
  { label: "Products", description: "Manage inventory", href: "/merchant/products", icon: Package },
  { label: "Customers", description: "View customer profiles", href: "/merchant/customers", icon: Users },
  { label: "Expenses", description: "Record business expenses", href: "/merchant/expenses", icon: Receipt },
  { label: "Staff", description: "Manage your team", href: "/merchant/staff", icon: UserPlus },
];

export function MerchantQuickActions({ iconOnly = false }: { iconOnly?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={iconOnly ? "icon" : "default"} className={iconOnly ? "h-10 w-10 rounded-full shadow-lg" : "gap-2 rounded-xl text-sm"}>
          <Plus className={iconOnly ? "h-6 w-6" : "h-3 w-3"} />
          {!iconOnly && <span className="hidden md:inline">New</span>}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 rounded-xl">
        <DropdownMenuLabel className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" /> Quick Actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action) => (
          <DropdownMenuItem key={action.label} asChild>
            <Link href={action.href} className="flex cursor-pointer items-start gap-3 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <action.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{action.label}</span>
                <span className="text-xs text-muted-foreground">{action.description}</span>
              </div>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}