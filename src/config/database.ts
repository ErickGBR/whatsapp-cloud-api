import { Sequelize } from "sequelize-typescript";
import dotenv from "dotenv";
import { Customer } from "../models/customer.model";
import { Product } from "../models/product.model";
import { Order } from "../models/order.model";
import { OrderItem } from "../models/order-item.model";
import { User } from "../models/user.model";
import { Ticket } from "../models/ticket.model";
import { TicketMessage } from "../models/ticket-message.model";
import { ActivityLog } from "../models/activity-log.model";
import { Permission } from "../models/permission.model";
import { BotConfig } from "../models/bot-config.model";

dotenv.config();

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: process.env.DB_STORAGE || "./database.sqlite",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  models: [Customer, Product, Order, OrderItem, User, Ticket, TicketMessage, ActivityLog, Permission, BotConfig],
});
