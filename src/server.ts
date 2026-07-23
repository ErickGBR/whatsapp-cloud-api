import app from "./app";
import { sequelize } from "./config/database";
import { connectRedis } from "./config/redis";
import { productService } from "./services/product.service";
import { whatsappWebService } from "./services/whatsapp-web.service";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    // Sync models
    await sequelize.sync({ alter: true });
    console.log("✅ Database synchronized");

    // Initialize products
    await productService.initializeProducts();
    console.log("✅ Products initialized");

    // Conectar a Redis
    try {
      await connectRedis();
      console.log("✅ Redis connected");
    } catch (error) {
      console.warn("⚠️ Redis connection failed, continuing without Redis cache");
    }

    // Iniciar WhatsApp Web client (QR pairing in CLI)
    console.log("\n📱 Starting WhatsApp Web client...");
    console.log("   (Scan the QR code with your phone to connect)\n");
    whatsappWebService.start();

    // Iniciar servidor HTTP
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📱 Webhook URL: http://your-domain.com/whatsapp/webhook`);
    });
  } catch (error) {
    console.error("❌ Error starting server:", error);
    process.exit(1);
  }
}

startServer();
