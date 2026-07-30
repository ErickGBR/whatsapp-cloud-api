import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      // Exponential backoff: 500ms → 1s → 2s → 4s → max 30s
      const delay = Math.min(500 * Math.pow(2, retries), 30_000);
      console.warn(`🔄 Redis reconnecting in ${delay}ms (attempt ${retries + 1})`);
      return delay;
    },
    connectTimeout: 10_000,
  },
});

redisClient.on("error", (err) => {
  // Only log non-reconnect errors to avoid noise during retries
  if (!err.message?.includes("reconnect")) {
    console.error("❌ Redis Client Error:", err.message);
  }
});

redisClient.on("connect", () => console.log("🔌 Redis Client Connected"));
redisClient.on("ready", () => console.log("✅ Redis ready"));
redisClient.on("end", () => console.warn("⚠️ Redis connection closed"));

export const connectRedis = async (): Promise<void> => {
  const maxRetries = 10;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      return; // success
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt < maxRetries) {
        const delay = Math.min(500 * Math.pow(2, attempt), 10_000);
        console.warn(`⏳ Redis connect attempt ${attempt}/${maxRetries} failed: ${message}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(`❌ Redis connect failed after ${maxRetries} attempts: ${message}`);
        throw error; // propagate after exhausting retries
      }
    }
  }
};

