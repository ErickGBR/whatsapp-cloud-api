import { Table, Column, Model, DataType, HasMany, PrimaryKey, AutoIncrement } from "sequelize-typescript";
import { Order } from "./order.model";

@Table({ tableName: "customers" })
export class Customer extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  id!: number;

  @Column({ type: DataType.STRING, allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  phone!: string;

  @Column({ type: DataType.STRING, allowNull: true })
  email?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  state?: string; // Customer conversation state: 'menu', 'catalog', 'cart', etc.

  @Column({ type: DataType.TEXT, allowNull: true })
  context?: string; // JSON context to maintain conversation state

  @Column({ type: DataType.DATE, allowNull: true })
  lastInteraction?: Date;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  totalTickets!: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes?: string;

  @HasMany(() => Order)
  orders!: Order[];
}

