import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from "sequelize-typescript";
import { Ticket } from "./ticket.model";
import { User } from "./user.model";

@Table({ tableName: "ticket_messages" })
export class TicketMessage extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  id!: number;

  @ForeignKey(() => Ticket)
  @Column({ type: DataType.INTEGER, allowNull: false })
  ticketId!: number;

  @Column({ type: DataType.ENUM("customer", "ai", "support"), allowNull: false })
  sender!: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  supportUserId?: number;

  @Column({ type: DataType.TEXT, allowNull: false })
  content!: string;

  @Column({ type: DataType.STRING, defaultValue: "text" })
  messageType!: string;

  @BelongsTo(() => Ticket)
  ticket!: Ticket;

  @BelongsTo(() => User, "supportUserId")
  supportUser!: User;
}
