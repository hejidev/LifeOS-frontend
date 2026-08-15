"use client";

import { useEffect } from "react";
import { useMe } from "@/lib/hooks/use-auth";
import { SuperAdminShell } from "@/components/super-admin/super-admin-shell";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useMe();

  useEffect(() => {
    if (isLoading) return;
    if (isError || !data) {
      window.location.href = "/login";
      return;
    }
    const role = (data as any).user?.role;
    if (role !== "SUPER_ADMIN") {
      window.location.href = "/app/dashboard";
    }
  }, [data, isLoading, isError]);

  if (isLoading || !data) return null;

  return <SuperAdminShell>{children}</SuperAdminShell>;
}