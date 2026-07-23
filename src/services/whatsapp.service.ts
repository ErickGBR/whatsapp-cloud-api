import axios from "axios";
import dotenv from "dotenv";
import { messageQueue } from "../config/queue";
import { whatsappWebService } from "./whatsapp-web.service";

dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export const sendWhatsAppMessage = async (to: string, message: string) => {
  if (whatsappWebService.isReady) {
    await whatsappWebService.sendMessage(to, message);
    return;
  }
  await messageQueue.add("send-message", { to, message });
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
  } catch (error: any) {
    console.error("Error sending WhatsApp message:", error.response?.data || error.message);
    throw error;
  }
};

// Procesar mensajes de la cola
messageQueue.process("send-message", async (job) => {
  const { to, message } = job.data;
  await sendWhatsAppMessageDirect(to, message);
});
