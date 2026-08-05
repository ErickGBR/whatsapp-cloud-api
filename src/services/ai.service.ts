import axios from "axios";
import dotenv from "dotenv";
import { productService } from "./product.service";
import { scheduleService } from "./schedule.service";
import { botConfigService } from "./bot-config.service";
import { DEFAULT_SYSTEM_PROMPT } from "../models/bot-config.model";

dotenv.config();

// Google Gemini REST endpoint (no SDK — plain axios). The API key is passed
// as a query param by the REST contract; it is NEVER logged.
const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

/** Internal marker that triggers escalation when present in AI response. */
const ESCALATION_MARKER = "__ESCALATE__";

interface GeminiContentPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiContentPart[];
}

export class AIService {
  /**
   * In-memory per-phone conversation history. Each entry is a plain text turn;
   * turns alternate user/model starting with the user. Kept as the backing
   * store for the public clearContext/setContext API.
   */
  private context: Map<string, string[]> = new Map();

  /**
   * Generate a response using Google Gemini (REST) or a helpful fallback when
   * the API key is missing or the request fails.
   *
   * The system prompt is built from the admin-authored persona
   * (botConfigService.getSystemPrompt()) plus a live block with the product
   * catalog, business hours and escalation RULES.
   */
  async generateResponse(phone: string, userMessage: string): Promise<string> {
    try {
      // No key → enhanced fallback responses (never crash, never leak).
      if (!GEMINI_API_KEY) {
        return await this.getFallbackResponse(userMessage);
      }

      const model = await botConfigService.getAiModel();
      const systemPrompt = await this.buildSystemContext();

      const conversation = this.getOrCreateConversation(phone);
      conversation.push(userMessage);

      // Send the API key via the x-goog-api-key header (not a URL query
      // param) to avoid leaking the key into logs and URL captures.
      const response = await axios.post(
        `${GEMINI_BASE_URL}/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: this.buildGeminiContents(conversation),
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        },
        { timeout: 15000, headers: { "x-goog-api-key": GEMINI_API_KEY } }
      );

      const botMessage = this.parseGeminiResponse(response.data);
      if (!botMessage || botMessage.length < 3) {
        return await this.getFallbackResponse(userMessage);
      }

      conversation.push(botMessage);

      // Limit stored history to 20 messages (contents window is ~10 turns).
      if (conversation.length > 20) {
        conversation.splice(0, conversation.length - 20);
      }

      return botMessage;
    } catch (error) {
      // SEC-N1: never log the axios error object — it embeds the request URL
      // (which carries the GEMINI_API_KEY query param) and headers. Message only.
      console.error("Gemini error:", error instanceof Error ? error.message : String(error));
      return await this.getFallbackResponse(userMessage);
    }
  }

  // ---------------------------------------------------------------
  //  System context builder
  // ---------------------------------------------------------------

  /**
   * Build the system prompt sent to Gemini: the admin-authored persona PLUS a
   * dynamically appended block with the live product catalog, business hours,
   * and a RULES block instructing the model to emit the __ESCALATE__ marker
   * when a human agent is needed.
   */
  async buildSystemContext(): Promise<string> {
    const persona = (await botConfigService.getSystemPrompt()).trim();
    let ctx = persona ? `${persona}\n\n` : `${DEFAULT_SYSTEM_PROMPT}\n\n`;

    // Live product catalog
    try {
      const products = await productService.getAllProducts();
      if (products.length > 0) {
        ctx += "AVAILABLE PRODUCTS & SERVICES (live catalog):\n";
        for (const p of products) {
          ctx += `• ${p.name} — ${p.description} — $${Number(p.price).toFixed(2)} USD\n`;
        }
        ctx += "\n";
      }
    } catch {
      ctx += "(Product catalog temporarily unavailable)\n\n";
    }

    // Business hours
    ctx += `BUSINESS HOURS: ${scheduleService.getOpeningHours()} (Monday to Friday)\n\n`;

    // Escalation rules
    ctx +=
      "RULES:\n" +
      "• Be polite, professional, and helpful at all times.\n" +
      "• If you cannot answer a question, or the customer asks to speak to a human " +
      "(agent, person, representative, transfer), or the topic is complex " +
      "(refunds, contracts, legal, NDAs), include the exact token " +
      `"${ESCALATION_MARKER}" in your response so a human agent can take over.\n` +
      "• Do NOT invent pricing — always refer to the product catalog above.\n" +
      "• Answer in the same language the customer uses.\n";

    return ctx;
  }

  // ---------------------------------------------------------------
  //  Gemini request helpers
  // ---------------------------------------------------------------

  /**
   * Build the `contents` array from the conversation history. Turns alternate
   * user/model starting with the user. A rolling window of the last ~10 turns
   * is used; a leading "model" turn is dropped so the array always starts with
   * a user turn (Gemini requirement).
   */
  private buildGeminiContents(conversation: string[]): GeminiContent[] {
    const window = conversation.slice(-10);
    const startIndex = conversation.length - window.length;
    const contents: GeminiContent[] = [];

    for (let i = 0; i < window.length; i++) {
      const role: GeminiContent["role"] = (startIndex + i) % 2 === 0 ? "user" : "model";
      contents.push({ role, parts: [{ text: window[i] }] });
    }

    if (contents.length > 0 && contents[0].role === "model") {
      contents.shift();
    }

    return contents;
  }

  /** Extract the generated text from a Gemini REST response. */
  private parseGeminiResponse(data: unknown): string {
    const candidates = (data as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    })?.candidates;
    const parts = candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return "";
    return parts.map((part) => part?.text || "").join("").trim();
  }

  private getOrCreateConversation(phone: string): string[] {
    let conversation = this.context.get(phone);
    if (!conversation) {
      conversation = [];
      this.context.set(phone, conversation);
    }
    return conversation;
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

  private async getFallbackResponse(message: string): Promise<string> {
    const lower = message.toLowerCase();
    const businessName = await botConfigService.getBusinessName();

    // Greetings
    if (
      lower.includes("hello") || lower.includes("hi") ||
      lower.includes("hey") || lower.includes("hola") ||
      lower.includes("buenas") || lower.includes("good morning")
    ) {
      return (
        `Hello! Welcome to *${businessName}* — your software development partner. 👋\n\n` +
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
      `Thank you for your message. I'm your virtual assistant from *${businessName}*. 🚀\n\n` +
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