"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { useMe } from "@/lib/hooks/use-auth";

export default function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useMe();

  useEffect(() => {
    if (isLoading) return;
    if (isError || !data) {
      window.location.href = "/login";
    }
  }, [data, isLoading, isError]);

  if (isLoading || !data) return null;

  return <AppShell>{children}</AppShell>;
}