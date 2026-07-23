import axios from "axios";
import dotenv from "dotenv";
import { productService } from "./product.service";
import { scheduleService } from "./schedule.service";

dotenv.config();

// Using Hugging Face Inference API (free with reasonable limits)
const HUGGING_FACE_API_URL = "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium";
const HUGGING_FACE_TOKEN = process.env.HUGGING_FACE_TOKEN || "";

/** Internal marker that triggers escalation when present in AI response. */
const ESCALATION_MARKER = "__ESCALATE__";

interface AIResponse {
  generated_text: string;
}

export class AIService {
  private context: Map<string, string[]> = new Map();

  /**
   * Generate a response using the AI model (Hugging Face DialoGPT) or
   * fallback responses when the API is unavailable.
   *
   * Injects a system-level context (product catalog + business hours) into
   * the conversation history so the model understands it is a sales/support agent
   * for a software development company.
   */
  async generateResponse(phone: string, userMessage: string): Promise<string> {
    try {
      // If no token, use enhanced fallback responses
      if (!HUGGING_FACE_TOKEN) {
        return this.getFallbackResponse(userMessage);
      }

      // Get or create conversation context
      if (!this.context.has(phone)) {
        this.context.set(phone, []);
      }
      const conversation = this.context.get(phone)!;

      // On first message, seed the conversation with the system context
      if (conversation.length === 0) {
        const systemContext = await this.buildSystemContext();
        conversation.push(systemContext);
      }

      // Append user message
      conversation.push(userMessage);

      // Call Hugging Face API
      const response = await axios.post(
        HUGGING_FACE_API_URL,
        {
          inputs: {
            past_user_inputs: conversation.slice(-5),
            generated_responses: conversation.slice(-5),
            text: userMessage,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${HUGGING_FACE_TOKEN}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      const aiResponse = response.data as AIResponse;
      let botMessage = aiResponse.generated_text || "";

      // Clean response
      botMessage = botMessage.trim();

      if (!botMessage || botMessage.length < 3) {
        return this.getFallbackResponse(userMessage);
      }

      // Save to context
      conversation.push(botMessage);

      // Limit context to 20 messages
      if (conversation.length > 20) {
        conversation.splice(0, conversation.length - 20);
      }

      return botMessage;
    } catch (error: any) {
      console.error("Error in AI service:", error.message);
      return this.getFallbackResponse(userMessage);
    }
  }

  // ---------------------------------------------------------------
  //  System context builder
  // ---------------------------------------------------------------

  /**
   * Build the system-level context injected at the start of every conversation.
   * Includes the role definition, available product catalog, and business hours.
   */
  async buildSystemContext(): Promise<string> {
    let ctx =
      "You are a friendly sales and support agent for 'CodeCraft Solutions', " +
      "a professional software development company. Your job is to help customers " +
      "with sales questions, provide pricing, explain services, and assist with " +
      "any inquiry about software development.\n\n";

    // Fetch live product catalog
    try {
      const products = await productService.getAllProducts();
      if (products.length > 0) {
        ctx += "AVAILABLE PRODUCTS & SERVICES:\n";
        for (const p of products) {
          ctx += `• ${p.name} — ${p.description} — $${Number(p.price).toFixed(2)} USD\n`;
        }
        ctx += "\n";
      }
    } catch {
      ctx += "(Product catalog temporarily unavailable)\n\n";
    }

    // Business hours
    ctx += `BUSINESS HOURS: ${scheduleService.getOpeningHours()} (Monday–Friday)\n\n`;

    ctx +=
      "Guidelines:\n" +
      "• Be polite, professional, and helpful at all times.\n" +
      "• If you cannot answer a question, or the customer asks to speak to a human, " +
      `include the word "${ESCALATION_MARKER}" in your response so a human agent can take over.\n` +
      "• Do NOT make up pricing — refer to the product list above.\n" +
      "• For anything related to refunds, contracts, legal, or custom NDAs, " +
      "recommend speaking with a human agent.\n";

    return ctx;
  }

  // ---------------------------------------------------------------
  //  Escalation logic
  // ---------------------------------------------------------------

  /**
   * Determine whether the conversation should be escalated to a human
   * support agent.
   *
   * @param userMessage — The customer's latest message.
   * @param aiResponse  — The AI-generated response (may contain escalation marker).
   */
  shouldEscalate(userMessage: string, aiResponse: string): boolean {
    const lowerMsg = userMessage.toLowerCase();
    const lowerRes = aiResponse.toLowerCase();

    // 1. AI explicitly requested escalation via marker
    if (aiResponse.includes(ESCALATION_MARKER) || lowerRes.includes("escalate")) {
      return true;
    }

    // 2. Customer explicitly asks for a human
    const humanKeywords = [
      "human", "agent", "person", "representative",
      "speak to someone", "talk to a person", "real person",
      "customer service", "support agent", "live agent",
      "actual person", "talk to human",
    ];
    for (const kw of humanKeywords) {
      if (lowerMsg.includes(kw)) return true;
    }

    // 3. Customer requests transfer (English / Spanish variants)
    const transferRequests = [
      "hablar con alguien", "hablar con un agente", "transferir",
      "transfer", "quiero hablar", "necesito hablar",
      "can i speak", "can i talk", "transfer me",
      "connect me", "quiero un agente", "necesito un agente",
      "please transfer", "pase con un agente",
    ];
    for (const phrase of transferRequests) {
      if (lowerMsg.includes(phrase)) return true;
    }

    // 4. Frustration / anger signals
    const frustrationKeywords = [
      "angry", "frustrated", "terrible", "horrible", "useless",
      "not helpful", "waste of time", "complaint", "disappointed",
      "furious", "unacceptable", "bad service", "stupid",
      "enoja", "frustrado", "molesto", "inútil", "pésimo",
      "mal servicio", "queja", "decepcionado",
    ];
    for (const kw of frustrationKeywords) {
      if (lowerMsg.includes(kw)) return true;
    }

    // 5. Complex topics that require human judgment
    const complexTopics = [
      "refund", "cancel order", "cancellation", "return policy",
      "legal", "contract", "custom agreement", "nda",
      "enterprise license", "source code", "intellectual property",
      "reembolso", "cancelar", "contrato", "legal",
      "demanda", "abogado", "lawyer", "sue",
    ];
    for (const topic of complexTopics) {
      if (lowerMsg.includes(topic)) return true;
    }

    return false;
  }

  // ---------------------------------------------------------------
  //  Subject generation
  // ---------------------------------------------------------------

  /**
   * Generate a short ticket subject from the customer's message.
   * Truncates to 100 characters.
   */
  generateSubject(userMessage: string): string {
    const clean = userMessage
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (clean.length <= 100) {
      return clean;
    }
    return clean.substring(0, 97) + "...";
  }

  // ---------------------------------------------------------------
  //  Fallback responses
  // ---------------------------------------------------------------

  private getFallbackResponse(message: string): string {
    const lower = message.toLowerCase();

    // Greetings
    if (
      lower.includes("hello") || lower.includes("hi") ||
      lower.includes("hey") || lower.includes("hola") ||
      lower.includes("buenas") || lower.includes("good morning")
    ) {
      return (
        "Hello! Welcome to *CodeCraft Solutions* — your software development partner. 👋\n\n" +
        "I can help you with:\n" +
        "• Information about our products and services\n" +
        "• Pricing and quotes\n" +
        "• Business hours\n\n" +
        "How can I assist you today?"
      );
    }

    // Menu
    if (lower.includes("menu") || lower.includes("options")) {
      return (
        "Here are the available commands:\n\n" +
        "• *MENU* — Show main menu\n" +
        "• *HELP* — Show help\n" +
        "• *HOURS* — Business hours\n" +
        "• *CATALOG* — View our products\n\n" +
        "Or just ask me anything about our services!"
      );
    }

    // Catalog / products
    if (
      lower.includes("catalog") || lower.includes("product") ||
      lower.includes("service") || lower.includes("catálogo") ||
      lower.includes("productos") || lower.includes("servicios")
    ) {
      return (
        "We offer a wide range of software development services:\n\n" +
        "🌐 *Websites* — Custom, WordPress, React — from $100 USD\n" +
        "💻 *Systems* — Medical appointments, Inventory, ERP — from $500 USD\n" +
        "📱 *Apps* — Android applications — from $800 USD\n\n" +
        "Type *CATALOG* for full details or ask about a specific product!"
      );
    }

    // Pricing
    if (
      lower.includes("price") || lower.includes("cost") ||
      lower.includes("how much") || lower.includes("precio") ||
      lower.includes("cuanto") || lower.includes("cuesta")
    ) {
      return (
        "Our pricing varies by project:\n\n" +
        "• Websites start at *$100 USD*\n" +
        "• Business systems start at *$500 USD*\n" +
        "• Android apps start at *$800 USD*\n" +
        "• Custom ERP solutions from *$2,000 USD*\n\n" +
        "Type *CATALOG* to see the full catalog with detailed pricing.\n" +
        "For a custom quote, just describe your project!"
      );
    }

    // Contact / speak to someone variants
    if (
      lower.includes("contact") || lower.includes("email") ||
      lower.includes("phone") || lower.includes("call") ||
      lower.includes("llamar") || lower.includes("correo")
    ) {
      return (
        "You can reach us through the following channels:\n\n" +
        "📧 Email: support@codecraftsolutions.com\n" +
        "💬 WhatsApp: You're already chatting with us!\n\n" +
        "If you need to speak with a human agent, just let me know and I'll transfer you."
      );
    }

    // Thanks
    if (
      lower.includes("thanks") || lower.includes("thank you") ||
      lower.includes("gracias") || lower.includes("thanks!")
    ) {
      return (
        "You're welcome! 😊 I'm here to help with any questions about our software services.\n\n" +
        "If you ever need assistance, just type *MENU* or ask me anything!"
      );
    }

    // Business hours
    if (
      lower.includes("hour") || lower.includes("horario") ||
      lower.includes("open") || lower.includes("abierto") ||
      lower.includes("cuando")
    ) {
      return `⏰ Our business hours are ${scheduleService.getOpeningHours()} (Monday to Friday).\n\nWe're closed on weekends and public holidays.`;
    }

    // Default — helpful fallback
    return (
      "Thank you for your message. I'm your virtual assistant from *CodeCraft Solutions*. 🚀\n\n" +
      "To better assist you, please try:\n" +
      "• *MENU* — See all commands\n" +
      "• *CATALOG* — Browse our products\n" +
      "• *HELP* — Get help\n\n" +
      "Or simply tell me what you need help with!"
    );
  }

  // ---------------------------------------------------------------
  //  Context management
  // ---------------------------------------------------------------

  clearContext(phone: string): void {
    this.context.delete(phone);
  }

  setContext(phone: string, context: string[]): void {
    this.context.set(phone, context);
  }
}

export const aiService = new AIService();
