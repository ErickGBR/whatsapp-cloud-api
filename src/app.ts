import express from "express";
import whatsappRoutes from "./routes/whatsapp.routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/whatsapp", whatsappRoutes);

export default app;
