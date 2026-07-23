import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as qrcode from "qrcode-terminal";
import { botService } from "./bot.service";

class WhatsAppWebService {
  private sock: WASocket | null = null;
  private isConnected = false;

  get isReady(): boolean {
    return this.isConnected;
  }

  async start(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });

    this.sock.ev.on("creds.update", saveCreds);

    this.sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log("\n==========================================");
        console.log("  SCAN THIS QR CODE WITH WHATSAPP");
        console.log("  Open WhatsApp > Linked Devices > Link");
        console.log("==========================================\n");
        qrcode.generate(qr, { small: true });
        console.log("\n==========================================\n");
      }

      if (connection === "open") {
        this.isConnected = true;
        console.log("✅ WhatsApp Web connected successfully!");
        console.log(`   Connected as: ${this.sock?.user?.name || this.sock?.user?.id}`);
      }

      if (connection === "close") {
        this.isConnected = false;
        const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = reason !== DisconnectReason.loggedOut;

        if (reason === DisconnectReason.loggedOut) {
          console.log("❌ Logged out from WhatsApp. Delete auth_info/ and restart.");
          return;
        }

        console.log("⚠️ WhatsApp Web disconnected. Reconnecting...");
        if (shouldReconnect) {
          this.start();
        }
      }
    });

    this.sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        if (!msg.message) continue;

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          "";

        const from = msg.key.remoteJid;
        if (!from || !text) continue;

        const pushName = msg.pushName || "User";

        try {
          await botService.handleMessage(from, text, pushName);
        } catch (error) {
          console.error("Error processing web message:", error);
        }
      }
    });
  }

  async sendMessage(to: string, text: string): Promise<void> {
    if (!this.sock || !this.isConnected) {
      throw new Error("WhatsApp Web not connected");
    }
    await this.sock.sendMessage(to, { text });
  }
}

export const whatsappWebService = new WhatsAppWebService();
