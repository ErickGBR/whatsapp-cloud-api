import { Router, Response } from "express";
import { Ticket } from "../models/ticket.model";
import { ticketService } from "../services/ticket.service";
import { sendWhatsAppMessage } from "../services/whatsapp.service";
import { authenticate, allowRoles, AuthRequest } from "../middleware/auth.middleware";

const router = Router();

/**
 * GET /api/tickets
 * List tickets. Support sees assigned; admin sees all.
 */
router.get("/tickets", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters: Record<string, unknown> = {};

    // Support users only see their own assigned tickets (unless querying all)
    if (req.user?.role === "support") {
      if (req.query.all !== "true") {
        filters.assignedTo = req.user!.id;
      }
    }

    if (req.query.status) {
      filters.status = req.query.status as string;
    }
    if (req.query.priority) {
      filters.priority = req.query.priority as string;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await ticketService.list({
      ...filters,
      limit,
      offset,
    } as { status?: string; priority?: string; assignedTo?: number; limit?: number; offset?: number });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

/**
 * GET /api/tickets/queue/count
 * Get count of unassigned tickets. Must come before /:id routes.
 */
router.get("/tickets/queue/count", authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await ticketService.getQueueCount();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: "Failed to get queue count" });
  }
});

/**
 * GET /api/tickets/:id
 * Get ticket detail with messages.
 */
router.get("/tickets/:id", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const ticket = await ticketService.getById(id);

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
});

/**
 * PATCH /api/tickets/:id/assign
 * Assign ticket to a support agent.
 */
router.patch("/tickets/:id/assign", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { userId } = req.body;

    const assignTo = userId || req.user!.id;
    const ticket = await ticketService.assign(id, assignTo);

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    res.json(ticket);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to assign ticket";
    res.status(400).json({ error: message });
  }
});

/**
 * PATCH /api/tickets/:id/status
 * Update ticket status.
 */
router.patch("/tickets/:id/status", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: "Status is required" });
      return;
    }

    const ticket = await ticketService.updateStatus(id, status);

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    res.json(ticket);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update status";
    res.status(400).json({ error: message });
  }
});

/**
 * PATCH /api/tickets/:id/help
 * Toggle needsHelp flag on a ticket.
 */
router.patch("/tickets/:id/help", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const ticket = await ticketService.toggleHelp(id);

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle help flag" });
  }
});

/**
 * GET /api/tickets/:id/messages
 * Get messages for a ticket.
 */
router.get("/tickets/:id/messages", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ticketId = parseInt(req.params.id);
    const messages = await ticketService.getMessages(ticketId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/**
 * POST /api/tickets/:id/messages
 * Add a message to a ticket (support reply) and forward it to the customer via WhatsApp.
 */
router.post("/tickets/:id/messages", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ticketId = parseInt(req.params.id);
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ error: "Content is required" });
      return;
    }

    const message = await ticketService.addMessage(
      ticketId,
      "support",
      content,
      req.user!.id
    );

    // Forward the support reply to the customer via WhatsApp
    const ticket = await Ticket.findByPk(ticketId);
    if (ticket && ticket.whatsappJid) {
      try {
        const senderName = req.user?.name || "Support Agent";
        await sendWhatsAppMessage(
          ticket.whatsappJid,
          `💬 *${senderName} (Support)*\n\n${content}`
        );
      } catch (waError) {
        console.error("Failed to send WhatsApp message for ticket reply:", waError);
        // Do not fail the request — the message is already stored in the ticket
      }
    } else {
      console.warn(`Ticket #${ticketId} has no whatsappJid — cannot forward reply`);
    }

    res.status(201).json(message);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add message";
    res.status(400).json({ error: message });
  }
});

export default router;
