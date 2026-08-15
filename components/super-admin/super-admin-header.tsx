"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { AccountUserNav } from "@/components/shared/account-user-nav";
import { User, Bell } from "lucide-react";

const LINKS = [
  { href: "/super-admin/profile", label: "Profile", icon: User },
  { href: "/super-admin/notifications", label: "Notifications", icon: Bell },
];

export function SuperAdminHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/70 px-4 backdrop-blur-xl">
      <SidebarTrigger />
      <div className="flex items-center gap-2">
        <NotificationBell viewAllHref="/super-admin/notifications" />
        <AccountUserNav links={LINKS} />
      </div>
    </header>
  );
}