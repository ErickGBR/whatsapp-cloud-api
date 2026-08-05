import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";

/** Default business name used when no config row exists yet. */
export const DEFAULT_BUSINESS_NAME = "CodeCraft Solutions";

/** Default Gemini model used for AI-generated bot replies. */
export const DEFAULT_AI_MODEL = "gemini-1.5-flash";

/**
 * Default ticket command words (JSON-encoded) — a customer message matching
 * one of these (case-insensitive, trimmed) creates a support ticket directly.
 */
export const DEFAULT_TICKET_COMMANDS_JSON =
  '["TICKET","AGENTE","SOPORTE","SUPPORT"]';

/**
 * Default admin-authored bot persona. The AI service appends the live product
 * catalog, business hours and the escalation RULES block (including the
 * __ESCALATE__ marker) at request time, so this constant only holds the
 * static persona/context text.
 */
export const DEFAULT_SYSTEM_PROMPT = `You are a friendly, professional sales and support agent for "CodeCraft Solutions", a software development company. Your job is to help customers with sales questions, provide pricing, explain our products and services, and assist with any inquiry about software development.

Always be polite, professional, helpful and concise. Never invent prices — refer to the product catalog provided. If you cannot answer a question, or the customer asks to speak to a human agent, respond with the token "__ESCALATE__" so a human agent can take over.`;

/**
 * BotConfig — single-row admin-editable configuration for the WhatsApp bot
 * (business name, persona prompt, ticket trigger commands, AI model).
 * The app reads the row with `key === "default"` and creates it on first use.
 */
@Table({ tableName: "bot_configs" })
export class BotConfig extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  id!: number;

  @Column({ type: DataType.STRING, unique: true, allowNull: false, defaultValue: "default" })
  key!: string;

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: DEFAULT_BUSINESS_NAME })
  businessName!: string;

  @Column({ type: DataType.TEXT, allowNull: false, defaultValue: DEFAULT_SYSTEM_PROMPT })
  systemPrompt!: string;

  /** Optional greeting the bot can send on first contact. */
  @Column({ type: DataType.TEXT, allowNull: true })
  welcomeMessage?: string;

  /** JSON-encoded array of command words that trigger a direct ticket. */
  @Column({ type: DataType.TEXT, allowNull: false, defaultValue: DEFAULT_TICKET_COMMANDS_JSON })
  ticketCommands!: string;

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: DEFAULT_AI_MODEL })
  aiModel!: string;

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updatedAt!: Date;
}
