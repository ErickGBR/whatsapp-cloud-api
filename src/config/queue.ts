import Queue from "bull";
import dotenv from "dotenv";
import { isRedisConfigured } from "./redis";

dotenv.config();

// Max connection attempts before the queue gives up. The retryStrategy below
// uses exponential backoff (1s → 2s → 4s → 8s → 16s ≈ 31s total), then
// returns undefined so ioredis STOPS reconnecting (B1): no infinite
// retry-at-30s loop, and add() rejects fast with a clean error instead of
// stalling for minutes. The caller (whatsapp.service.ts) degrades to the
// direct Cloud API send on failure.
const MAX_QUEUE_CONNECT_ATTEMPTS = 5;

/**
 * Resolve the explicit ioredis connection options for Bull.
 *
 * Bull v4 IGNORES a `redis: { url }` key in its options object and would
 * silently fall back to 127.0.0.1:6379 — so we never pass `url` here (B1).
 * Priority:
 *   1. REDIS_URL (canonical per render.yaml/README) — parsed with URL() so
 *      host/port/password/username are extracted explicitly. rediss:// is
 *      handled too (TLS enabled).
 *   2. REDIS_HOST / REDIS_PORT / REDIS_PASSWORD (default localhost:6379 only
 *      when the host is explicitly intended).
 */
function getRedisConnectionOptions(): {
  host: string;
  port: number;
  password?: string;
  username?: string;
  tls?: Record<string, unknown>;
} {
  const url = process.env.REDIS_URL;
  if (url) {
    // Defensive (B1): a malformed REDIS_URL (e.g. missing scheme) would throw
    // a cryptic TypeError on boot. Fall back to the explicit REDIS_HOST /
    // REDIS_PORT / REDIS_PASSWORD vars instead of crashing the process.
    try {
      const parsed = new URL(url);
      const isTls = parsed.protocol === "rediss:";
      return {
        host: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : 6379,
        password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
        username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
        tls: isTls ? {} : undefined,
      };
    } catch (error) {
      // Do NOT log the raw URL — it may embed credentials (SEC-N7).
      console.error(
        "❌ Invalid REDIS_URL — falling back to REDIS_HOST/REDIS_PORT:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  return {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

/**
 * Minimal structural view of the ioredis client Bull creates (Bull v4's
 * Queue.client is a lazy getter). We only read `status` and subscribe to
 * lifecycle events — no direct commands, so a partial type is safe.
 */
interface RedisClientLike {
  status: string;
  once(event: "ready" | "end", cb: () => void): unknown;
}

// Lazy getter — queue is created on first access so Redis has time to be ready
let _messageQueue: Queue.Queue | null = null;

// Ready-gating (B1): Bull v4 crashes the process when its internal
// isRedisReady() promises are pending while the retryStrategy gives up
// (client emits "end" → orphaned rejections from setWorkerName() /
// _registerEvent()). To stay safe we NEVER attach the processor or the
// waiting/completed listeners until the client is actually "ready" — so no
// isRedisReady() promise is ever left pending on a dying client.
let _queueReady = false;
let _queueGaveUp = false;
let _onQueueReadyCallbacks: Array<(q: Queue.Queue) => void> = [];

/**
 * Non-operational queue returned when Redis is not configured (same fail-fast
 * policy as isRedisConfigured()). Implements the subset of the Bull API used
 * by the app (add/process/on/close) without ever connecting to Redis or
 * retrying localhost — callers keep working, but nothing is queued.
 */
class NoopQueue {
  add = async (): Promise<unknown> => undefined;
  process = (): void => undefined;
  on = (): void => undefined;
  close = async (): Promise<void> => undefined;
}

let _noopQueue: Queue.Queue | null = null;

function getNoopQueue(): Queue.Queue {
  if (!_noopQueue) {
    console.warn("⚠️ Queue disabled: Redis not configured — outgoing messages will be sent directly");
    _noopQueue = new NoopQueue() as unknown as Queue.Queue;
  }
  return _noopQueue;
}

function flushReadyCallbacks(): void {
  const callbacks = _onQueueReadyCallbacks;
  _onQueueReadyCallbacks = [];
  for (const cb of callbacks) {
    try {
      cb(_messageQueue as Queue.Queue);
    } catch (error) {
      console.error(
        "Queue ready callback error:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}

function createMessageQueue(): Queue.Queue {
  const connection = getRedisConnectionOptions();

  const queue = new Queue("whatsapp-messages", {
    redis: {
      host: connection.host,
      port: connection.port,
      password: connection.password,
      username: connection.username,
      tls: connection.tls,
      retryStrategy: (times: number) => {
        // Bounded exponential backoff: 1s → 2s → 4s → 8s → 16s, then give up
        // so add() fails fast with a clean error (no 5-minute stall, no
        // infinite retry-at-30s).
        if (times > MAX_QUEUE_CONNECT_ATTEMPTS) {
          console.error(
            `❌ Queue Redis unreachable after ${MAX_QUEUE_CONNECT_ATTEMPTS} attempts (${connection.host}:${connection.port}) — failing fast`
          );
          return undefined;
        }
        const delay = Math.min(500 * Math.pow(2, times), 30_000);
        console.warn(`🔄 Queue Redis reconnecting in ${delay}ms (attempt ${times}/${MAX_QUEUE_CONNECT_ATTEMPTS})`);
        return delay;
      },
      maxRetriesPerRequest: MAX_QUEUE_CONNECT_ATTEMPTS,
      connectTimeout: 10_000,
    },
  });

  queue.on("error", (error) => {
    // Log message only — full error objects can embed the Redis URL (SEC-006).
    console.error("Queue error:", error instanceof Error ? error.message : String(error));
  });

  // Track client readiness (no pending isRedisReady() promises from here).
  const client = (queue as unknown as { client: RedisClientLike }).client;
  if (client.status === "ready") {
    _queueReady = true;
    attachQueueLifecycleLogs(queue);
  } else {
    client.once("ready", () => {
      _queueReady = true;
      attachQueueLifecycleLogs(queue);
      flushReadyCallbacks();
    });
    client.once("end", () => {
      _queueGaveUp = true;
      console.warn("⚠️ Queue Redis connection closed — queue degraded (messages will be sent directly)");
    });
  }

  return queue;
}

/**
 * Cosmetic lifecycle logs. Attached only after the client is ready (B1) —
 * queue.on("waiting"/"completed") triggers Bull's _registerEvent(), whose
 * isRedisReady() promise would be orphaned on a dying client.
 */
function attachQueueLifecycleLogs(queue: Queue.Queue): void {
  queue.on("completed", (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });
  queue.on("waiting", (jobId) => {
    console.log(`⏳ Job ${jobId} waiting`);
  });
}

function getMessageQueue(): Queue.Queue {
  // Fail-fast: no Redis intent in the environment → never connect to localhost,
  // never retry. Return a no-op queue so callers keep the same API surface.
  if (!isRedisConfigured()) {
    return getNoopQueue();
  }

  if (!_messageQueue) {
    _messageQueue = createMessageQueue();
  }
  return _messageQueue;
}

/**
 * Invoke `callback` with the real queue once its Redis connection is ready.
 * Used to attach the job processor and optional listeners safely (B1):
 * registering them while the client is down would crash the process when the
 * bounded retryStrategy gives up. If the connection gives up before becoming
 * ready, the callback is never invoked — callers must degrade gracefully.
 */
export function onQueueReady(callback: (queue: Queue.Queue) => void): void {
  if (!isRedisConfigured()) {
    return; // NoopQueue path — nothing to register, direct send handles it
  }
  const queue = getMessageQueue();
  if (_queueReady) {
    callback(queue);
  } else if (!_queueGaveUp) {
    _onQueueReadyCallbacks.push(callback);
  }
}

export { getMessageQueue };
export type { Queue };
