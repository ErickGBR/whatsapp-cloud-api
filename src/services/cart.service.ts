import { Customer } from "../models/customer.model";
import { Product } from "../models/product.model";
import { CartItem } from "../models/cart-item.model";

export class CartService {
  async addToCart(customerId: number, productId: number, quantity: number = 1): Promise<CartItem> {
    const existingItem = await CartItem.findOne({
      where: { customerId, productId },
    });

    if (existingItem) {
      existingItem.quantity += quantity;
      await existingItem.save();
      return existingItem;
    }

    return await CartItem.create({
      customerId,
      productId,
      quantity,
    });
  }

  async getCart(customerId: number): Promise<CartItem[]> {
    return await CartItem.findAll({
      where: { customerId },
      include: [{ model: Product }],
    });
  }

  async removeFromCart(customerId: number, productId: number): Promise<boolean> {
    const deleted = await CartItem.destroy({
      where: { customerId, productId },
    });
    return deleted > 0;
  }

  async updateCartItemQuantity(customerId: number, productId: number, quantity: number): Promise<boolean> {
    if (quantity <= 0) {
      return await this.removeFromCart(customerId, productId);
    }

    const updated = await CartItem.update(
      { quantity },
      { where: { customerId, productId } }
    );

    return updated[0] > 0;
  }

  async clearCart(customerId: number): Promise<void> {
    await CartItem.destroy({ where: { customerId } });
  }

  async getCartTotal(customerId: number): Promise<number> {
    const cartItems = await this.getCart(customerId);
    let total = 0;

    for (const item of cartItems) {
      const product = await Product.findByPk(item.productId);
      if (product) {
        total += parseFloat(product.price.toString()) * item.quantity;
      }
    }

    return total;
  }

  formatCartMessage(cartItems: CartItem[]): string {
    if (cartItems.length === 0) {
      return "🛒 Your cart is empty.\n\nType *CATALOG* to see our products.";
    }

    let message = "🛒 *YOUR SHOPPING CART*\n\n";
    let total = 0;

    for (const item of cartItems) {
      const product = item.product as Product;
      const itemTotal = parseFloat(product.price.toString()) * item.quantity;
      total += itemTotal;

      message += `${product.name}\n`;
      message += `   Quantity: ${item.quantity}\n`;
      message += `   Unit price: $${product.price} USD\n`;
      message += `   Subtotal: $${itemTotal.toFixed(2)} USD\n\n`;
    }

    message += `💰 *TOTAL: $${total.toFixed(2)} USD*\n\n`;
    message += "Options:\n";
    message += "• *CHECKOUT* - Complete purchase\n";
    message += "• *REMOVE [number]* - Remove product\n";
    message += "• *CLEAR* - Clear cart\n";
    message += "• *CATALOG* - View more products";

    return message;
  }
}

export const cartService = new CartService();

