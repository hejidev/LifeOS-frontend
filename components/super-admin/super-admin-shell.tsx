"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SuperAdminSidebar } from "./super-admin-sidebar";
import { SuperAdminHeader } from "./super-admin-header";

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <SuperAdminSidebar />
      <SidebarInset>
        <SuperAdminHeader />
        <main className="p-4 md:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}