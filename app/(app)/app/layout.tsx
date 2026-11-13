"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { useMe } from "@/lib/hooks/use-auth";
import { usePathname, useRouter } from "next/navigation";
import { useFamilyMe } from "@/lib/hooks/use-family-space";

export default function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useMe();

  const router = useRouter();
  const pathname = usePathname();
  const { data: family } = useFamilyMe(!!data);

  useEffect(() => {
    if (family?.role === "child" && !pathname.startsWith("/app/family")) router.replace("/app/family");
  }, [family, pathname, router]);

  useEffect(() => {
    if (isLoading) return;
    if (isError || !data) {
      window.location.href = "/login";
    }
  }, [data, isLoading, isError]);

  if (isLoading || !data) return null;

  return <AppShell>{children}</AppShell>;
}