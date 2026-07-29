import { Product } from "../models/product.model";

export interface ProductCatalog {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  demoUrl?: string;
  imageUrl?: string;
}

export class ProductService {
  async initializeProducts(): Promise<void> {
    const count = await Product.count();
    if (count === 0) {
      await Product.bulkCreate(this.getDefaultProducts());
    }
  }

  private getDefaultProducts(): Partial<Product>[] {
    return [
      // Websites
      {
        name: "Custom Website",
        description: "Custom website development from $100 USD",
        price: 100,
        category: "website",
        demoUrl: "https://example.com/demo/website",
        imageUrl: "https://example.com/images/website.jpg",
        active: true,
      },
      {
        name: "WordPress Website",
        description: "WordPress website development",
        price: 150,
        category: "wordpress",
        demoUrl: "https://example.com/demo/wordpress",
        imageUrl: "https://example.com/images/wordpress.jpg",
        active: true,
      },
      {
        name: "React Website",
        description: "React website development (extra cost for advanced features)",
        price: 200,
        category: "react",
        demoUrl: "https://example.com/demo/react",
        imageUrl: "https://example.com/images/react.jpg",
        active: true,
      },
      // Systems
      {
        name: "Medical Appointment System",
        description: "Complete system for medical appointment management",
        price: 500,
        category: "system",
        demoUrl: "https://example.com/demo/citas-medicas",
        imageUrl: "https://example.com/images/citas-medicas.jpg",
        active: true,
      },
      {
        name: "Inventory System",
        description: "Inventory and stock control system",
        price: 600,
        category: "system",
        demoUrl: "https://example.com/demo/inventario",
        imageUrl: "https://example.com/images/inventario.jpg",
        active: true,
      },
      {
        name: "Payment Collection System",
        description: "Payment and collection management system",
        price: 550,
        category: "system",
        demoUrl: "https://example.com/demo/cobros",
        imageUrl: "https://example.com/images/cobros.jpg",
        active: true,
      },
      {
        name: "Event Ticket System",
        description: "Online event ticket sales system",
        price: 700,
        category: "system",
        demoUrl: "https://example.com/demo/tickets",
        imageUrl: "https://example.com/images/tickets.jpg",
        active: true,
      },
      {
        name: "Custom ERP",
        description: "Complete ERP system for business management",
        price: 2000,
        category: "system",
        demoUrl: "https://example.com/demo/erp",
        imageUrl: "https://example.com/images/erp.jpg",
        active: true,
      },
      // Android Apps
      {
        name: "Android Application",
        description: "Mobile application development for Android",
        price: 800,
        category: "app",
        demoUrl: "https://example.com/demo/android",
        imageUrl: "https://example.com/images/android.jpg",
        active: true,
      },
    ];
  }

  async getAllProducts(): Promise<Product[]> {
    return await Product.findAll({ where: { active: true }, order: [["category", "ASC"], ["name", "ASC"]] });
  }

  async getProductById(id: number): Promise<Product | null> {
    return await Product.findByPk(id);
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return await Product.findAll({ where: { category, active: true } });
  }

  formatCatalogMessage(products: Product[]): string {
    let message = "📦 *PRODUCT CATALOG*\n\n";
    
    const categories: { [key: string]: Product[] } = {};
    products.forEach((product) => {
      if (!categories[product.category]) {
        categories[product.category] = [];
      }
      categories[product.category].push(product);
    });

    for (const [category, categoryProducts] of Object.entries(categories)) {
      message += `*${this.getCategoryName(category)}*\n`;
      categoryProducts.forEach((product) => {
        message += `\n${product.id}. ${product.name}\n`;
        message += `   💰 $${product.price} USD\n`;
        message += `   📝 ${product.description}\n`;
        if (product.demoUrl) {
          message += `   🔗 Demo: ${product.demoUrl}\n`;
        }
      });
      message += "\n";
    }

    message += "To inquire about any product, just let me know its name or number.\n";
    message += "Example: *Tell me about product 1*\n\n";
    message += "Type *MENU* to return to the main menu.";

    return message;
  }

  private getCategoryName(category: string): string {
    const names: { [key: string]: string } = {
      website: "🌐 WEBSITES",
      wordpress: "📝 WORDPRESS",
      react: "⚛️ REACT",
      system: "💻 SYSTEMS",
      app: "📱 ANDROID APPS",
    };
    return names[category] || category.toUpperCase();
  }
}

export const productService = new ProductService();

