import { Table, Column, Model, DataType, HasMany, PrimaryKey, AutoIncrement } from "sequelize-typescript";
import { CartItem } from "./cart-item.model";
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

  @HasMany(() => CartItem)
  cartItems!: CartItem[];

  @HasMany(() => Order)
  orders!: Order[];
}

