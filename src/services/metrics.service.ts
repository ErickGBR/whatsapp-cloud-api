import { Op, fn, col, literal } from "sequelize";
import { Ticket } from "../models/ticket.model";
import { User } from "../models/user.model";
import { Permission } from "../models/permission.model";
import { ActivityLog } from "../models/activity-log.model";

export class MetricsService {
  /**
   * Get comprehensive dashboard metrics.
   */
  async getDashboardMetrics(): Promise<{
    ticketsToday: number;
    resolvedToday: number;
    avgResolutionTime: number;
    activeSupportAgents: number;
    pendingPermissions: number;
    ticketsByStatus: Record<string, number>;
    ticketsResolvedByDay: { date: string; count: number }[];
    permissionsByType: { type: string; count: number }[];
    supportActivity: {
      userId: number;
      name: string;
      ticketsResolved: number;
      avgTime: number;
      breakCount: number;
      status: string;
    }[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Tickets created today
    const ticketsToday = await Ticket.count({
      where: {
        createdAt: { [Op.between]: [today, todayEnd] },
      },
    });

    // Tickets resolved today
    const resolvedToday = await ActivityLog.count({
      where: {
        action: "resolve_ticket",
        createdAt: { [Op.between]: [today, todayEnd] },
      },
    });

    // Average resolution time (minutes) — based on last 30 resolved tickets
    const resolvedTickets = await Ticket.findAll({
      where: { status: "resolved" },
      order: [["updatedAt", "DESC"]],
      limit: 30,
    });

    let avgResolutionTime = 0;
    if (resolvedTickets.length > 0) {
      const totalMinutes = resolvedTickets.reduce((sum, ticket) => {
        const created = new Date(ticket.createdAt);
        const resolved = new Date(ticket.updatedAt);
        return sum + (resolved.getTime() - created.getTime()) / 60000;
      }, 0);
      avgResolutionTime = Math.round(totalMinutes / resolvedTickets.length);
    }

    // Active support agents (online or busy)
    const activeSupportAgents = await User.count({
      where: {
        role: "support",
        socketStatus: { [Op.in]: ["online", "busy"] },
      },
    });

    // Pending permissions
    const pendingPermissions = await Permission.count({
      where: { status: "pending" },
    });

    // Tickets by status
    const statuses = ["open", "assigned", "in_progress", "resolved", "closed"];
    const ticketsByStatus: Record<string, number> = {};
    for (const status of statuses) {
      ticketsByStatus[status] = await Ticket.count({ where: { status } });
    }

    // Tickets resolved by day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const resolvedLogs = await ActivityLog.findAll({
      where: {
        action: "resolve_ticket",
        createdAt: { [Op.gte]: sevenDaysAgo },
      },
      attributes: [
        [fn("date", col("createdAt")), "date"],
        [fn("count", col("id")), "count"],
      ],
      group: [fn("date", col("createdAt"))],
      order: [[fn("date", col("createdAt")), "ASC"]],
      raw: true,
    });

    const ticketsResolvedByDay = (resolvedLogs as unknown as { date: string; count: number }[]).map(
      (r) => ({
        date: r.date,
        count: Number(r.count),
      })
    );

    // Fill in missing days with zero counts
    const resolvedByDayMap = new Map<string, number>();
    for (const entry of ticketsResolvedByDay) {
      resolvedByDayMap.set(entry.date, entry.count);
    }
    const filledResolvedByDay: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      filledResolvedByDay.push({
        date: dateStr,
        count: resolvedByDayMap.get(dateStr) || 0,
      });
    }

    // Permissions by type (today)
    const permissionsByTypeRaw = await Permission.findAll({
      where: {
        requestedAt: { [Op.between]: [today, todayEnd] },
      },
      attributes: ["type", [fn("count", col("id")), "count"]],
      group: ["type"],
      raw: true,
    });
    const permissionsByType = (permissionsByTypeRaw as unknown as { type: string; count: number }[]).map(
      (r) => ({
        type: r.type,
        count: Number(r.count),
      })
    );

    // Support activity summary
    const supportUsers = await User.findAll({
      where: { role: "support", active: true },
      attributes: ["id", "name", "socketStatus"],
    });

    const supportActivity = [];
    for (const user of supportUsers) {
      const ticketsResolved = await ActivityLog.count({
        where: {
          userId: user.id,
          action: "resolve_ticket",
          createdAt: { [Op.gte]: sevenDaysAgo },
        },
      });

      const breakCount = await ActivityLog.count({
        where: {
          userId: user.id,
          action: "request_break",
          createdAt: { [Op.gte]: sevenDaysAgo },
        },
      });

      supportActivity.push({
        userId: user.id,
        name: user.name,
        ticketsResolved,
        avgTime: avgResolutionTime,
        breakCount,
        status: user.socketStatus,
      });
    }

    return {
      ticketsToday,
      resolvedToday,
      avgResolutionTime,
      activeSupportAgents,
      pendingPermissions,
      ticketsByStatus,
      ticketsResolvedByDay: filledResolvedByDay,
      permissionsByType,
      supportActivity,
    };
  }
}

export const metricsService = new MetricsService();
