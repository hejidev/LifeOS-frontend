// lib/hooks/use-auth.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, setAccessToken } from "@/lib/api/client";
import { useAuthStore } from "../stores/auth-store";
import { UserRole } from "@/types/life";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.get("/auth/me"),
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const authStoreLogin = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api.post("/auth/login", input),
    onSuccess: (data) => {
      if (data.requires2FA) return;

      setAccessToken(data.accessToken);
      // Cookies are set by the backend with proper SameSite/secure settings
      queryClient.setQueryData(["me"], { user: data.user });

      authStoreLogin({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role as UserRole,
        name: data.user.name ?? data.user.email.split("@")[0],
      });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const authStoreLogout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => {
      setAccessToken(null);
      // Cookies are cleared by the backend
      queryClient.setQueryData(["me"], null);
      authStoreLogout();
    },
  });
}
