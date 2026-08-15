"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LucideIcon, LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

export function AccountUserNav({ links }: { links: { href: string; label: string; icon: LucideIcon }[] }) {
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
            <p className="text-sm font-medium truncate">{p.name ?? "Account"}</p>
            <p className="text-xs text-muted-foreground truncate">{p.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        {links.map((l) => (
          <DropdownMenuItem key={l.href} asChild>
            <Link href={l.href} className="text-sm"><l.icon className="mr-2 h-4 w-4" /> {l.label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-sm text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}