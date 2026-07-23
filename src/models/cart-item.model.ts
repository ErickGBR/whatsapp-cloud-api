import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from "sequelize-typescript";
import { Customer } from "./customer.model";
import { Product } from "./product.model";

@Table({ tableName: "cart_items" })
export class CartItem extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  id!: number;

  @ForeignKey(() => Customer)
  @Column({ type: DataType.INTEGER, allowNull: false })
  customerId!: number;

  @ForeignKey(() => Product)
  @Column({ type: DataType.INTEGER, allowNull: false })
  productId!: number;

  @Column({ type: DataType.INTEGER, defaultValue: 1 })
  quantity!: number;

  @BelongsTo(() => Customer)
  customer!: Customer;

  @BelongsTo(() => Product)
  product!: Product;
}

