import { api } from "./client";

export async function getMySocialProfile() {
  return api.get("/social-profile/me");
}

export async function createMySocialProfile(data: {
  slug: string;
  displayName: string;
  bio?: string;
  isPublic: boolean;
  links: { platform: string; url: string; label?: string; enabled: boolean; sortOrder: number }[];
}) {
  return api.post("/utilities/social-profile", data);
}

export async function updateMySocialProfile(data: {
  displayName: string;
  bio?: string;
  isPublic: boolean;
  links: { platform: string; url: string; label?: string; enabled: boolean; sortOrder: number }[];
}) {
  return api.patch("/utilities/social-profile", data);
}

export async function deleteMySocialProfile() {
  return api.delete("/utilities/social-profile");
}