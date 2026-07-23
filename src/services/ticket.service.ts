import { Op } from "sequelize";
import { Ticket } from "../models/ticket.model";
import { TicketMessage } from "../models/ticket-message.model";
import { User } from "../models/user.model";
import { ActivityLog } from "../models/activity-log.model";

export class TicketService {
  /**
   * Create a new ticket from a customer escalation.
   */
  async create(data: {
    customerPhone: string;
    customerName?: string;
    subject?: string;
    whatsappJid?: string;
    createdBy?: string;
    priority?: string;
  }): Promise<Ticket> {
    const ticket = await Ticket.create({
      customerPhone: data.customerPhone,
      customerName: data.customerName || null,
      subject: data.subject || null,
      whatsappJid: data.whatsappJid || null,
      createdBy: data.createdBy || "customer",
      priority: data.priority || "medium",
      status: "open",
    });
    return ticket;
  }

  /**
   * List tickets with optional filters.
   */
  async list(filters: {
    status?: string;
    priority?: string;
    assignedTo?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ rows: Ticket[]; count: number }> {
    const where: Record<string, unknown> = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.assignedTo !== undefined) {
      where.assignedTo = filters.assignedTo;
    }

    const result = await Ticket.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "assignee",
          attributes: ["id", "name", "email", "role", "socketStatus"],
        },
      ],
      order: [["updatedAt", "DESC"]],
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });

    return result;
  }

  /**
   * Get a single ticket by ID with messages included.
   */
  async getById(id: number): Promise<Ticket | null> {
    return Ticket.findByPk(id, {
      include: [
        {
          model: User,
          as: "assignee",
          attributes: ["id", "name", "email", "role", "socketStatus"],
        },
        {
          model: TicketMessage,
          include: [
            {
              model: User,
              as: "supportUser",
              attributes: ["id", "name", "email", "role"],
            },
          ],
          order: [["createdAt", "ASC"]],
        },
      ],
    });
  }

  /**
   * Assign a ticket to a user.
   */
  async assign(id: number, userId: number): Promise<Ticket | null> {
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error("User not found");
    }

    ticket.assignedTo = userId;
    if (ticket.status === "open") {
      ticket.status = "assigned";
    }
    await ticket.save();

    // Log activity
    await ActivityLog.create({
      userId: userId,
      action: "assign_ticket",
      details: JSON.stringify({ ticketId: id, ticketSubject: ticket.subject }),
      ticketId: id,
    });

    return ticket;
  }

  /**
   * Update ticket status.
   */
  async updateStatus(id: number, status: string): Promise<Ticket | null> {
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const validStatuses = ["open", "assigned", "in_progress", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    const previousStatus = ticket.status;
    ticket.status = status;
    await ticket.save();

    // Log activity if resolved
    const action = status === "resolved" ? "resolve_ticket" : `status_change:${previousStatus}->${status}`;
    await ActivityLog.create({
      userId: ticket.assignedTo || 0,
      action,
      details: JSON.stringify({ ticketId: id, from: previousStatus, to: status }),
      ticketId: id,
    });

    return ticket;
  }

  /**
   * Toggle the needsHelp flag on a ticket.
   */
  async toggleHelp(id: number): Promise<Ticket | null> {
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    ticket.needsHelp = !ticket.needsHelp;
    await ticket.save();

    return ticket;
  }

  /**
   * Get count of unassigned tickets.
   */
  async getQueueCount(): Promise<number> {
    return Ticket.count({
      where: {
        assignedTo: null,
        status: { [Op.ne]: "closed" },
      },
    });
  }

  /**
   * Get messages for a ticket.
   */
  async getMessages(ticketId: number): Promise<TicketMessage[]> {
    return TicketMessage.findAll({
      where: { ticketId },
      include: [
        {
          model: User,
          as: "supportUser",
          attributes: ["id", "name", "email", "role"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });
  }

  /**
   * Add a message to a ticket.
   */
  async addMessage(
    ticketId: number,
    sender: string,
    content: string,
    supportUserId?: number
  ): Promise<TicketMessage> {
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const message = await TicketMessage.create({
      ticketId,
      sender,
      content,
      supportUserId: supportUserId || null,
      messageType: "text",
    });

    // Auto-assign if support is sending first message on an unassigned ticket
    if (sender === "support" && supportUserId && !ticket.assignedTo) {
      ticket.assignedTo = supportUserId;
      if (ticket.status === "open") {
        ticket.status = "in_progress";
      }
      await ticket.save();
    }

    return message;
  }
}

export const ticketService = new TicketService();
