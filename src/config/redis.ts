import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

/**
 * Redis is considered configured only when there is an explicit intent:
 * - REDIS_URL set, OR
 * - REDIS_HOST set (with optional REDIS_PORT), OR
 * - REDIS_PORT set alone.
 * An empty environment (no REDIS_URL/REDIS_HOST/REDIS_PORT) means no Redis
 * (e.g. Render plan without a Redis service) → fail fast, never fall back to
 * redis://localhost:6379 implicitly.
 */
export const isRedisConfigured = (): boolean =>
  Boolean(process.env.REDIS_URL || process.env.REDIS_HOST || process.env.REDIS_PORT);

/**
 * Strip credentials (user:pass) from Redis error messages before logging so
 * REDIS_URL secrets never leak (SEC-006/SEC-N7). Covers BOTH redis:// and
 * rediss:// (TLS) URLs: redis://user:pass@host:6379 or
 * rediss://user:pass@host:6379 becomes redis://***@host:6379.
 */
const sanitizeRedisError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/(rediss?|redis):\/\/[^@\s/]+@/g, "$1://***@");
};

// Max reconnection attempts for the client's OWN strategy before it gives up.
// Bounded (B1/SEC-N7): with an infinite reconnectStrategy (round 2),
// redisClient.connect() NEVER settles when Redis is unreachable, so
// connectRedis() never resolves and the server never finishes booting.
const MAX_REDIS_RECONNECT_ATTEMPTS = 3;

// Fallback to localhost only when there is explicit intent (e.g. REDIS_HOST set)
const REDIS_URL = process.env.REDIS_URL
  || (isRedisConfigured() ? `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}` : "");

export const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      // Give up: return false so connect() rejects and connectRedis() can
      // resolve false — the boot continues without Redis (fail-fast).
      if (retries >= MAX_REDIS_RECONNECT_ATTEMPTS) {
        console.error(`❌ Redis unreachable after ${MAX_REDIS_RECONNECT_ATTEMPTS} reconnect attempts — giving up`);
        return false;
      }
      // Exponential backoff: 500ms → 1s → 2s → 4s
      const delay = Math.min(500 * Math.pow(2, retries), 10_000);
      console.warn(`🔄 Redis reconnecting in ${delay}ms (attempt ${retries + 1}/${MAX_REDIS_RECONNECT_ATTEMPTS})`);
      return delay;
    },
    connectTimeout: 10_000,
  },
});

redisClient.on("error", (err) => {
  // Only log non-reconnect errors to avoid noise during retries
  if (!err.message?.includes("reconnect")) {
    console.error("❌ Redis Client Error:", sanitizeRedisError(err));
  }
});

redisClient.on("connect", () => console.log("🔌 Redis Client Connected"));
redisClient.on("ready", () => console.log("✅ Redis ready"));
redisClient.on("end", () => console.warn("⚠️ Redis connection closed"));

/**
 * Connect to Redis, honoring the fail-fast policy (BUG-001):
 * - no Redis config in environment → resolve false (skip, no localhost fallback, no retries)
 * - connected → resolve true
 * - configured but unreachable after retries → log the (sanitized) failure and resolve false,
 *   so the boot never crashes because of optional Redis.
 *
 * Note (B1): each `redisClient.connect()` settles fast now — the client's own
 * reconnectStrategy is bounded (gives up after MAX_REDIS_RECONNECT_ATTEMPTS) —
 * so 3 outer attempts is enough to cover a flaky-but-recoverable Redis while
 * keeping the boot bounded (~25s worst case instead of hanging forever).
 */
export const connectRedis = async (): Promise<boolean> => {
  // Fail-fast: no Redis config in environment → skip entirely
  if (!isRedisConfigured()) {
    return false;
  }

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      return true; // success
    } catch (error) {
      const message = sanitizeRedisError(error);
      if (attempt < maxRetries) {
        const delay = Math.min(500 * Math.pow(2, attempt), 5_000);
        console.warn(`⏳ Redis connect attempt ${attempt}/${maxRetries} failed: ${message}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(`❌ Redis connect failed after ${maxRetries} attempts: ${message}`);
        return false; // fail without crashing the boot
      }
    }
  }
  return false; // unreachable — satisfies TS control flow
};
