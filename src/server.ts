import http from "http";
import app from "./app";
import { Server as SocketIOServer } from "socket.io";
import { sequelize } from "./config/database";
import { connectRedis } from "./config/redis";
import { productService } from "./services/product.service";
import { whatsappWebService } from "./services/whatsapp-web.service";
import { User } from "./models/user.model";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    // Sync models
    await sequelize.sync({ alter: true });
    console.log("✅ Database synchronized");

    // Initialize products
    await productService.initializeProducts();
    console.log("✅ Products initialized");

    // Conectar a Redis
    try {
      await connectRedis();
      console.log("✅ Redis connected");
    } catch (error) {
      console.warn("⚠️ Redis connection failed, continuing without Redis cache");
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

    // Socket.io connection handling
    io.on("connection", (socket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);

      // Support agent goes online
      socket.on("support:online", async (data: { userId: number }) => {
        try {
          await User.update({ socketStatus: "online" }, { where: { id: data.userId } });
          socket.data.userId = data.userId;
          socket.join("support-room");
          io.emit("support:status-change", { userId: data.userId, status: "online" });
          console.log(`🟢 Support user ${data.userId} is online`);
        } catch (error) {
          console.error("Error setting user online:", error);
        }
      });

      // Support agent goes offline
      socket.on("support:offline", async (data: { userId: number }) => {
        try {
          await User.update({ socketStatus: "offline" }, { where: { id: data.userId } });
          io.emit("support:status-change", { userId: data.userId, status: "offline" });
          console.log(`🔴 Support user ${data.userId} is offline`);
        } catch (error) {
          console.error("Error setting user offline:", error);
        }
      });

      // Support agent typing in a ticket
      socket.on("support:typing", (data: { ticketId: number; userId: number }) => {
        socket.to(`ticket-${data.ticketId}`).emit("support:typing", {
          userId: data.userId,
          ticketId: data.ticketId,
        });
      });

      // Join ticket room
      socket.on("ticket:join", (data: { ticketId: number }) => {
        socket.join(`ticket-${data.ticketId}`);
        console.log(`📋 User joined ticket room: ticket-${data.ticketId}`);
      });

      // Leave ticket room
      socket.on("ticket:leave", (data: { ticketId: number }) => {
        socket.leave(`ticket-${data.ticketId}`);
        console.log(`📋 User left ticket room: ticket-${data.ticketId}`);
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
            console.error("Error updating user status on disconnect:", error);
          }
        }
      });
    });

    // Make io accessible to routes via app
    app.set("io", io);

    // Iniciar WhatsApp Web client (QR pairing in CLI)
    console.log("\n📱 Starting WhatsApp Web client...");
    console.log("   (Scan the QR code with your phone to connect)\n");
    whatsappWebService.start();

    // Iniciar servidor HTTP
    server.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📱 Webhook URL: http://your-domain.com/whatsapp/webhook`);
      console.log(`📊 Dashboard API: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error("❌ Error starting server:", error);
    process.exit(1);
  }
}

startServer();
