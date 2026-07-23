import { Sequelize } from "sequelize-typescript";
import dotenv from "dotenv";
import { Customer } from "../models/customer.model";
import { Product } from "../models/product.model";
import { CartItem } from "../models/cart-item.model";
import { Order } from "../models/order.model";
import { OrderItem } from "../models/order-item.model";
import { Payment } from "../models/payment.model";

dotenv.config();

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: process.env.DB_STORAGE || "./database.sqlite",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  models: [Customer, Product, CartItem, Order, OrderItem, Payment],
});
