import { ApiError, NetworkError, StaffSessionExpiredError, staffApi } from "@/lib/api/staff-client";
import { queueAll, queueDelete, queueUpdate } from "./db";

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const MAX_SERVER_ATTEMPTS = 10;
const UPLOAD_TIMEOUT_MS = 20000;
const LOCK_NAME = "lifeos-sale-sync";

export interface SyncOutcome {
  synced: number;
  retryLater: boolean;
  sessionExpired: boolean;
  networkDown: boolean;
  skipped: boolean;
}

async function runSync(scope: string): Promise<SyncOutcome> {
  const outcome: SyncOutcome = { synced: 0, retryLater: false, sessionExpired: false, networkDown: false, skipped: false };
  const rows = (await queueAll()).filter((row) => row.scope === scope && row.status === "pending");

  for (const entry of rows) {
    try {
      await staffApi.post("/staff-pos/sales", entry.payload, {
        timeoutMs: UPLOAD_TIMEOUT_MS,
        redirectOnExpire: false,
      });
      await queueDelete(entry.id);
      outcome.synced += 1;
    } catch (err) {
      if (err instanceof StaffSessionExpiredError) {
        outcome.sessionExpired = true;
        break;
      }

      const message = err instanceof Error ? err.message : "Upload failed";

      if (err instanceof NetworkError) {
        await queueUpdate(entry.id, { status: "pending", attempts: entry.attempts, lastError: message });
        outcome.networkDown = true;
        outcome.retryLater = true;
        break;
      }

      const attempts = entry.attempts + 1;
      const permanent = err instanceof ApiError && !RETRYABLE_STATUS.has(err.status);
      const exhausted = err instanceof ApiError && attempts >= MAX_SERVER_ATTEMPTS;

      if (permanent || exhausted) {
        await queueUpdate(entry.id, { status: "failed", attempts, lastError: message });
        continue;
      }

      await queueUpdate(entry.id, { status: "pending", attempts, lastError: message });
      outcome.retryLater = true;
      break;
    }
  }

  return outcome;
}

export async function syncQueue(scope: string): Promise<SyncOutcome> {
  if (typeof navigator !== "undefined" && "locks" in navigator) {
    return await navigator.locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
      if (!lock) {
        return { synced: 0, retryLater: false, sessionExpired: false, networkDown: false, skipped: true };
      }
      return runSync(scope);
    });
  }
  return runSync(scope);
}