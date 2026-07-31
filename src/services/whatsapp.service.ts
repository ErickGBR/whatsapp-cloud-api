import axios from "axios";
import dotenv from "dotenv";
import { getMessageQueue, onQueueReady } from "../config/queue";
import { isRedisConfigured } from "../config/redis";
import { whatsappWebService } from "./whatsapp-web.service";

dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export const sendWhatsAppMessage = async (to: string, message: string) => {
  if (whatsappWebService.isReady) {
    await whatsappWebService.sendMessage(to, message);
    return;
  }

  // Redis absent → degrade to WhatsApp Cloud API directly (H2, fail-fast
  // policy): no queue, no retries to localhost, no crash.
  if (!isRedisConfigured()) {
    // Touch the queue once so the NoopQueue singleton logs
    // "⚠️ Queue disabled..." exactly one time (BUG-001).
    getMessageQueue();
    await sendWhatsAppMessageDirect(to, message);
    return;
  }

  // Redis configured but unreachable (B1): the queue's bounded retryStrategy
  // makes add() reject fast instead of stalling for minutes. Degrade to the
  // direct Cloud API send rather than dropping the message.
  try {
    await getMessageQueue().add("send-message", { to, message });
  } catch (error) {
    console.warn(
      "Queue unavailable, degrading to direct WhatsApp Cloud API send:",
      error instanceof Error ? error.message : String(error)
    );
    await sendWhatsAppMessageDirect(to, message);
  }
};

export const sendWhatsAppMessageDirect = async (to: string, message: string) => {
  if (whatsappWebService.isReady) {
    await whatsappWebService.sendMessage(to, message);
    return;
  }

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error("WhatsApp Cloud API not configured and Web not connected");
    return;
  }

  const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;
  const data = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: message },
  };

  const headers = {
    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    "Content-Type": "application/json",
  };

  try {
    await axios.post(url, data, { headers });
  } catch (error) {
    // SEC-N1: NEVER re-throw the raw axios error — its object embeds
    // error.config.headers.Authorization ("Bearer <WHATSAPP_TOKEN>") and any
    // caller logging the full object would leak the token. Log only the
    // sanitized response message and throw a clean Error without credentials.
    const status =
      typeof error === "object" && error !== null && "response" in error
        ? ((error as { response?: { status?: number } }).response?.status ?? null)
        : null;
    const apiMessage =
      typeof error === "object" && error !== null && "response" in error
        ? ((error as { response?: { data?: { error?: { message?: string } } } })
            .response?.data?.error?.message ?? null)
        : null;
    const fallbackMessage = error instanceof Error ? error.message : String(error);

    const detail = apiMessage ?? fallbackMessage;
    console.error(
      `WhatsApp API error${status ? ` (HTTP ${status})` : ""}: ${detail}`
    );
    throw new Error(
      `WhatsApp API error${status ? ` (HTTP ${status})` : ""}: ${detail}`
    );
  }
};

// Register queue processor ONLY once the queue's Redis connection is ready
// (B1). Bull v4 crashes the process if the processor is attached while the
// connection is down and the bounded retryStrategy gives up (orphaned
// isRedisReady() promise). If Redis never becomes ready, the callback never
// runs and sendWhatsAppMessage degrades to the direct Cloud API path instead.
onQueueReady((queue) => {
  queue.process("send-message", async (job) => {
    const { to, message } = job.data;
    await sendWhatsAppMessageDirect(to, message);
  });
});
