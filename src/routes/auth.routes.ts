import { Router, Request, Response } from "express";
import { authService } from "../services/auth.service";
import { authenticate, AuthRequest } from "../middleware/auth.middleware";

const router = Router();

/**
 * POST /api/auth/login
 * Authenticate user with email and password, returns JWT.
 */
router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    res.status(401).json({ error: message });
  }
});

/**
 * GET /api/auth/me
 * Return currently authenticated user.
 */
router.get("/auth/me", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      active: user.active,
      socketStatus: user.socketStatus,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get user info" });
  }
});

/**
 * POST /api/auth/seed
 * Create default admin user if none exists.
 */
router.post("/auth/seed", async (_req: Request, res: Response): Promise<void> => {
  try {
    const admin = await authService.seedAdmin();
    if (admin) {
      res.json({ message: "Default admin created", user: { email: admin.email, role: admin.role } });
    } else {
      res.json({ message: "Default admin already exists" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to seed admin" });
  }
});

export default router;
