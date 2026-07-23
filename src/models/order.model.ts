import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, HasMany } from "sequelize-typescript";
import { Customer } from "./customer.model";
import { OrderItem } from "./order-item.model";

@Table({ tableName: "orders" })
export class Order extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  id!: number;

  @ForeignKey(() => Customer)
  @Column({ type: DataType.INTEGER, allowNull: false })
  customerId!: number;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  orderNumber!: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  total!: number;

  @Column({ type: DataType.STRING, defaultValue: "pending" })
  status!: string; // 'pending', 'confirmed', 'paid', 'cancelled', 'completed'

  @Column({ type: DataType.INTEGER, allowNull: true })
  ticketId?: number; // FK to Ticket (soft reference — no constraint enforced at DB level)

  @BelongsTo(() => Customer)
  customer!: Customer;

  @HasMany(() => OrderItem)
  items!: OrderItem[];
}

