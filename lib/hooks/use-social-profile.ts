"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export interface SocialLinkRow {
  id?: string;
  platform: string;
  url: string;
  label: string | null;
  enabled: boolean;
  sortOrder: number;
}

export interface SocialProfile {
  id: string;
  slug: string;
  displayName: string;
  bio: string | null;
  avatar: string | null;
  isPublic: boolean;
  links: SocialLinkRow[];
}

export interface SocialLinkInput {
  platform: string;
  url: string;
  label?: string;
  enabled: boolean;
  sortOrder: number;
}

export interface SocialProfileInput {
  displayName: string;
  bio?: string;
  avatar?: string;
  isPublic: boolean;
  links: SocialLinkInput[];
}

export function useMySocialProfile() {
  return useQuery<SocialProfile | null>({
    queryKey: ["socialProfile"],
    queryFn: () => api.get("/social-profile/me"),
    staleTime: 1000 * 60,
  });
}

function useSocialMutation<T>(run: (input: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: run, onSuccess: () => qc.invalidateQueries({ queryKey: ["socialProfile"] }) });
}

export const useCreateSocialProfile = () =>
  useSocialMutation((data: SocialProfileInput & { slug: string }) => api.post("/utilities/social-profile", data));

export const useUpdateSocialProfile = () => useSocialMutation((data: SocialProfileInput) => api.patch("/utilities/social-profile", data));

export const useDeleteSocialProfile = () => useSocialMutation((_: void) => api.delete("/utilities/social-profile"));