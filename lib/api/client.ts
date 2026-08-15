const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

interface RefreshResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    avatarUrl?: string | null;
  };
}

interface ApiError extends Error {
  status?: number;
}

let accessToken: string | null = null;
let refreshPromise: Promise<RefreshResponse | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export async function refreshAccessToken(): Promise<RefreshResponse | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        setAccessToken(null);
        return null;
      }

      const data = await res.json();
      setAccessToken(data.accessToken);
      return data;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function makeError(message: string, status: number): ApiError {
  const err = new Error(message) as ApiError;
  err.status = status;
  return err;
}

async function request(path: string, options: RequestInit = {}, isRetry = false): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && path !== "/auth/refresh" && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request(path, options, true);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = data?.error ?? `Request to ${path} failed (${res.status})`;
    throw makeError(message, res.status);
  }

  return res.status === 204 ? null : res.json();
}

async function requestUpload(path: string, formData: FormData, isRetry = false): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
  });

  if (res.status === 401 && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return requestUpload(path, formData, true);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw makeError((data as any).error ?? "Upload failed", res.status);
  }

  return res.status === 204 ? null : res.json();
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: unknown) =>
    request(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: (path: string, body?: unknown) =>
    request(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: (path: string, body?: unknown) =>
    request(path, { method: "DELETE", body: body ? JSON.stringify(body) : undefined }),
  upload: (path: string, formData: FormData) => requestUpload(path, formData),
};

export async function streamPost(path: string, body: unknown): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(body),
    });

  let res = await doFetch();
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) res = await doFetch();
  }
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw makeError((data as any).error ?? "Request failed", res.status);
  }
  return res.body.getReader();
}
