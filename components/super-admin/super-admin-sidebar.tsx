"use client";

import Link from "next/link";
import {
    LayoutDashboard, Store, Building2, CreditCard, Users, BarChart3, ScrollText, Sparkles, ShieldAlert,
    Radio,
    ShieldCheck,
    MessageSquare,
    FileText,
} from "lucide-react";
import {
    Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu,
} from "@/components/ui/sidebar";
import { MerchantNavItem } from "@/components/merchant/merchant-nav-item";

const nav = [
    { href: "/super-admin", label: "Overview", icon: LayoutDashboard },
    { href: "/super-admin/merchant-applications", label: "Merchant Applications", icon: Store },
    { href: "/super-admin/tenants", label: "Tenants", icon: Building2 },
    { href: "/super-admin/billing", label: "Billing & Revenue", icon: CreditCard },
    { href: "/super-admin/users", label: "Users", icon: Users },
    { href: "/super-admin/admins", label: "Admins", icon: ShieldCheck },
    { href: "/super-admin/broadcast", label: "Broadcast", icon: Radio },
    { href: "/super-admin/content", label: "Content Review", icon: FileText },
    { href: "/super-admin/messages", label: "Messages", icon: MessageSquare },
    { href: "/super-admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/super-admin/audit-log", label: "Audit Log", icon: ScrollText },
    { href: "/super-admin/security", label: "Security", icon: ShieldAlert },
];

export function SuperAdminSidebar() {
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b">
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive text-destructive-foreground shrink-0">
                        <ShieldAlert className="h-4 w-4" />
                    </div>
                    <div className="group-data-[collapsible=icon]:hidden">
                        <h2 className="text-sm font-semibold leading-none">LifeOS</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Super Admin</p>
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
                    <Link href="/app/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
                        <Sparkles className="h-4 w-4" /> Back to LifeOS
                    </Link>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}