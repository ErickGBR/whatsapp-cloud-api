
import { Router } from "express";
import { webhook, sendMessage, initProducts } from "../controllers/whatsapp.controller";

const router = Router();

// Webhook to receive WhatsApp messages (GET for verification, POST for messages)
router.get("/webhook", webhook);
router.post("/webhook", webhook);

// Compatibility endpoints
router.post("/send", sendMessage);

// Endpoint to initialize products
router.post("/init-products", initProducts);

export default router;
