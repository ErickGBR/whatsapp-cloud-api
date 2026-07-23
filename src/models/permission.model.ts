import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from "sequelize-typescript";
import { User } from "./user.model";

@Table({ tableName: "permissions" })
export class Permission extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  id!: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId!: number;

  @Column({ type: DataType.ENUM("break", "bathroom", "eating", "other"), allowNull: false })
  type!: string;

  @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
  requestedAt!: Date;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  approvedBy?: number;

  @Column({ type: DataType.DATE, allowNull: true })
  approvedAt?: Date;

  @Column({ type: DataType.ENUM("pending", "approved", "denied"), defaultValue: "pending" })
  status!: string;

  @Column({ type: DataType.INTEGER, defaultValue: 5 })
  maxDuration!: number; // minutes

  @Column({ type: DataType.INTEGER, allowNull: true })
  actualDuration?: number; // minutes

  @BelongsTo(() => User, "userId")
  requester!: User;

  @BelongsTo(() => User, "approvedBy")
  approver!: User;
}
