import { Customer } from "../models/customer.model";
import { Product } from "../models/product.model";
import { Order } from "../models/order.model";
import { OrderItem } from "../models/order-item.model";
import { Payment } from "../models/payment.model";
import { sendWhatsAppMessage } from "./whatsapp.service";
import { aiService } from "./ai.service";
import { productService } from "./product.service";
import { cartService } from "./cart.service";
import { scheduleService } from "./schedule.service";
import { bitcoinService } from "./bitcoin.service";

export class BotService {
  async handleMessage(from: string, messageText: string, userName?: string): Promise<void> {
    try {
      // Get or create customer
      let customer = await Customer.findOne({ where: { phone: from } });

      if (!customer) {
        customer = await Customer.create({
          phone: from,
          name: userName || "Customer",
          state: "menu",
        });
      }

      // Check business hours (except for priority commands)
      const upperMessage = messageText.toUpperCase().trim();
      if (!this.isPriorityCommand(upperMessage) && !scheduleService.isOpen()) {
        await sendWhatsAppMessage(from, scheduleService.getOffHoursMessage());
        return;
      }

      // Process message based on customer state
      const customerState = customer.state || "menu";
      let response = "";

      switch (customerState) {
        case "menu":
          response = await this.handleMenuState(customer, upperMessage);
          break;
        case "catalog":
          response = await this.handleCatalogState(customer, upperMessage, messageText);
          break;
        case "cart":
          response = await this.handleCartState(customer, upperMessage, messageText);
          break;
        case "payment":
          response = await this.handlePaymentState(customer, upperMessage, messageText);
          break;
        default:
          response = await this.handleMenuState(customer, upperMessage);
      }

      // If no specific response, use AI
      if (!response) {
        response = await aiService.generateResponse(from, messageText);
        // If AI suggests menu, update state
        if (response.includes("*MENU*")) {
          customer.state = "menu";
          await customer.save();
          response = this.getMainMenu();
        }
      }

      // Send response
      if (response) {
        await sendWhatsAppMessage(from, response);
      }
    } catch (error: any) {
      console.error("Error handling message:", error);
      await sendWhatsAppMessage(
        from,
        "Sorry, an error occurred. Please try again or type *HELP*."
      );
    }
  }

  private async handleMenuState(customer: Customer, message: string): Promise<string> {
    switch (message) {
      case "MENU":
        customer.state = "menu";
        await customer.save();
        return this.getMainMenu();

      case "CATALOG":
      case "PRODUCTS":
        customer.state = "catalog";
        await customer.save();
        return await this.getCatalogMessage();

      case "CART":
      case "CARRITO":
        customer.state = "cart";
        await customer.save();
        return await this.getCartMessage(customer.id);

      case "HELP":
      case "AYUDA":
        return this.getHelpMessage();

      case "HOURS":
      case "HORARIO":
        return `⏰ *BUSINESS HOURS*\n\n${scheduleService.getOpeningHours()}\n(Monday to Friday)\n\nType *MENU* to go back.`;

      default:
        // If not a recognized command, return nothing to use AI
        return "";
    }
  }

  private async handleCatalogState(customer: Customer, upperMessage: string, originalMessage: string): Promise<string> {
    if (upperMessage.startsWith("ADD") || upperMessage.startsWith("AGREGAR") || upperMessage.startsWith("AÑADIR")) {
      const match = originalMessage.match(/\d+/);
      if (match) {
        const productId = parseInt(match[0]);
        const product = await productService.getProductById(productId);
        if (product) {
          await cartService.addToCart(customer.id, productId);
          return `✅ Product "${product.name}" added to cart.\n\nType *CART* to view your cart or *CATALOG* to continue browsing products.`;
        }
      }
      return "❌ Product not found. Please enter the correct catalog number.";
    }

    if (upperMessage === "MENU") {
      customer.state = "menu";
      await customer.save();
      return this.getMainMenu();
    }

    if (upperMessage === "CART" || upperMessage === "CARRITO") {
      customer.state = "cart";
      await customer.save();
      return await this.getCartMessage(customer.id);
    }

    // Show catalog again
    return await this.getCatalogMessage();
  }

  private async handleCartState(customer: Customer, upperMessage: string, originalMessage: string): Promise<string> {
    if (upperMessage === "CHECKOUT" || upperMessage === "BUY" || upperMessage === "FINALIZAR" || upperMessage === "COMPRAR") {
      const cartItems = await cartService.getCart(customer.id);
      if (cartItems.length === 0) {
        return "❌ Your cart is empty. Type *CATALOG* to add products.";
      }

      const total = await cartService.getCartTotal(customer.id);
      
      // Create order
      const orderNumber = `ORD-${Date.now()}`;
      const order = await Order.create({
        customerId: customer.id,
        orderNumber,
        total,
        status: "pending",
      });

      // Add items to order
      for (const cartItem of cartItems) {
        const product = await Product.findByPk(cartItem.productId);
        if (product) {
          await OrderItem.create({
            orderId: order.id,
            productId: product.id,
            quantity: cartItem.quantity,
            price: product.price,
          });
        }
      }

      // Clear cart
      await cartService.clearCart(customer.id);

      customer.state = "payment";
      await customer.save();

      return this.getPaymentOptions(orderNumber, total);
    }

    if (upperMessage.startsWith("REMOVE") || upperMessage.startsWith("ELIMINAR") || upperMessage.startsWith("QUITAR")) {
      const match = originalMessage.match(/\d+/);
      if (match) {
        const productId = parseInt(match[0]);
        await cartService.removeFromCart(customer.id, productId);
        return await this.getCartMessage(customer.id);
      }
    }

    if (upperMessage === "CLEAR" || upperMessage === "VACIAR") {
      await cartService.clearCart(customer.id);
      customer.state = "menu";
      await customer.save();
      return "🛒 Cart cleared.\n\nType *MENU* to return to the main menu.";
    }

    if (upperMessage === "CATALOG" || upperMessage === "CATÁLOGO" || upperMessage === "CATALOGO") {
      customer.state = "catalog";
      await customer.save();
      return await this.getCatalogMessage();
    }

    if (upperMessage === "MENU") {
      customer.state = "menu";
      await customer.save();
      return this.getMainMenu();
    }

    return await this.getCartMessage(customer.id);
  }

  private async handlePaymentState(customer: Customer, upperMessage: string, originalMessage: string): Promise<string> {
    // Find the customer's pending order
    const order = await Order.findOne({
      where: { customerId: customer.id, status: "pending" },
      order: [["createdAt", "DESC"]],
    });

    if (!order) {
      customer.state = "menu";
      await customer.save();
      return this.getMainMenu();
    }

    if (upperMessage === "BITCOIN" || upperMessage === "BTC") {
      const paymentInfo = await bitcoinService.generatePaymentAddress(order.id, parseFloat(order.total.toString()));
      
      await Payment.create({
        orderId: order.id,
        method: "bitcoin",
        amount: order.total,
        bitcoinAddress: paymentInfo.address,
        status: "pending",
      });

      return bitcoinService.formatPaymentMessage(
        paymentInfo.address,
        parseFloat(order.total.toString()),
        order.orderNumber
      );
    }

    if (upperMessage.startsWith("TXID") || upperMessage.startsWith("ID")) {
      // Customer is sending the Bitcoin TXID
      const txId = originalMessage.replace(/^(TXID|ID)\s*/i, "").trim();
      const payment = await Payment.findOne({
        where: { orderId: order.id, status: "pending" },
      });

      if (payment && payment.method === "bitcoin") {
        // In production, this would verify the transaction
        payment.bitcoinTxId = txId;
        payment.status = "confirmed";
        await payment.save();

        order.status = "paid";
        await order.save();

        customer.state = "menu";
        await customer.save();

        return `✅ Payment confirmed!\n\nOrder: ${order.orderNumber}\nAmount: $${order.total} USD\n\nThank you for your purchase. We'll be in touch soon.\n\nType *MENU* to continue.`;
      }
    }

    if (upperMessage === "MENU") {
      customer.state = "menu";
      await customer.save();
      return this.getMainMenu();
    }

    return this.getPaymentOptions(order.orderNumber, parseFloat(order.total.toString()));
  }

  private getMainMenu(): string {
    return (
      "👋 *WELCOME TO OUR SOFTWARE DEVELOPMENT SERVICE*\n\n" +
      "Select an option:\n\n" +
      "1️⃣ *CATALOG* - View our products and services\n" +
      "2️⃣ *CART* - View your shopping cart\n" +
      "3️⃣ *HOURS* - Check business hours\n" +
      "4️⃣ *HELP* - Information and help\n\n" +
      "Type the command in uppercase (e.g., CATALOG)"
    );
  }

  private async getCatalogMessage(): Promise<string> {
    const products = await productService.getAllProducts();
    return productService.formatCatalogMessage(products);
  }

  private async getCartMessage(customerId: number): Promise<string> {
    const cartItems = await cartService.getCart(customerId);
    return cartService.formatCartMessage(cartItems);
  }

  private getHelpMessage(): string {
    return (
      "❓ *HELP*\n\n" +
      "Available commands:\n\n" +
      "• *MENU* - View main menu\n" +
      "• *CATALOG* - View product catalog\n" +
      "• *CART* - View your cart\n" +
      "• *ADD [number]* - Add product to cart\n" +
      "• *CHECKOUT* - Complete purchase\n" +
      "• *HOURS* - View business hours\n\n" +
      "If you have any questions, type your query and our assistant will help you."
    );
  }

  private getPaymentOptions(orderNumber: string, total: number): string {
    return (
      `💰 *PAYMENT OPTIONS*\n\n` +
      `Order: ${orderNumber}\n` +
      `Total: $${total.toFixed(2)} USD\n\n` +
      `Select payment method:\n\n` +
      `🪙 *BITCOIN* - Pay with Bitcoin\n\n` +
      `(More payment methods coming soon)\n\n` +
      `Type *BITCOIN* to pay with Bitcoin or *MENU* to cancel.`
    );
  }

  private isPriorityCommand(message: string): boolean {
    const priorityCommands = ["MENU", "HELP", "HOURS", "HORARIO", "AYUDA"];
    return priorityCommands.includes(message);
  }
}

export const botService = new BotService();

