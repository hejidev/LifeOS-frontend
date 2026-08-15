"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

interface MerchantNavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
}

export function MerchantNavItem({ href, label, icon: Icon, badge }: MerchantNavItemProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={label}
        isActive={active}
        className="group relative h-10 overflow-hidden rounded-xl text-sm transition-all duration-200 hover:translate-x-0.5 hover:bg-accent"
      >
        <Link href={href} className="flex items-center gap-3">
          {active && (
            <motion.div
              layoutId="merchant-sidebar-active"
              className="absolute left-0 top-1 bottom-1 w-1 rounded-r-full bg-primary"
            />
          )}
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate text-sm">{label}</span>
          {badge && (
            <Badge variant="secondary" className="rounded-full text-[10px] px-1.5 py-0">
              {badge}
            </Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}