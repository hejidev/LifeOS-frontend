"use client";

import Link from "next/link";
import {
  LayoutDashboard, Users, Store, FileText, Radio, MessageSquare, BarChart3, ShieldAlert,
} from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu } from "@/components/ui/sidebar";
import { MerchantNavItem } from "@/components/merchant/merchant-nav-item";
import { useMyPermissions } from "@/lib/hooks/use-life-data";

export function AdminSidebar() {
  const { data } = useMyPermissions();
  const caps: string[] = (data as any)?.capabilities ?? [];

  const nav = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, always: true },
    { href: "/admin/users", label: "Users", icon: Users, cap: "MANAGE_USERS" },
    { href: "/admin/merchant-applications", label: "Merchant Applications", icon: Store, cap: "MANAGE_MERCHANTS" },
    { href: "/admin/content", label: "Content", icon: FileText, cap: "MANAGE_CONTENT" },
    { href: "/admin/broadcast", label: "Broadcast", icon: Radio, cap: "SEND_BROADCASTS" },
    { href: "/admin/messages", label: "Messages", icon: MessageSquare, cap: "MESSAGE_USERS" },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3, cap: "VIEW_ANALYTICS" },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h2 className="text-sm font-semibold leading-none">LifeOS</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Admin</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {nav
            .filter((item) => item.always || caps.includes(item.cap!))
            .map((item) => (
              <MerchantNavItem key={item.href} href={item.href} label={item.label} icon={item.icon} />
            ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <Link href="/app/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
            Back to LifeOS
          </Link>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}