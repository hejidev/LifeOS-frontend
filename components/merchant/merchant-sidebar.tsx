"use client";

import Link from "next/link";
import {
  LayoutDashboard, ShoppingCart, Package, Users, Receipt,
  UserCog, Activity, Settings, Sparkles,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from "@/components/ui/sidebar";
import { MerchantNavItem } from "./merchant-nav-item";

const nav = [
  { href: "/merchant/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/merchant/pos", label: "Point of Sale", icon: ShoppingCart },
  { href: "/merchant/products", label: "Products", icon: Package },
  { href: "/merchant/customers", label: "Customers", icon: Users },
  { href: "/merchant/expenses", label: "Expenses", icon: Receipt },
  { href: "/merchant/staff", label: "Staff", icon: UserCog },
  { href: "/merchant/staff/activity", label: "Staff Activity", icon: Activity },
  { href: "/merchant/settings", label: "Settings", icon: Settings },
];

export function MerchantSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h2 className="text-sm font-semibold leading-none">LifeOS</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Merchant Portal</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {nav.map((item) => (
            <MerchantNavItem key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-sm">
              <Link href="/app/dashboard">
                <Sparkles className="h-4 w-4" />
                <span>Back to LifeOS</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}