import { Router, Response } from "express";
import { supportService } from "../services/support.service";
import { authenticate, AuthRequest } from "../middleware/auth.middleware";

const router = Router();

/**
 * POST /api/support/permissions
 * Request a break/permission.
 */
router.post("/support/permissions", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.body;

    if (!type) {
      res.status(400).json({ error: "Permission type is required" });
      return;
    }

    const permission = await supportService.requestPermission(req.user!.id, type);
    res.status(201).json(permission);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to request permission";
    res.status(400).json({ error: message });
  }
});

/**
 * POST /api/support/permissions/:id/return
 * Mark return from break.
 */
router.post("/support/permissions/:id/return", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const permissionId = parseInt(req.params.id);
    const permission = await supportService.returnFromBreak(permissionId);
    res.json(permission);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark return";
    res.status(400).json({ error: message });
  }
});

/**
 * POST /api/support/incidents
 * Report an incident.
 */
router.post("/support/incidents", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { details } = req.body;

    if (!details) {
      res.status(400).json({ error: "Incident details are required" });
      return;
    }

    const log = await supportService.reportIncident(req.user!.id, details);
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: "Failed to report incident" });
  }
});

/**
 * GET /api/support/activity
 * Get activity log for the current support user.
 */
router.get("/support/activity", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const { rows, count } = await supportService.getActivity(req.user!.id, limit);
    res.json({ rows, count });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

/**
 * GET /api/support/session
 * Get current support session info.
 */
router.get("/support/session", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const session = await supportService.getSession(req.user!.id);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

export default router;
