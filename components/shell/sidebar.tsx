"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores/auth-store";
import { mainNavGroups, bottomNavItems } from "./nav-config";
import { ChevronLeft, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// Create a context for mobile sidebar state
import { createContext, useContext } from "react";

const MobileSidebarContext = createContext<{
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}>({
  mobileOpen: false,
  setMobileOpen: () => {},
});

export function useMobileSidebar() {
  return useContext(MobileSidebarContext);
}

export function MobileSidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <MobileSidebarContext.Provider value={{ mobileOpen, setMobileOpen }}>
      {children}
    </MobileSidebarContext.Provider>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { mobileOpen, setMobileOpen } = useMobileSidebar();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      <aside
        className={cn(
          "flex h-full flex-col border-r border-border bg-card transition-all duration-300 z-50",
          "fixed lg:relative",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "w-16" : "w-64",
          sidebarCollapsed && !mobileOpen && "lg:w-16"
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-3 sm:px-4">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg gradient-bg shrink-0">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
          </div>
          {!sidebarCollapsed && (
              <span className="text-base sm:text-lg font-bold gradient-text truncate">LifeOS</span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7 lg:hidden")}
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("hidden lg:flex h-7 w-7", sidebarCollapsed && "ml-0")}
              onClick={toggleSidebar}
            >
              <ChevronLeft className={cn("h-4 w-4 transition-transform", sidebarCollapsed && "rotate-180")} />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 px-2 sm:px-3 py-3 sm:py-4">
          {mainNavGroups.map((group) => (
            <div key={group.label} className="mb-3 sm:mb-4">
              {(!sidebarCollapsed || mobileOpen) && (
                <p className="mb-2 px-2 text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              )}
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2 sm:gap-3 rounded-lg px-2 py-2 text-xs sm:text-sm transition-all hover:bg-accent",
                        isActive && "bg-accent text-foreground font-medium",
                        !isActive && "text-muted-foreground",
                        sidebarCollapsed && !mobileOpen && "justify-center px-2"
                      )}
                      title={sidebarCollapsed && !mobileOpen ? item.title : undefined}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {(!sidebarCollapsed || mobileOpen) && (
                        <>
                          <span className="flex-1 truncate">{item.title}</span>
                          {item.comingSoon && (
                            <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 py-0 shrink-0">
                              Soon
                            </Badge>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </ScrollArea>

        <div className="border-t border-border px-2 sm:px-3 py-2 sm:py-3">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.title}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 sm:gap-3 rounded-lg px-2 py-2 text-xs sm:text-sm transition-all hover:bg-accent",
                  isActive && "bg-accent font-medium",
                  !isActive && "text-muted-foreground",
                  sidebarCollapsed && !mobileOpen && "justify-center"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {(!sidebarCollapsed || mobileOpen) && <span className="truncate">{item.title}</span>}
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}

export function MobileMenuToggle() {
  const { setMobileOpen } = useMobileSidebar();
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className="lg:hidden h-9 w-9"
      onClick={() => setMobileOpen(true)}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
    </Button>
  );
}
