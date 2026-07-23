import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, HasMany } from "sequelize-typescript";
import { OrderItem } from "./order-item.model";

@Table({ tableName: "products" })
export class Product extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  id!: number;

  @Column({ type: DataType.STRING, allowNull: false })
  name!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description!: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  price!: number;

  @Column({ type: DataType.STRING, allowNull: false })
  category!: string; // 'website', 'system', 'app', 'wordpress', 'react', etc.

  @Column({ type: DataType.STRING, allowNull: true })
  demoUrl?: string; // Demo URL

  @Column({ type: DataType.STRING, allowNull: true })
  imageUrl?: string; // Image URL

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  active!: boolean;

  @HasMany(() => OrderItem)
  orderItems!: OrderItem[];
}

