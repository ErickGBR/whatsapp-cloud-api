import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from "sequelize-typescript";
import { User } from "./user.model";

@Table({ tableName: "activity_logs" })
export class ActivityLog extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  id!: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId!: number;

  @Column({ type: DataType.STRING, allowNull: false })
  action!: string; // 'login', 'assign_ticket', 'resolve_ticket', 'request_break', 'report_incident', etc.

  @Column({ type: DataType.TEXT, allowNull: true })
  details?: string; // JSON metadata

  @Column({ type: DataType.INTEGER, allowNull: true })
  ticketId?: number;

  @BelongsTo(() => User)
  user!: User;
}
