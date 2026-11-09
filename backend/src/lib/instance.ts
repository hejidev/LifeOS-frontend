import crypto from "crypto";
import os from "os";

export const BOOTED_AT = new Date();

const base = process.env.RENDER_INSTANCE_ID || `${os.hostname()}-${process.pid}`;

export const INSTANCE_ID = crypto.createHash("sha1").update(`${base}:${BOOTED_AT.getTime()}`).digest("hex").slice(0, 8);