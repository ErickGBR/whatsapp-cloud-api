import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, HasMany } from "sequelize-typescript";
import { User } from "./user.model";
import { TicketMessage } from "./ticket-message.model";

@Table({ tableName: "tickets" })
export class Ticket extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  id!: number;

  @Column({ type: DataType.STRING, allowNull: false })
  customerPhone!: string;

  @Column({ type: DataType.STRING, allowNull: true })
  customerName?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  subject?: string;

  @Column({ type: DataType.ENUM("open", "assigned", "in_progress", "resolved", "closed"), defaultValue: "open" })
  status!: string;

  @Column({ type: DataType.ENUM("low", "medium", "high", "urgent"), defaultValue: "medium" })
  priority!: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  assignedTo?: number;

  @Column({ type: DataType.STRING, defaultValue: "customer" })
  createdBy!: string; // 'customer', 'ai', 'system'

  @Column({ type: DataType.STRING, allowNull: true })
  whatsappJid?: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  needsHelp!: boolean; // support agent requested admin help

  @BelongsTo(() => User, "assignedTo")
  assignee!: User;

  @HasMany(() => TicketMessage)
  messages!: TicketMessage[];
}
