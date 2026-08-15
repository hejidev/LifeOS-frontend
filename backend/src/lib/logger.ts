import { env } from "../config/env";

const isDev = env.NODE_ENV !== "production";

export const logger = {
  info: (...args: unknown[]) => console.log("[info]", ...args),
  warn: (...args: unknown[]) => console.warn("[warn]", ...args),
  error: (...args: unknown[]) => console.error("[error]", ...args),
  debug: (...args: unknown[]) => {
    if (isDev) console.debug("[debug]", ...args);
  },
};