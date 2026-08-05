import express from "express";
import cors from "cors";
import helmet from "helmet";
import fs from "fs";
import path from "path";
import whatsappRoutes from "./routes/whatsapp.routes";
import authRoutes from "./routes/auth.routes";
import ticketRoutes from "./routes/ticket.routes";
import supportRoutes from "./routes/support.routes";
import adminRoutes from "./routes/admin.routes";
import waRoutes from "./routes/wa.routes";
import { getDashboardOrigin } from "./config/env";

const app = express();

// B3/SEC-N4: Render (and any single-hop proxy) forwards client IPs in
// X-Forwarded-For. Without this, req.ip is the proxy's IP and express-rate-limit
// keys every client to the SAME bucket — a global 20/15min lockout + trivial
// DoS. trust proxy = 1 means "trust one hop", i.e. the rightmost
// X-Forwarded-For entry set by Render's load balancer. Must be set BEFORE the
// rate limiters in auth.routes.ts are mounted.
app.set("trust proxy", 1);

// Middleware
// Security headers (SEC-004)
app.use(helmet());

// CORS restricted to the dashboard origin (SEC-004). Socket.io keeps its own
// CORS config in server.ts — this does not affect it.
const DASHBOARD_ORIGIN = getDashboardOrigin();
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin/server-to-server requests (no Origin header) and the
      // dashboard origin only. Disallowed origins get NO ACAO header, so the
      // browser blocks the response.
      if (!origin || origin === DASHBOARD_ORIGIN) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);
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
app.use("/api", waRoutes);

// ──────────────────────────────────────────────
// Dashboard static serving (ORDER matters: must run AFTER all API routes so
// the SPA fallback never shadows /api, /whatsapp, /health or /socket.io).
// ──────────────────────────────────────────────
const DASHBOARD_STATIC_DIR = process.env.DASHBOARD_STATIC_DIR;
if (DASHBOARD_STATIC_DIR) {
  try {
    if (fs.existsSync(DASHBOARD_STATIC_DIR)) {
      app.use(express.static(DASHBOARD_STATIC_DIR));
      // SPA fallback: serve index.html for any GET that is not an API,
      // webhook, health or socket.io path.
      app.get(/^(?!\/(api|whatsapp|health|socket\.io)).*/, (_req, res) => {
        res.sendFile(path.join(DASHBOARD_STATIC_DIR, "index.html"));
      });
    }
  } catch (error) {
    // SEC-N1: log message only — never the full error object.
    console.error(
      "Dashboard static serving error:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

export default app;
