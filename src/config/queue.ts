import Queue from "bull";
import dotenv from "dotenv";

dotenv.config();

export const messageQueue = new Queue("whatsapp-messages", {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
  },
});

messageQueue.on("error", (error) => {
  console.error("Queue error:", error);
});

messageQueue.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

