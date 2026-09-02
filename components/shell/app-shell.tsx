"use client";

import { Sidebar, MobileMenuToggle, MobileSidebarProvider } from "./sidebar";
import { TopNavbar } from "../app/top-navbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <MobileSidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <TopNavbar />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </MobileSidebarProvider>
  );
}
