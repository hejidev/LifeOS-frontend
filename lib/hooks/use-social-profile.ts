import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMySocialProfile, createMySocialProfile } from "../api/social-profile";

export function useMySocialProfile() {
  return useQuery({
    queryKey: ["my-social-profile"],
    queryFn: getMySocialProfile,
  });
}

export function useCreateSocialProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMySocialProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-social-profile"] }),
  });
}