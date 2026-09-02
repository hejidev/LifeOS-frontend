"use client";

import { useAuthStore } from "@/lib/stores/auth-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "../notifications/notification-bell";
import { CommandPalette } from "../shell/command-palette";
import { MobileMenuToggle } from "../shell/sidebar";

export function TopNavbar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("") ?? "LU";

  const displayName = user?.name ?? "LifeOS User";
  const displayEmail = user?.email ?? "you@example.com";

  return (
    <header className="flex h-12 sm:h-14 items-center gap-2 sm:gap-4 border-b border-border bg-card/50 px-3 sm:px-4 backdrop-blur-sm">
      <MobileMenuToggle />

      <div className="hidden sm:block flex-1">
        <CommandPalette />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full">
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                <AvatarFallback className="gradient-bg text-white text-[10px] sm:text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 sm:w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm">{displayName}</span>
                <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">
                  {displayEmail}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/app/settings")} className="text-xs sm:text-sm">
              Settings
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => router.push("/app/security")} className="text-xs sm:text-sm">
              Security
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="text-xs sm:text-sm"
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
