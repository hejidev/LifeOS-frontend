"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api, setAccessToken } from "@/lib/api/client";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    if (!accessToken) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        setAccessToken(accessToken);
        // Cookies are set by the backend with proper SameSite/secure settings

        const data = await api.get("/auth/me");

        queryClient.setQueryData(["me"], { user: data.user });

        const role = data.user.role as string;
        if (role === "SUPER_ADMIN") {
          window.location.href = "/super-admin";
        } else if (role === "ADMIN") {
          window.location.href = "/app/admin";
        } else {
          window.location.href = "/app/dashboard";
        }
      } catch {
        router.replace("/login");
      }
    })();
  }, [searchParams, router, queryClient]);

  return <p className="text-center mt-10 text-sm text-muted-foreground">Signing you in…</p>;
}
