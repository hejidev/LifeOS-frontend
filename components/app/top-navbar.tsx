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

import Link from "next/link";
import { Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "../notifications/notification-bell";
import { CommandPalette } from "../shell/command-palette";
import { KeyboardShortcuts } from "../shell/keyboard-shortcuts";

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
    <header className="flex h-14 items-center gap-4 border-b border-border bg-card/50 px-4 backdrop-blur-sm">

      <CommandPalette />

      <KeyboardShortcuts />
      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild><Link href="/merchant/apply"><Store className="h-4 w-4 mr-1" /> Merchant</Link></Button>
          <NotificationBell />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="gradient-bg text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{displayName}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {displayEmail}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/app/settings")}>
              Settings
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => router.push("/app/security")}>
              Security
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                logout();
                router.push("/");
              }}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
