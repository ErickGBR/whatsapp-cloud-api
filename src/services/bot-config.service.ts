import {
  BotConfig,
  DEFAULT_AI_MODEL,
  DEFAULT_BUSINESS_NAME,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TICKET_COMMANDS_JSON,
} from "../models/bot-config.model";

/** Fields an admin may update on the bot configuration. */
export interface BotConfigUpdate {
  businessName?: string;
  systemPrompt?: string;
  welcomeMessage?: string;
  ticketCommands?: string[];
  aiModel?: string;
}

/** Serialized (API-safe) representation of a BotConfig row. */
export interface BotConfigDto {
  id: number;
  key: string;
  businessName: string;
  systemPrompt: string;
  welcomeMessage: string | null;
  ticketCommands: string[];
  aiModel: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Reserved self-service commands (SEC-REVIEW). Ticket commands must not collide
 * with these, otherwise a customer's ticket trigger could hijack a built-in
 * self-service flow (menu/help/hours/catalog/products). Comparison is
 * case-insensitive and whitespace-trimmed.
 */
const RESERVED_SELF_SERVICE_COMMANDS = new Set([
  "MENU",
  "HELP",
  "AYUDA",
  "HOURS",
  "HORARIO",
  "CATALOG",
  "CATALOGO",
  "CATÁLOGO",
  "PRODUCTS",
  "PRODUCTOS",
]);

class BotConfigService {
  /**
   * Return the "default" config row, creating it with sensible defaults on
   * first access. This is the single source of truth for bot behavior.
   */
  async getConfig(): Promise<BotConfig> {
    let config = await BotConfig.findOne({ where: { key: "default" } });
    if (!config) {
      config = await BotConfig.create({
        key: "default",
        businessName: DEFAULT_BUSINESS_NAME,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        welcomeMessage: null,
        ticketCommands: DEFAULT_TICKET_COMMANDS_JSON,
        aiModel: DEFAULT_AI_MODEL,
      });
    }
    return config;
  }

  /**
   * Upsert the "default" config row with the provided fields.
   * Validates that `ticketCommands` is an array of non-empty strings and that
   * every other provided field is a string; throws otherwise.
   */
  async updateConfig(data: BotConfigUpdate): Promise<BotConfig> {
    const config = await this.getConfig();

    this.assertOptionalString(data.businessName, "businessName");
    this.assertOptionalString(data.systemPrompt, "systemPrompt");
    this.assertOptionalString(data.welcomeMessage, "welcomeMessage");
    this.assertOptionalString(data.aiModel, "aiModel");

    if (data.ticketCommands !== undefined) {
      if (
        !Array.isArray(data.ticketCommands) ||
        data.ticketCommands.some(
          (cmd) => typeof cmd !== "string" || cmd.trim() === ""
        )
      ) {
        throw new Error("ticketCommands must be an array of non-empty strings");
      }

      // SEC-REVIEW: reject commands that would hijack reserved self-service
      // commands (e.g. an admin setting "MENU" as a ticket trigger would
      // shadow the built-in menu flow for every customer).
      const collisions = data.ticketCommands.filter((cmd) =>
        RESERVED_SELF_SERVICE_COMMANDS.has(cmd.trim().toUpperCase())
      );
      if (collisions.length > 0) {
        throw new Error(
          `ticketCommands collide with reserved self-service commands: ${collisions.join(", ")}`
        );
      }

      config.ticketCommands = JSON.stringify(data.ticketCommands);
    }

    if (data.businessName !== undefined) config.businessName = data.businessName.trim();
    if (data.systemPrompt !== undefined) config.systemPrompt = data.systemPrompt.trim();
    if (data.welcomeMessage !== undefined) config.welcomeMessage = data.welcomeMessage.trim();
    if (data.aiModel !== undefined) config.aiModel = data.aiModel.trim();

    await config.save();
    return config;
  }

  /** Serialize a BotConfig row into an API-safe DTO (ticketCommands as array). */
  toDto(config: BotConfig): BotConfigDto {
    let ticketCommands: string[] = [];
    try {
      const parsed: unknown = JSON.parse(config.ticketCommands);
      if (Array.isArray(parsed)) {
        ticketCommands = parsed.filter(
          (cmd): cmd is string => typeof cmd === "string" && cmd.trim() !== ""
        );
      }
    } catch {
      ticketCommands = [];
    }

    return {
      id: config.id,
      key: config.key,
      businessName: config.businessName,
      systemPrompt: config.systemPrompt,
      welcomeMessage: config.welcomeMessage ?? null,
      ticketCommands,
      aiModel: config.aiModel,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /** Configured ticket trigger commands (parsed from JSON). */
  async getTicketCommands(): Promise<string[]> {
    const config = await this.getConfig();
    try {
      const parsed: unknown = JSON.parse(config.ticketCommands);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (cmd): cmd is string => typeof cmd === "string" && cmd.trim() !== ""
      );
    } catch {
      return [];
    }
  }

  /** Admin-authored bot persona/context. */
  async getSystemPrompt(): Promise<string> {
    return (await this.getConfig()).systemPrompt;
  }

  /** Business name shown to customers in menus/fallbacks. */
  async getBusinessName(): Promise<string> {
    return (await this.getConfig()).businessName;
  }

  /** Optional first-contact greeting, or null when unset. */
  async getWelcomeMessage(): Promise<string | null> {
    return (await this.getConfig()).welcomeMessage || null;
  }

  /** Gemini model id used for AI replies. */
  async getAiModel(): Promise<string> {
    return (await this.getConfig()).aiModel;
  }

  private assertOptionalString(value: unknown, field: string): asserts value is string | undefined {
    if (value !== undefined && typeof value !== "string") {
      throw new Error(`${field} must be a string`);
    }
  }
}

export const botConfigService = new BotConfigService();