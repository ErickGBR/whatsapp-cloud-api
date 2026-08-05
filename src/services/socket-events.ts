import type { Server } from "socket.io";

/**
 * socket-events — tiny realtime bridge between the backend services and the
 * Socket.io server. The server calls `setIo(io)` once at boot (see server.ts);
 * every emit here is a no-op (logged once) until then, so services can call
 * these freely without knowing whether Socket.io is wired up.
 */

let io: Server | null = null;
let warnedOnce = false;

/** Register the Socket.io server instance (called once from server.ts). */
export function setIo(server: Server): void {
  io = server;
  warnedOnce = false;
}

/** Return the io server, warning once if it was never set. */
function getIo(): Server | null {
  if (!io && !warnedOnce) {
    console.warn(
      "socket-events: Socket.io not initialized (setIo not called) — dropping realtime event"
    );
    warnedOnce = true;
  }
  return io;
}

/** Emit an event to every connected socket whose role is "admin". */
function emitToAdmins(event: string, payload: unknown): void {
  const server = getIo();
  if (!server) return;
  for (const socket of server.sockets.sockets.values()) {
    if (socket.data?.role === "admin") {
      socket.emit(event, payload);
    }
  }
}

/** WhatsApp Web connection state surfaced to admin sockets. */
export interface WaStatusPayload {
  state: "connecting" | "connected" | "disconnected" | "loggedOut";
  connected: boolean;
  connecting: boolean;
  phone?: string | null;
}

/**
 * Emit a WhatsApp pairing QR (as a data URL) to admin sockets.
 * Event: "wa:qr" — payload: { qr: string }.
 */
export function emitWaQr(payload: { qr: string }): void {
  emitToAdmins("wa:qr", payload);
}

/**
 * Emit WhatsApp Web connection status to admin sockets.
 * Event: "wa:status" — payload: WaStatusPayload.
 */
export function emitWaStatus(payload: WaStatusPayload): void {
  emitToAdmins("wa:status", payload);
}

/**
 * Emit a newly created ticket to the support room so the support panel
 * live-updates. Event: "support:new-ticket" — payload: the ticket plain object.
 */
export function emitSupportNewTicket(ticketInfo: unknown): void {
  const server = getIo();
  if (!server) return;
  server.to("support-room").emit("support:new-ticket", ticketInfo);
}

/**
 * Object-style facade over the bridge functions — services can either import
 * the named functions or use `socketEvents.emitX(...)`.
 */
export const socketEvents = {
  setIo,
  emitWaQr,
  emitWaStatus,
  emitSupportNewTicket,
};