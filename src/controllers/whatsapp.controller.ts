import { Request, Response } from "express";
import { botService } from "../services/bot.service";
import { productService } from "../services/product.service";

// Webhook para recibir mensajes de WhatsApp
export const webhook = async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Webhook verification (Meta requires this)
    if (body.object === "whatsapp_business_account") {
      if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === process.env.WEBHOOK_VERIFY_TOKEN) {
        console.log("Webhook verified");
        res.status(200).send(req.query["hub.challenge"]);
        return;
      }
    }

    // Procesar mensajes entrantes
    if (body.object === "whatsapp_business_account" && body.entry) {
      for (const entry of body.entry) {
        const changes = entry.changes;
        for (const change of changes) {
          if (change.value.messages && change.value.messages.length > 0) {
            const message = change.value.messages[0];
            const from = message.from;
            const messageText = message.text?.body || "";
            const contact = change.value.contacts?.[0];

            // Procesar mensaje con el bot
            await botService.handleMessage(
              from,
              messageText,
              contact?.profile?.name
            );
          }
        }
      }
    }

    res.status(200).send("OK");
  } catch (error: any) {
    console.error("Error in webhook:", error);
    res.status(500).send("Error");
  }
};

// Endpoint para enviar mensajes manualmente (mantener compatibilidad)
export const sendMessage = async (req: Request, res: Response) => {
  const { to, message } = req.body;
  try {
    const { sendWhatsAppMessage } = await import("../services/whatsapp.service");
    await sendWhatsAppMessage(to, message);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Endpoint para obtener contenido Markdown (mantener compatibilidad)
export const getMdContent = (req: Request, res: Response) => {
  const { filename } = req.params;
  try {
    const { readMarkdown } = require("../services/md-reader.service");
    const content = readMarkdown(filename);
    res.json({ success: true, content });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Endpoint para inicializar productos (útil para setup)
export const initProducts = async (req: Request, res: Response) => {
  try {
    await productService.initializeProducts();
    res.json({ success: true, message: "Products initialized" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
