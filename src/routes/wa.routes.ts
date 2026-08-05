import { Router, Response } from "express";
import rateLimit from "express-rate-limit";
import { authenticate, allowRoles, AuthRequest } from "../middleware/auth.middleware";
import { whatsappWebService } from "../services/whatsapp-web.service";

const router = Router();

/**
 * Status rate limit (SEC-REVIEW): 30 reads per 60s per user (fallback: IP).
 * The status endpoint is cheap but is polled by the dashboard; the per-user
 * key prevents one account from hammering it while still allowing normal
 * polling. Must run AFTER `authenticate` so req.user is populated.
 */
const statusLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
  keyGenerator: (req: AuthRequest): string => req.user?.id?.toString() || req.ip || "unknown",
});

/**
 * GET /api/whatsapp/status
 * Current WhatsApp Web connection status. The pairing QR is only exposed to
 * admins — support agents see connected/state only.
 */
router.get("/whatsapp/status", authenticate, statusLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  const status = whatsappWebService.getStatus();

  if (req.user?.role !== "admin") {
    res.json({
      connected: status.connected,
      connecting: status.connecting,
      state: status.state,
      phone: status.phone,
    });
    return;
  }

  res.json(status);
});

/**
 * POST /api/whatsapp/logout
 * Log out of WhatsApp Web (admin only): clears the session, removes the stored
 * auth state and starts a fresh pairing so a new QR is emitted.
 */
router.post("/whatsapp/logout", authenticate, allowRoles("admin"), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    await whatsappWebService.logout();
    res.json({ success: true });
  } catch (error) {
    // SEC-N1: log message only — never the full error object.
    console.error("WhatsApp logout error:", error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: "Failed to logout WhatsApp" });
  }
});

export default router;