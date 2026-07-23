import express from "express";
import cors from "cors";
import whatsappRoutes from "./routes/whatsapp.routes";
import authRoutes from "./routes/auth.routes";
import ticketRoutes from "./routes/ticket.routes";
import supportRoutes from "./routes/support.routes";
import adminRoutes from "./routes/admin.routes";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/whatsapp", whatsappRoutes);
app.use("/api", authRoutes);
app.use("/api", ticketRoutes);
app.use("/api", supportRoutes);
app.use("/api", adminRoutes);

export default app;
