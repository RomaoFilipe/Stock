import type { NextApiRequest, NextApiResponse } from "next";

export type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix?: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const getClientIp = (req: NextApiRequest): string => {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    return xff.split(",")[0].trim();
  }

  const xri = req.headers["x-real-ip"];
  if (typeof xri === "string" && xri.length > 0) {
    return xri;
  }

  return req.socket?.remoteAddress || "unknown";
};

const getStore = (): Map<string, Bucket> => {
  const globalAny = globalThis as unknown as { __rateLimitStore?: Map<string, Bucket> };
  if (!globalAny.__rateLimitStore) {
    globalAny.__rateLimitStore = new Map();
  }
  return globalAny.__rateLimitStore;
};

export const applyRateLimit = (
  req: NextApiRequest,
  res: NextApiResponse,
  options: RateLimitOptions
): { ok: true } | { ok: false; retryAfterSeconds: number } => {
  const store = getStore();

  const now = Date.now();
  const windowMs = options.windowMs;
  const keyPrefix = options.keyPrefix || "rl";
  const key = `${keyPrefix}:${getClientIp(req)}`;

  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (current.count >= options.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return { ok: false, retryAfterSeconds };
  }

  current.count += 1;
  store.set(key, current);
  return { ok: true };
};
