"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { refreshAccessToken, getAccessToken } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { UserRole } from "@/types/life";

export function AuthHydrator() {
  const queryClient = useQueryClient();
  const authStoreLogin = useAuthStore((s) => s.login);
  const setAuthReady = useAuthStore((s) => s.setAuthReady);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const hydrate = async () => {
      try {
        if (!getAccessToken()) {
          const data = await refreshAccessToken();

          if (!data) {
            document.cookie = "lifeos_authed=; path=/; max-age=0";
            document.cookie = "lifeos_role=; path=/; max-age=0";
            authStoreLogin(null);
            return;
          }

          // Cookies are set by the backend with proper SameSite/secure settings
          queryClient.setQueryData(["me"], { user: data.user });

          authStoreLogin({
            id: data.user.id,
            email: data.user.email,
            role: data.user.role as UserRole,
            name: data.user.name ?? data.user.email.split("@")[0],
          });
        }
      } catch {
        // Clear cookies on error since backend might not be reachable
        document.cookie = "lifeos_authed=; path=/; max-age=0";
        document.cookie = "lifeos_role=; path=/; max-age=0";
        authStoreLogin(null);
      } finally {
        setAuthReady(true);
      }
    };

    hydrate();
  }, [queryClient, authStoreLogin, setAuthReady]);

  return null;
}
