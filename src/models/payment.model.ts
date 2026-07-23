import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from "sequelize-typescript";
import { Order } from "./order.model";

@Table({ tableName: "payments" })
export class Payment extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  id!: number;

  @ForeignKey(() => Order)
  @Column({ type: DataType.INTEGER, allowNull: false })
  orderId!: number;

  @Column({ type: DataType.STRING, allowNull: false })
  method!: string; // 'bitcoin', 'transfer', 'cash', etc.

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  amount!: number;

  @Column({ type: DataType.STRING, allowNull: true })
  bitcoinAddress?: string; // Bitcoin address to receive payment

  @Column({ type: DataType.STRING, allowNull: true })
  bitcoinTxId?: string; // Bitcoin transaction ID

  @Column({ type: DataType.STRING, defaultValue: "pending" })
  status!: string; // 'pending', 'confirmed', 'failed'

  @BelongsTo(() => Order)
  order!: Order;
}

