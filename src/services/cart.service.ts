import { Customer } from "../models/customer.model";
import { Product } from "../models/product.model";

// Temporary in-memory cart item interface (replaces deleted CartItem model)
export interface CartItem {
  customerId: number;
  productId: number;
  quantity: number;
  product?: Product;
}

// In-memory storage: Map<customerId, Map<productId, quantity>>
const cartStore = new Map<number, Map<number, number>>();

export class CartService {
  async addToCart(customerId: number, productId: number, quantity: number = 1): Promise<CartItem> {
    let customerCart = cartStore.get(customerId);
    if (!customerCart) {
      customerCart = new Map();
      cartStore.set(customerId, customerCart);
    }

    const existing = customerCart.get(productId) || 0;
    customerCart.set(productId, existing + quantity);

    const product = await Product.findByPk(productId);
    return {
      customerId,
      productId,
      quantity: existing + quantity,
      product: product || undefined,
    };
  }

  async getCart(customerId: number): Promise<CartItem[]> {
    const customerCart = cartStore.get(customerId);
    if (!customerCart || customerCart.size === 0) {
      return [];
    }

    const items: CartItem[] = [];
    for (const [productId, quantity] of customerCart.entries()) {
      const product = await Product.findByPk(productId);
      items.push({
        customerId,
        productId,
        quantity,
        product: product || undefined,
      });
    }
    return items;
  }

  async removeFromCart(customerId: number, productId: number): Promise<boolean> {
    const customerCart = cartStore.get(customerId);
    if (!customerCart) return false;
    return customerCart.delete(productId);
  }

  async updateCartItemQuantity(customerId: number, productId: number, quantity: number): Promise<boolean> {
    if (quantity <= 0) {
      return await this.removeFromCart(customerId, productId);
    }

    let customerCart = cartStore.get(customerId);
    if (!customerCart) {
      customerCart = new Map();
      cartStore.set(customerId, customerCart);
    }

    customerCart.set(productId, quantity);
    return true;
  }

  async clearCart(customerId: number): Promise<void> {
    cartStore.delete(customerId);
  }

  async getCartTotal(customerId: number): Promise<number> {
    const cartItems = await this.getCart(customerId);
    let total = 0;

    for (const item of cartItems) {
      const product = item.product;
      if (product) {
        total += parseFloat(product.price.toString()) * item.quantity;
      } else {
        const fetched = await Product.findByPk(item.productId);
        if (fetched) {
          total += parseFloat(fetched.price.toString()) * item.quantity;
        }
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
