import { Permission } from "../models/permission.model";
import { ActivityLog } from "../models/activity-log.model";
import { User } from "../models/user.model";

export class SupportService {
  /**
   * Request a break/permission.
   */
  async requestPermission(userId: number, type: string): Promise<Permission> {
    const validTypes = ["break", "bathroom", "eating", "other"];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid permission type. Must be one of: ${validTypes.join(", ")}`);
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Update socket status
    await user.update({ socketStatus: "onBreak" });

    const permission = await Permission.create({
      userId,
      type,
      status: "pending",
      requestedAt: new Date(),
    });

    // Log activity
    await ActivityLog.create({
      userId,
      action: "request_break",
      details: JSON.stringify({ permissionId: permission.id, type }),
    });

    return permission;
  }

  /**
   * Mark return from break and calculate actual duration.
   */
  async returnFromBreak(permissionId: number): Promise<Permission> {
    const permission = await Permission.findByPk(permissionId);
    if (!permission) {
      throw new Error("Permission request not found");
    }

    const now = new Date();
    const requestedAt = new Date(permission.requestedAt);
    const actualDuration = Math.round((now.getTime() - requestedAt.getTime()) / 60000);

    permission.actualDuration = actualDuration;
    permission.status = "approved";
    permission.approvedAt = now;
    await permission.save();

    // Restore user's socket status
    const user = await User.findByPk(permission.userId);
    if (user) {
      await user.update({ socketStatus: "online" });
    }

    return permission;
  }

  /**
   * Report an incident.
   */
  async reportIncident(userId: number, details: string): Promise<ActivityLog> {
    const log = await ActivityLog.create({
      userId,
      action: "report_incident",
      details,
    });

    return log;
  }

  /**
   * Get activity log for a specific user.
   */
  async getActivity(userId: number, limit: number = 20): Promise<{ rows: ActivityLog[]; count: number }> {
    const result = await ActivityLog.findAndCountAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      limit,
    });
    return { rows: result.rows, count: result.count };
  }

  /**
   * Get current user's session info.
   */
  async getSession(userId: number): Promise<{
    user: User | null;
    recentActivity: ActivityLog[];
    activePermissions: Permission[];
  }> {
    const user = await User.findByPk(userId);

    const recentActivity = await ActivityLog.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      limit: 10,
    });

    const activePermissions = await Permission.findAll({
      where: {
        userId,
        status: "pending",
      },
      order: [["requestedAt", "DESC"]],
    });

    return {
      user,
      recentActivity,
      activePermissions,
    };
  }
}

export const supportService = new SupportService();
