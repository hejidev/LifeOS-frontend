"use client";

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

import { MerchantSidebar } from "./merchant-sidebar";
import { MerchantHeader } from "./merchant-header";
import { MobileBottomNav } from "./mobile-bottom-nav";

export function MerchantShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen>
      <MerchantSidebar />

      <SidebarInset>

    <MerchantHeader />

    <main className="p-4 pb-25 md:p-8 md:pb-6">

        {children}

    </main>

    <MobileBottomNav />

</SidebarInset>
    </SidebarProvider>
  );
}