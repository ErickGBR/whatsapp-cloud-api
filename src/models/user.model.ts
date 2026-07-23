import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, HasMany } from "sequelize-typescript";
import { Ticket } from "./ticket.model";
import { ActivityLog } from "./activity-log.model";
import { Permission } from "./permission.model";

@Table({ tableName: "users" })
export class User extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  id!: number;

  @Column({ type: DataType.STRING, allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  email!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  password!: string; // hashed with bcrypt

  @Column({ type: DataType.ENUM("admin", "support"), defaultValue: "support" })
  role!: string;

  @Column({ type: DataType.STRING, allowNull: true })
  phone?: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  active!: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  lastLogin?: Date;

  @Column({ type: DataType.STRING, defaultValue: "offline" })
  socketStatus!: string; // 'online', 'offline', 'onBreak', 'busy'

  @HasMany(() => Ticket)
  assignedTickets!: Ticket[];

  @HasMany(() => ActivityLog)
  activityLogs!: ActivityLog[];

  @HasMany(() => Permission)
  permissions!: Permission[];
}
