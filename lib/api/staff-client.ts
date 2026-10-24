const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const DEFAULT_TIMEOUT_MS = 20000;

export class StaffSessionExpiredError extends Error {
  constructor(message = "Session expired") {
    super(message);
    this.name = "StaffSessionExpiredError";
    Object.setPrototypeOf(this, StaffSessionExpiredError.prototype);
  }
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export function isTransientError(err: unknown) {
  if (err instanceof NetworkError) return true;
  return err instanceof ApiError && [408, 429, 502, 503, 504].includes(err.status);
}

interface RequestOptions {
  timeoutMs?: number;
  redirectOnExpire?: boolean;
}

async function staffRequest<T>(path: string, init: RequestInit = {}, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...((init.headers as Record<string, string> | undefined) ?? {}) },
    });
  } catch (err: any) {
    throw new NetworkError(
      err?.name === "AbortError" ? "The server took too long to respond." : "Can't reach the server. Check your connection."
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401) {
    if (options.redirectOnExpire !== false && typeof window !== "undefined") window.location.href = "/staff/login";
    throw new StaffSessionExpiredError();
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data?.error ?? "Request failed", res.status);
  }

  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

export const staffApi = {
  get: <T = any>(path: string, options?: RequestOptions) => staffRequest<T>(path, {}, options),
  post: <T = any>(path: string, body?: unknown, options?: RequestOptions) =>
    staffRequest<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }, options),
};