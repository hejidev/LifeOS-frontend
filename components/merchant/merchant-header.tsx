"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "../notifications/notification-bell";
import { MerchantCommandPalette } from "./merchant-command-palette";
import { MerchantUserNav } from "./merchant-user-nav";
import { MerchantQuickActions } from "./merchant-quick-actions";

export function MerchantHeader() {
  return (
    <header className="sticky top-5 z-40 flex h-14 items-center gap-4 border-b bg-background/70 px-3 sm:px-6 backdrop-blur-xl">
      <div className="hidden sm:flex items-center">
        <SidebarTrigger />
      </div>

      <div className="flex-1 m-0 sm:mx-4">
        <MerchantCommandPalette />
      </div>

      <div className="ml-0 sm:ml-auto flex items-center gap-2">
        <div className="hidden sm:flex">
          <MerchantQuickActions />
        </div>
        <NotificationBell />
        <MerchantUserNav />
      </div>
    </header>
  );
}