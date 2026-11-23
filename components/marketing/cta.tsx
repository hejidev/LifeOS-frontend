"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAuthState } from "@/lib/marketing/use-auth-state";

type Look = Pick<ComponentProps<typeof Button>, "variant" | "size" | "className">;

export function CtaButton({ guest, member, children, ...look }: Look & { guest: string; member: string; children: ReactNode }) {
  const { authed } = useAuthState();
  return (
    <Button asChild {...look}>
      <Link href={authed ? member : guest}>{children}</Link>
    </Button>
  );
}