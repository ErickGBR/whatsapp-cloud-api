import http from "http";
import fs from "fs";
import path from "path";
import app from "./app";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { sequelize } from "./config/database";
import { connectRedis, isRedisConfigured } from "./config/redis";
import { productService } from "./services/product.service";
import { whatsappWebService } from "./services/whatsapp-web.service";
import { setIo } from "./services/socket-events";
import { authService } from "./services/auth.service";
import { getJwtSecret, isDemoMode } from "./config/env";
import { User } from "./models/user.model";
import { Ticket } from "./models/ticket.model";
import dotenv from "dotenv";

dotenv.config();

// Fail-fast (SEC-001): shared secret with auth.service.ts / auth.middleware.ts
// via src/config/env.ts — throws at boot in production if JWT_SECRET is missing.
const JWT_SECRET = getJwtSecret();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Ensure data directory exists (for Render Node runtime)
    const dataDir = process.env.DB_STORAGE
      ? path.dirname(process.env.DB_STORAGE)
      : path.join(__dirname, "..", "data");
    fs.mkdirSync(dataDir, { recursive: true });

    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    // Sync models
    await sequelize.sync({ alter: false });
    console.log("✅ Database synchronized");

    // Seed default admin user if not exists
    const seeded = await authService.seedAdmin();
    if (seeded) {
      // SEC-002: never log the admin password — only the email.
      console.log(`✅ Default admin user seeded (${seeded.email})`);
    }

    // Seed demo support user (SEC-DEMO) — only in demo mode. The password is
    // public demo data, but we still never log it.
    if (isDemoMode()) {
      const demo = await authService.ensureDemoCredentials();
      if (demo) console.log(`✅ Demo support user seeded (${demo.email})`); // NEVER log password
    }

    // Initialize products
    await productService.initializeProducts();
    console.log("✅ Products initialized");

    // Conectar a Redis (BUG-001: log honesto según el resultado real)
    const redisConnected = await connectRedis();
    if (redisConnected) {
      console.log("✅ Redis connected");
    } else if (isRedisConfigured()) {
      console.warn("⚠️ Redis connection failed, continuing without Redis cache");
    } else {
      console.warn("⚠️ Redis skipped (not configured)");
    }

    // Create HTTP server
    const server = http.createServer(app);

    // Set up Socket.io
    const io = new SocketIOServer(server, {
      cors: {
        origin: process.env.DASHBOARD_ORIGIN || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // ── Socket.io authentication (SEC-N5) ────────────────────────────────
    // Rejects any client that does not present a valid JWT in the handshake
    // (socket.io-client `auth: { token }`). Without this, any client could
    // emit support:online/offline with an arbitrary userId (flipping any
    // user's online state) or join any ticket room (cross-ticket exposure).
    io.use(async (socket, next) => {
      const token = (socket.handshake.auth as { token?: string } | undefined)?.token;
      if (!token) {
        console.warn(`🔒 Socket auth rejected (${socket.id}): no token in handshake`);
        next(new Error("unauthorized"));
        return;
      }

      let decoded: { id: number };
      try {
        decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      } catch {
        console.warn(`🔒 Socket auth rejected (${socket.id}): invalid token`);
        next(new Error("unauthorized"));
        return;
      }

      try {
        const user = await User.findByPk(decoded.id);
        if (!user || !user.active) {
          console.warn(`🔒 Socket auth rejected (${socket.id}): user ${decoded.id} missing or inactive`);
          next(new Error("unauthorized"));
          return;
        }
        // Identity comes from the verified token ONLY — never from client data.
        socket.data.userId = user.id;
        socket.data.role = user.role;
        next();
      } catch (error) {
        console.error(
          "🔒 Socket auth error:",
          error instanceof Error ? error.message : String(error)
        );
        next(new Error("unauthorized"));
      }
    });

    // Socket.io connection handling
    io.on("connection", (socket) => {
      console.log(`🔌 Socket connected: ${socket.id} (user ${socket.data.userId}, role ${socket.data.role})`);

      // Support agent goes online — userId is derived from the verified JWT,
      // NEVER from client data (SEC-N5).
      socket.on("support:online", async () => {
        const userId = socket.data.userId as number;
        try {
          await User.update({ socketStatus: "online" }, { where: { id: userId } });
          socket.join("support-room");
          io.emit("support:status-change", { userId, status: "online" });
          console.log(`🟢 Support user ${userId} is online`);
        } catch (error) {
          console.error("Error setting user online:", error instanceof Error ? error.message : String(error));
        }
      });

      // Support agent goes offline — userId from token (SEC-N5).
      socket.on("support:offline", async () => {
        const userId = socket.data.userId as number;
        try {
          await User.update({ socketStatus: "offline" }, { where: { id: userId } });
          io.emit("support:status-change", { userId, status: "offline" });
          console.log(`🔴 Support user ${userId} is offline`);
        } catch (error) {
          console.error("Error setting user offline:", error instanceof Error ? error.message : String(error));
        }
      });

      // Support agent typing in a ticket — userId from token (SEC-N5).
      socket.on("support:typing", (data: { ticketId: number }) => {
        socket.to(`ticket-${data.ticketId}`).emit("support:typing", {
          userId: socket.data.userId,
          ticketId: data.ticketId,
        });
      });

      // Join ticket room — access check (SEC-N5): admins may join any ticket,
      // support agents only tickets assigned to them. Unauthorized joins are
      // rejected so rooms never leak cross-ticket messages.
      socket.on("ticket:join", async (data: { ticketId: number }, ack?: (response: { ok: boolean; error?: string }) => void) => {
        const userId = socket.data.userId as number;
        const role = socket.data.role as string;
        const ticketId = Number(data.ticketId);

        try {
          const ticket = await Ticket.findByPk(ticketId);
          if (!ticket) {
            const denied = { ok: false, error: "ticket-not-found" };
            if (typeof ack === "function") ack(denied);
            else socket.emit("ticket:join-denied", { ticketId, error: "ticket-not-found" });
            return;
          }

          const isAdmin = role === "admin";
          const isAssigned = ticket.assignedTo === userId;
          if (!isAdmin && !isAssigned) {
            console.warn(`🔒 Socket user ${userId} denied join ticket room ${ticketId} (not assigned, role=${role})`);
            const denied = { ok: false, error: "forbidden" };
            if (typeof ack === "function") ack(denied);
            else socket.emit("ticket:join-denied", { ticketId, error: "forbidden" });
            return;
          }

          socket.join(`ticket-${ticketId}`);
          if (typeof ack === "function") ack({ ok: true });
          console.log(`📋 User ${userId} joined ticket room: ticket-${ticketId}`);
        } catch (error) {
          console.error("Error joining ticket room:", error instanceof Error ? error.message : String(error));
          if (typeof ack === "function") ack({ ok: false, error: "internal" });
        }
      });

      // Leave ticket room
      socket.on("ticket:leave", (data: { ticketId: number }) => {
        socket.leave(`ticket-${data.ticketId}`);
        console.log(`📋 User ${socket.data.userId} left ticket room: ticket-${data.ticketId}`);
      });

      // Handle disconnect
      socket.on("disconnect", async () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
        if (socket.data.userId) {
          try {
            await User.update(
              { socketStatus: "offline" },
              { where: { id: socket.data.userId } }
            );
            io.emit("support:status-change", {
              userId: socket.data.userId,
              status: "offline",
            });
          } catch (error) {
            console.error("Error updating user status on disconnect:", error instanceof Error ? error.message : String(error));
          }
        }
      });
    });

    // Make io accessible to routes via app
    app.set("io", io);

    // Single point that connects the realtime event bus (socket-events) to the
    // Socket.io server — wa:qr / wa:status / support:new-ticket emissions rely
    // on this. Must run before whatsappWebService.start() below.
    setIo(io);

    // Iniciar WhatsApp Web client (QR pairing in CLI)
    // Headless deploy: Cloud API is the primary channel; Baileys is optional, so its failure must NOT kill the process
    console.log("\n📱 Starting WhatsApp Web client...");
    console.log("   (Scan the QR code with your phone to connect)\n");
    whatsappWebService.start().catch((err) => {
      // SEC-006: log message + stack only — never the full object (can embed URLs/credentials)
      console.error(
        "❌ WhatsApp Web client failed:",
        err instanceof Error ? `${err.message}${err.stack ? `\n${err.stack}` : ""}` : String(err)
      );
    });

    // Iniciar servidor HTTP
    server.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📱 Webhook URL: http://your-domain.com/whatsapp/webhook`);
      console.log(`📊 Dashboard API: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    // SEC-006: message + stack only — never the full error object.
    console.error(
      "❌ Error starting server:",
      error instanceof Error ? `${error.message}${error.stack ? `\n${error.stack}` : ""}` : String(error)
    );
    process.exit(1);
  }
}

startServer();
