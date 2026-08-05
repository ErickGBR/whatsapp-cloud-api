import { Customer } from '../models/customer.model';
import { TicketMessage } from '../models/ticket-message.model';
import { Ticket } from '../models/ticket.model';
import { aiService } from './ai.service';
import { botConfigService } from './bot-config.service';
import { productService } from './product.service';
import { scheduleService } from './schedule.service';
import { socketEvents } from './socket-events';
import { ticketService } from './ticket.service';
import { sendWhatsAppMessage } from './whatsapp.service';

/**
 * BotService — Support/Sales Agent Flow
 * ---------------------------------------
 * The bot acts as a first-line sales & support agent for a software
 * development company. It handles simple inquiries via AI and escalates
 * complex / human-requested conversations to a support ticket system.
 *
 * Flow:
 *   1. Customer sends a message
 *   2. If the customer has an open ticket → append message to ticket
 *   3. If the message is a command (MENU / HELP / HOURS) → handle directly
 *   4. Otherwise → AI generates a response via generateResponse()
 *   5. If AI determines escalation is needed → create a ticket & notify customer
 *   6. If no escalation → send AI response to customer
 */
export class BotService {
  async handleMessage(from: string, messageText: string, userName?: string): Promise<void> {
    try {
      // ------------------------------------------------------------------
      //  1. Get or create customer
      // ------------------------------------------------------------------
      let customer = await Customer.findOne({ where: { phone: from } });

      if (!customer) {
        customer = await Customer.create({
          phone: from,
          name: userName || 'Customer',
          state: 'active',
        });
      } else {
        // Update name if provided
        if (userName) {
          customer.name = userName;
        }
        customer.state = 'active';
      }
      customer.lastInteraction = new Date();
      await customer.save();

      // ------------------------------------------------------------------
      //  2. Check if there is an OPEN ticket — append message & notify
      // ------------------------------------------------------------------
      const openTicket = await Ticket.findOne({
        where: {
          customerPhone: from,
          status: ['open', 'assigned', 'in_progress'],
        },
      });

      if (openTicket) {
        await TicketMessage.create({
          ticketId: openTicket.id,
          sender: 'customer',
          content: messageText,
        });

        await sendWhatsAppMessage(
          from,
          '📩 Your message has been forwarded to the support team. They will respond shortly.\n\n' +
            'If you need immediate assistance, please wait — a human agent will be with you as soon as possible.',
        );
        return;
      }

      // ------------------------------------------------------------------
      //  3. Direct ticket request (configured commands) — no AI needed
      // ------------------------------------------------------------------
      const upperMessage = messageText.toUpperCase().trim();

      const ticketCommands = await botConfigService.getTicketCommands();
      const isDirectTicketRequest = ticketCommands.some(
        (cmd) => cmd.trim().toUpperCase() === upperMessage,
      );

      if (isDirectTicketRequest) {
        await this.handleDirectTicketRequest(from, messageText, customer);
        return;
      }

      // ------------------------------------------------------------------
      //  4. Check business hours (priority commands bypass)
      // ------------------------------------------------------------------
      const command = this.parseCommand(upperMessage);

      if (!command && !scheduleService.isOpen()) {
        await sendWhatsAppMessage(from, scheduleService.getOffHoursMessage());
        return;
      }
      // ------------------------------------------------------------------
      //  5. Handle known commands directly (no AI needed)
      // ------------------------------------------------------------------
      if (command) {
        const response = await this.handleCommand(command, customer);
        if (response) {
          await sendWhatsAppMessage(from, response);
        }
        return;
      }

      // ------------------------------------------------------------------
      //  6. Everything else → AI processing
      // ------------------------------------------------------------------
      const aiResponse = await aiService.generateResponse(from, messageText);

      // ------------------------------------------------------------------
      //  7. Escalation check — should a human take over?
      // ------------------------------------------------------------------
      if (aiService.shouldEscalate(messageText, aiResponse)) {
        await this.handleEscalation(from, messageText, aiResponse, customer);
        return;
      }

      // ------------------------------------------------------------------
      //  8. No escalation → send AI response directly
      // ------------------------------------------------------------------
      const cleanResponse = aiResponse.replace(/__ESCALATE__/gi, '').trim();
      if (cleanResponse) {
        await sendWhatsAppMessage(from, cleanResponse);
      }
    } catch (error: any) {
      // SEC-N1: log message only — the chain can embed axios config headers.
      console.error(
        'Error handling message:',
        error instanceof Error ? error.message : String(error),
      );
      await sendWhatsAppMessage(
        from,
        '❌ Sorry, an error occurred. Please try again or type *HELP* for assistance.',
      );
    }
  }

  // ---------------------------------------------------------------
  //  Escalation handler
  // ---------------------------------------------------------------

  /**
   * Handle a message that matches one of the configured ticket commands
   * (e.g. TICKET / SOPORTE): create a ticket immediately, store the customer
   * message, notify the support dashboard in realtime and confirm to the
   * customer that a human agent will assist them.
   */
  private async handleDirectTicketRequest(
    from: string,
    messageText: string,
    customer: Customer,
  ): Promise<void> {
    const ticket = await ticketService.create({
      customerPhone: from,
      customerName: customer.name,
      subject: 'Ticket request',
      whatsappJid: from,
      createdBy: 'customer',
      priority: 'medium',
    });

    await TicketMessage.create({
      ticketId: ticket.id,
      sender: 'customer',
      content: messageText,
    });

    customer.totalTickets = (customer.totalTickets || 0) + 1;
    await customer.save();

    // Realtime: support dashboard live-updates with the new ticket.
    socketEvents.emitSupportNewTicket(ticket.toJSON());

    await sendWhatsAppMessage(
      from,
      '🆘 *A support agent will assist you shortly.*\n\n' +
        'Your request has been forwarded to our human support team. ' +
        'Please wait while we connect you with a representative who can help.\n\n' +
        '📋 *Ticket created* — your conversation has been saved.\n' +
        "We'll respond as soon as possible.",
    );
  }

  /**
   * Escalate the conversation to a human support agent:
   *   1. Create a ticket with the customer's info
   *   2. Store the customer message and AI response as ticket messages
   *   3. Notify the support dashboard in realtime
   *   4. Notify the customer that a human will assist them
   */
  private async handleEscalation(
    from: string,
    userMessage: string,
    aiResponse: string,
    customer: Customer,
  ): Promise<void> {
    // Create ticket
    const ticket = await ticketService.create({
      customerPhone: from,
      customerName: customer.name,
      subject: aiService.generateSubject(userMessage),
      whatsappJid: from,
      createdBy: 'ai',
      priority: 'medium',
    });

    // Log customer message
    await TicketMessage.create({
      ticketId: ticket.id,
      sender: 'customer',
      content: userMessage,
    });

    // Log AI response (so support can see what was already discussed)
    await TicketMessage.create({
      ticketId: ticket.id,
      sender: 'ai',
      content: aiResponse,
    });

    // Realtime: support dashboard live-updates with the new ticket.
    socketEvents.emitSupportNewTicket(ticket.toJSON());

    // Increment ticket counter
    customer.totalTickets = (customer.totalTickets || 0) + 1;
    await customer.save();

    // Notify customer via WhatsApp
    await sendWhatsAppMessage(
      from,
      '🆘 *A support agent will assist you shortly.*\n\n' +
        'Your request has been forwarded to our human support team. ' +
        'Please wait while we connect you with a representative who can help.\n\n' +
        '📋 *Ticket created* — your conversation has been saved.\n' +
        "We'll respond as soon as possible.",
    );
  }

  // ---------------------------------------------------------------
  //  Command handling
  // ---------------------------------------------------------------

  /**
   * Parse the raw message text to extract a known command string,
   * or return null if it's a free-form inquiry (should go to AI).
   */
  private parseCommand(message: string): string | null {
    const upper = message.toUpperCase().trim();

    // Exact-match commands
    const commands = [
      'MENU',
      'HELP',
      'HOURS',
      'HORARIO',
      'AYUDA',
      'CATALOG',
      'CATALOGO',
      'CATÁLOGO',
      'PRODUCTS',
      'PRODUCTOS',
    ];

    if (commands.includes(upper)) {
      return upper;
    }

    return null;
  }

  /**
   * Execute a parsed command and return the response text.
   */
  private async handleCommand(command: string, customer: Customer): Promise<string> {
    switch (command) {
      case 'MENU':
        return this.getMainMenu();

      case 'HELP':
      case 'AYUDA':
        return this.getHelpMessage();

      case 'HOURS':
      case 'HORARIO':
        return (
          `⏰ *BUSINESS HOURS*\n\n` +
          `${scheduleService.getOpeningHours()} (Monday to Friday)\n\n` +
          `We are closed on weekends and public holidays.\n\n` +
          `Type *MENU* to return to the main menu.`
        );

      case 'CATALOG':
      case 'CATALOGO':
      case 'CATÁLOGO':
      case 'PRODUCTS':
      case 'PRODUCTOS':
        return await this.getCatalogMessage();

      default:
        return '';
    }
  }

  // ---------------------------------------------------------------
  //  Message builders
  // ---------------------------------------------------------------

  private async getMainMenu(): Promise<string> {
    const businessName = await botConfigService.getBusinessName();
    return (
      `👋 *${businessName}* — Software Development Services\n\n` +
      "I'm your virtual sales & support assistant. How can I help you?\n\n" +
      'Available commands:\n' +
      '• *CATALOG* — View our products and services\n' +
      '• *HOURS* — Check business hours\n' +
      '• *HELP* — Show help and tips\n\n' +
      '💬 *Or just ask me anything!*\n' +
      'For example: "How much does a website cost?" or "Tell me about your ERP system."\n\n' +
      'If you need to speak with a human agent, just let me know.'
    );
  }

  private async getCatalogMessage(): Promise<string> {
    const products = await productService.getAllProducts();
    return productService.formatCatalogMessage(products);
  }

  private getHelpMessage(): string {
    return (
      '❓ *HELP & SUPPORT*\n\n' +
      "I'm an AI assistant here to help you with:\n\n" +
      '💡 *Sales inquiries* — Pricing, product info, demos\n' +
      '📋 *Catalog* — Browse our full product catalog\n' +
      "🕐 *Business hours* — When we're available\n\n" +
      'Commands:\n' +
      '• *MENU* — Show main menu\n' +
      '• *CATALOG* — Browse products with prices\n' +
      '• *HOURS* — View business hours\n\n' +
      'To speak with a *human agent*, just say:\n' +
      '"I want to speak to a person" or "Transfer me to an agent"\n\n' +
      'How can I assist you today?'
    );
  }
}

export const botService = new BotService();
