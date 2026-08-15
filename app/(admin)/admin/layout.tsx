"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useMe } from "@/lib/hooks/use-auth";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useMe();

  useEffect(() => {
    if (isLoading) return;

    if (isError || !data) {
      window.location.href = "/login";
      return;
    }

    const role = (data as any).user?.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      window.location.href = "/app/dashboard";
      return;
    }
  }, [data, isLoading, isError]);

  if (isLoading || !data) return null;

  return <AdminShell>{children}</AdminShell>;
}