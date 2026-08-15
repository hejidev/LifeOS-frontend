"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { AccountUserNav } from "@/components/shared/account-user-nav";
import { User, ShieldCheck } from "lucide-react";

const LINKS = [
  { href: "/admin/profile", label: "Profile", icon: User },
  { href: "/admin/notifications", label: "Notifications", icon: ShieldCheck },
];

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/70 px-4 backdrop-blur-xl">
      <SidebarTrigger />
      <div className="flex items-center gap-2">
        <NotificationBell viewAllHref="/admin/notifications" />
        <AccountUserNav links={LINKS} />
      </div>
    </header>
  );
}