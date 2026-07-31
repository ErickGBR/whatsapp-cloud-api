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
  // Debounce guard (H3): prevents concurrent start() calls when connection
  // updates fire while a reconnect is already in flight.
  private isConnecting = false;
  // Watchdog (LOW): if Baileys emits neither "open" nor "close" (perpetual
  // "connecting"), the isConnecting flag would block ALL future reconnects
  // forever. The timer force-releases the lock after 30s and is cleared on
  // open/close/start-failure.
  private connectingWatchdog: NodeJS.Timeout | null = null;

  get isReady(): boolean {
    return this.isConnected;
  }

  private setConnecting(value: boolean): void {
    this.isConnecting = value;
    if (value) {
      this.armWatchdog();
    } else {
      this.clearWatchdog();
    }
  }

  private armWatchdog(): void {
    this.clearWatchdog();
    this.connectingWatchdog = setTimeout(() => {
      if (this.isConnecting) {
        console.warn("⚠️ WhatsApp Web connection watchdog: start() stuck in connecting > 30s — releasing lock");
        this.isConnecting = false;
      }
      this.connectingWatchdog = null;
    }, 30_000);
  }

  private clearWatchdog(): void {
    if (this.connectingWatchdog) {
      clearTimeout(this.connectingWatchdog);
      this.connectingWatchdog = null;
    }
  }

  async start(): Promise<void> {
    // Skip duplicate starts (e.g. connection.close firing while a reconnect
    // is still awaiting auth state) — avoids unhandled-rejection crash loops.
    if (this.isConnecting) {
      console.warn("⚠️ WhatsApp Web start() already in progress, skipping");
      return;
    }
    this.setConnecting(true);

    try {
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
          this.setConnecting(false);
          this.isConnected = true;
          console.log("✅ WhatsApp Web connected successfully!");
          console.log(`   Connected as: ${this.sock?.user?.name || this.sock?.user?.id}`);
        }

        if (connection === "close") {
          this.setConnecting(false);
          this.isConnected = false;
          const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = reason !== DisconnectReason.loggedOut;

          if (reason === DisconnectReason.loggedOut) {
            console.log("❌ Logged out from WhatsApp. Delete auth_info/ and restart.");
            return;
          }

          console.log("⚠️ WhatsApp Web disconnected. Reconnecting...");
          if (shouldReconnect) {
            // Guarded (H3): auth state can be corrupt on ephemeral disk —
            // an unhandled rejection here would kill the process (exit 1).
            this.start().catch((err) => {
              console.error(
                "❌ WhatsApp Web reconnect failed:",
                err instanceof Error ? `${err.message}${err.stack ? `\n${err.stack}` : ""}` : String(err)
              );
            });
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
            // SEC-N1: log message only — the chain can embed axios config headers.
            console.error("Error processing web message:", error instanceof Error ? error.message : String(error));
          }
        }
      });
    } catch (error) {
      // Release the lock so a later reconnect attempt can run.
      this.setConnecting(false);
      throw error;
    }
  }

  async sendMessage(to: string, text: string): Promise<void> {
    if (!this.sock || !this.isConnected) {
      throw new Error("WhatsApp Web not connected");
    }
    await this.sock.sendMessage(to, { text });
  }
}

export const whatsappWebService = new WhatsAppWebService();
