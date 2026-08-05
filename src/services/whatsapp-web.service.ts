import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as qrcode from "qrcode-terminal";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { botService } from "./bot.service";
import { socketEvents } from "./socket-events";

export type WaConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "loggedOut";

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

  // Realtime state surfaced via GET /api/whatsapp/status and the
  // wa:status / wa:qr socket events (admin dashboard).
  private state: WaConnectionState = "disconnected";
  private phone: string | null = null;
  private lastQr: string | null = null;

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
    this.state = "connecting";
    socketEvents.emitWaStatus({
      state: "connecting",
      connecting: true,
      connected: false,
      phone: this.phone,
    });

    try {
      const { state, saveCreds } = await useMultiFileAuthState("auth_info");

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
      });
      this.sock = sock;

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", async (update) => {
        // Stale-socket guard: ignore events from superseded sockets (e.g. the
        // previous socket right after logout() replaced this.sock), so a
        // closing old socket cannot clobber the fresh session's state.
        if (this.sock !== sock) return;

        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log("\n==========================================");
          console.log("  SCAN THIS QR CODE WITH WHATSAPP");
          console.log("  Open WhatsApp > Linked Devices > Link");
          console.log("==========================================\n");
          qrcode.generate(qr, { small: true });
          console.log("\n==========================================\n");

          try {
            const qrDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 1 });
            this.lastQr = qrDataUrl;
            socketEvents.emitWaQr({ qr: qrDataUrl });
          } catch (qrError) {
            // SEC-N1: log message only.
            console.error(
              "QR data URL generation failed:",
              qrError instanceof Error ? qrError.message : String(qrError)
            );
          }
        }

        if (connection === "open") {
          this.setConnecting(false);
          this.isConnected = true;
          this.state = "connected";
          this.phone = sock.user?.id || null;
          this.lastQr = null; // QR consumed on pairing
          console.log("✅ WhatsApp Web connected successfully!");
          console.log(`   Connected as: ${sock.user?.name || sock.user?.id}`);
          socketEvents.emitWaStatus({
            state: "connected",
            connecting: false,
            connected: true,
            phone: this.phone,
          });
        }

        if (connection === "close") {
          this.setConnecting(false);
          this.isConnected = false;
          const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = reason !== DisconnectReason.loggedOut;

          if (reason === DisconnectReason.loggedOut) {
            this.state = "loggedOut";
            this.phone = null;
            this.lastQr = null;
            console.log("❌ Logged out from WhatsApp. Delete auth_info/ and restart.");
            socketEvents.emitWaStatus({
              state: "loggedOut",
              connecting: false,
              connected: false,
              phone: null,
            });
            return;
          }

          this.state = "disconnected";
          console.log("⚠️ WhatsApp Web disconnected. Reconnecting...");
          socketEvents.emitWaStatus({
            state: "disconnected",
            connecting: false,
            connected: false,
            phone: this.phone,
          });

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

  /**
   * Current WhatsApp Web status. `qr` is the last generated pairing QR as a
   * data URL (null until a QR is produced, cleared once connected) — the
   * route layer decides whether to expose it (admin-only).
   */
  getStatus(): {
    connected: boolean;
    connecting: boolean;
    state: WaConnectionState;
    phone: string | null;
    qr: string | null;
  } {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      state: this.state,
      phone: this.phone,
      qr: this.lastQr,
    };
  }

  /**
   * Log out of WhatsApp Web: close the current session, remove the stored
   * auth state and immediately start a fresh session so a new QR is emitted.
   */
  async logout(): Promise<void> {
    // Detach first so the closing socket's events are ignored by the
    // stale-socket guard and cannot clobber the fresh session's state.
    const oldSock = this.sock;
    this.sock = null;

    if (oldSock) {
      try {
        // NOTE: Baileys rc13 exposes end() (not close()) on WASocket.
        await oldSock.end(new Error("logout"));
      } catch (error) {
        console.error(
          "WhatsApp Web logout close error:",
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    this.isConnected = false;
    this.state = "loggedOut";
    this.phone = null;
    this.lastQr = null;

    try {
      fs.rmSync(path.join(process.cwd(), "auth_info"), { recursive: true, force: true });
    } catch (error) {
      console.error(
        "WhatsApp Web logout: failed to remove auth_info:",
        error instanceof Error ? error.message : String(error)
      );
    }

    // Release any stale connecting lock so the fresh session can start.
    this.setConnecting(false);

    this.start().catch((err) => {
      console.error(
        "❌ WhatsApp Web restart after logout failed:",
        err instanceof Error ? `${err.message}${err.stack ? `\n${err.stack}` : ""}` : String(err)
      );
    });
  }
}

export const whatsappWebService = new WhatsAppWebService();