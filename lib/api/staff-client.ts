const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export class StaffSessionExpiredError extends Error {}

async function staffRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/staff/login";
    throw new StaffSessionExpiredError("Session expired");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Request failed");
  }

  return res.status === 204 ? null : res.json();
}

export const staffApi = {
  get: (path: string) => staffRequest(path),
  post: (path: string, body?: unknown) => staffRequest(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
};