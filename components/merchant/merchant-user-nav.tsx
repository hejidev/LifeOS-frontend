"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Settings, CreditCard, HelpCircle, LogOut } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserProfile } from "@/lib/hooks/use-life-data";
import { useLogout } from "@/lib/hooks/use-auth";

function getInitials(name?: string, email?: string) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
  }
  return email ? email.slice(0, 2).toUpperCase() : "U";
}

export function MerchantUserNav() {
  const { data: profile, isLoading } = useUserProfile();
  const logout = useLogout();
  const router = useRouter();

  async function handleLogout() {
    await logout.mutateAsync();
    router.push("/login");
  }

  if (isLoading || !profile) return <Skeleton className="h-9 w-9 rounded-full" />;

  const p = profile as any;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={p.avatarUrl ?? undefined} alt={p.name ?? p.email} />
            <AvatarFallback className="text-xs font-medium">{getInitials(p.name, p.email)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarImage src={p.avatarUrl ?? undefined} alt={p.name ?? p.email} />
            <AvatarFallback className="text-sm font-medium">{getInitials(p.name, p.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{p.name ?? "Merchant"}</p>
            <p className="text-xs text-muted-foreground truncate">{p.email}</p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/merchant/profile" className="text-sm"><User className="mr-2 h-4 w-4" /> Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/merchant/settings" className="text-sm"><Settings className="mr-2 h-4 w-4" /> Business Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/merchant/billing" className="text-sm"><CreditCard className="mr-2 h-4 w-4" /> Billing</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/merchant/support" className="text-sm"><HelpCircle className="mr-2 h-4 w-4" /> Help Center</Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout} className="text-sm text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}