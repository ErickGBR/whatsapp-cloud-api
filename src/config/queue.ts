import Queue from "bull";
import dotenv from "dotenv";

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

// Lazy getter — queue is created on first access so Redis has time to be ready
let _messageQueue: Queue.Queue | null = null;

function getMessageQueue(): Queue.Queue {
  if (!_messageQueue) {
    _messageQueue = new Queue("whatsapp-messages", {
      redis: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        retryStrategy: (times: number) => {
          // Exponential backoff: 500ms → 1s → 2s → 4s → max 30s
          const delay = Math.min(500 * Math.pow(2, times), 30_000);
          console.warn(`🔄 Queue Redis reconnecting in ${delay}ms (attempt ${times})`);
          return delay;
        },
        maxRetriesPerRequest: 15,
        connectTimeout: 10_000,
      },
    });

    _messageQueue.on("error", (error) => {
      console.error("Queue error:", error);
    });

    _messageQueue.on("completed", (job) => {
      console.log(`✅ Job ${job.id} completed`);
    });

    _messageQueue.on("waiting", (jobId) => {
      console.log(`⏳ Job ${jobId} waiting`);
    });
  }
  return _messageQueue;
}

export { getMessageQueue };
export type { Queue };

