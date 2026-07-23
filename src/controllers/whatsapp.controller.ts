import { Request, Response } from "express";
import { botService } from "../services/bot.service";
import { productService } from "../services/product.service";

// Webhook to receive WhatsApp messages
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

    // Process incoming messages
    if (body.object === "whatsapp_business_account" && body.entry) {
      for (const entry of body.entry) {
        const changes = entry.changes;
        for (const change of changes) {
          if (change.value.messages && change.value.messages.length > 0) {
            const message = change.value.messages[0];
            const from = message.from;
            const messageText = message.text?.body || "";
            const contact = change.value.contacts?.[0];

            // Process message with the bot
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

// Endpoint to send messages manually (maintains compatibility)
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

// Endpoint to initialize products (useful for setup)
export const initProducts = async (req: Request, res: Response) => {
  try {
    await productService.initializeProducts();
    res.json({ success: true, message: "Products initialized" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
