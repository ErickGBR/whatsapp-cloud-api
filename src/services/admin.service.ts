import { Op } from "sequelize";
import { User } from "../models/user.model";
import { ActivityLog } from "../models/activity-log.model";
import { Permission } from "../models/permission.model";
import { Ticket } from "../models/ticket.model";

export class AdminService {
  /**
   * Get all support agents with their current status.
   */
  async getActiveSupports(): Promise<User[]> {
    return User.findAll({
      where: { role: "support" },
      attributes: ["id", "name", "email", "phone", "active", "socketStatus", "lastLogin"],
      order: [["name", "ASC"]],
    });
  }

  /**
   * Get dashboard metrics.
   */
  async getMetrics(): Promise<{
    totalUsers: number;
    totalTickets: number;
    activeSupports: number;
    onlineSupports: number;
    pendingPermissions: number;
    ticketsByStatus: Record<string, number>;
  }> {
    const totalUsers = await User.count({ where: { role: "support" } });
    const totalTickets = await Ticket.count();
    const activeSupports = await User.count({
      where: { role: "support", active: true },
    });
    const onlineSupports = await User.count({
      where: { role: "support", socketStatus: { [Op.in]: ["online", "busy"] } },
    });
    const pendingPermissions = await Permission.count({
      where: { status: "pending" },
    });

    const statuses = ["open", "assigned", "in_progress", "resolved", "closed"];
    const ticketsByStatus: Record<string, number> = {};

    for (const status of statuses) {
      ticketsByStatus[status] = await Ticket.count({ where: { status } });
    }

    return {
      totalUsers,
      totalTickets,
      activeSupports,
      onlineSupports,
      pendingPermissions,
      ticketsByStatus,
    };
  }

  /**
   * Get all activity logs with optional filters.
   */
  async getActivityLogs(filters: {
    userId?: number;
    action?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ rows: ActivityLog[]; count: number }> {
    const where: Record<string, unknown> = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }
    if (filters.action) {
      where.action = filters.action;
    }

    return ActivityLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ["id", "name", "email", "role"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });
  }

  /**
   * Get all pending permission requests.
   */
  async getPendingPermissions(): Promise<Permission[]> {
    return Permission.findAll({
      where: { status: "pending" },
      include: [
        {
          model: User,
          as: "requester",
          attributes: ["id", "name", "email", "socketStatus"],
        },
      ],
      order: [["requestedAt", "ASC"]],
    });
  }

  /**
   * Approve or deny a permission request.
   */
  async approvePermission(
    permissionId: number,
    adminId: number,
    status: "approved" | "denied"
  ): Promise<Permission | null> {
    const permission = await Permission.findByPk(permissionId);
    if (!permission) {
      throw new Error("Permission request not found");
    }

    permission.approvedBy = adminId;
    permission.approvedAt = new Date();
    permission.status = status;
    await permission.save();

    // If denied, restore user's socket status
    if (status === "denied") {
      const user = await User.findByPk(permission.userId);
      if (user) {
        await user.update({ socketStatus: "online" });
      }
    }

    return permission;
  }
}

export const adminService = new AdminService();
