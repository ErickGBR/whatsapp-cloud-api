import { Router, Response } from "express";
import { adminService } from "../services/admin.service";
import { metricsService } from "../services/metrics.service";
import { authService } from "../services/auth.service";
import { ActivityLog } from "../models/activity-log.model";
import { authenticate, allowRoles, AuthRequest } from "../middleware/auth.middleware";

const router = Router();

// All admin routes require admin role
router.use("/admin", authenticate, allowRoles("admin"));

/**
 * GET /api/admin/supports
 * List all support agents with their status.
 */
router.get("/admin/supports", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const supports = await adminService.getActiveSupports();
    res.json(supports);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch support agents" });
  }
});

/**
 * GET /api/admin/metrics
 * Get dashboard metrics.
 */
router.get("/admin/metrics", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const metrics = await metricsService.getDashboardMetrics();
    res.json(metrics);
  } catch (error) {
    // SEC-N1: log message only — never the full error object.
    console.error("Metrics error:", error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

/**
 * GET /api/admin/activity-logs
 * Get all activity logs.
 */
router.get("/admin/activity-logs", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters: Record<string, unknown> = {};

    if (req.query.userId) {
      filters.userId = parseInt(req.query.userId as string);
    }
    if (req.query.action) {
      filters.action = req.query.action as string;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await adminService.getActivityLogs({
      ...filters,
      limit,
      offset,
    } as { userId?: number; action?: string; limit?: number; offset?: number });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
});

/**
 * GET /api/admin/permissions/pending
 * Get all pending permission requests.
 */
router.get("/admin/permissions/pending", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const permissions = await adminService.getPendingPermissions();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pending permissions" });
  }
});

/**
 * PATCH /api/admin/permissions/:id
 * Approve or deny a permission request.
 */
router.patch("/admin/permissions/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const permissionId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status || !["approved", "denied"].includes(status)) {
      res.status(400).json({ error: "Status must be 'approved' or 'denied'" });
      return;
    }

    const permission = await adminService.approvePermission(permissionId, req.user!.id, status);

    if (!permission) {
      res.status(404).json({ error: "Permission request not found" });
      return;
    }

    res.json(permission);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update permission";
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/admin/users
 * List all users.
 */
router.get("/admin/users", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { User } = await import("../models/user.model");
    const users = await User.findAll({
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/**
 * POST /api/admin/users
 * Create a new user.
 */
router.post("/admin/users", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email, and password are required" });
      return;
    }

    const user = await authService.createUser({
      name,
      email,
      password,
      role: role || "support",
      phone,
    });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      active: user.active,
      createdAt: user.createdAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create user";
    res.status(400).json({ error: message });
  }
});

// ──────────────────────────────────────────────
// FRONTEND-COMPATIBLE ALIASES
// These routes match what the dashboard frontend expects.
// ──────────────────────────────────────────────

/**
 * GET /api/metrics/dashboard
 * Alias for /api/admin/metrics — frontend useMetrics hook.
 */
router.get("/metrics/dashboard", authenticate, allowRoles("admin"), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const metrics = await metricsService.getDashboardMetrics();
    res.json(metrics);
  } catch (error) {
    // SEC-N1: log message only — never the full error object.
    console.error("Metrics error:", error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

/**
 * GET /api/users/support
 * Alias for /api/admin/supports — frontend Agents page.
 */
router.get("/users/support", authenticate, allowRoles("admin"), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const supports = await adminService.getActiveSupports();
    res.json(supports);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch support agents" });
  }
});

/**
 * POST /api/activity
 * Create an activity log entry (e.g., incident reporting from frontend).
 */
router.post("/activity", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { action, details } = req.body;

    if (!action) {
      res.status(400).json({ error: "Action is required" });
      return;
    }

    const log = await ActivityLog.create({
      userId: req.user!.id,
      action,
      details: details || null,
    });

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: "Failed to create activity log" });
  }
});

/**
 * GET /api/activity
 * Alias for /api/admin/activity-logs — frontend ActivityLogs pages.
 * Supports same query params: userId, action, limit, offset.
 */
router.get("/activity", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters: Record<string, unknown> = {};

    if (req.query.userId) {
      filters.userId = parseInt(req.query.userId as string);
    }
    if (req.query.action) {
      filters.action = req.query.action as string;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await adminService.getActivityLogs({
      ...filters,
      limit,
      offset,
    } as { userId?: number; action?: string; limit?: number; offset?: number });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
});

/**
 * GET /api/permissions
 * Alias for /api/admin/permissions/pending — frontend Permissions page.
 */
router.get("/permissions", authenticate, allowRoles("admin"), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const permissions = await adminService.getPendingPermissions();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pending permissions" });
  }
});

/**
 * PATCH /api/permissions/:id
 * Alias for PATCH /api/admin/permissions/:id — frontend Permissions page.
 */
router.patch("/permissions/:id", authenticate, allowRoles("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const permissionId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status || !["approved", "denied"].includes(status)) {
      res.status(400).json({ error: "Status must be 'approved' or 'denied'" });
      return;
    }

    const permission = await adminService.approvePermission(permissionId, req.user!.id, status);

    if (!permission) {
      res.status(404).json({ error: "Permission request not found" });
      return;
    }

    res.json(permission);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update permission";
    res.status(400).json({ error: message });
  }
});

export default router;
