"use client";

import { useMe } from "@/lib/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useMe();

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-[calc(100vh-4rem)] rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  return <>{children}</>;
}