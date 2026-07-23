# WhatsApp Sales Bot - Software Development System

An intelligent WhatsApp bot for selling software development services, featuring built-in AI (Hugging Face), product catalog, shopping cart, Bitcoin payments, and queue-based async processing. Connects via WhatsApp Web (QR code pairing) with Cloud API fallback for message delivery.

## 🚀 Features

- ✅ **Intelligent Chatbot** with AI (Hugging Face)
- ✅ **Complete Product Catalog** with demos and images
- ✅ **Functional Shopping Cart**
- ✅ **Complete Order System**
- ✅ **Bitcoin Payment** integrated
- ✅ **Configurable Business Hours**
- ✅ **SQLite Database** (relational)
- ✅ **Redis** caching and queues
- ✅ **Queue System** (Bull) for async processing
- ✅ **Dockerized** with Docker Compose

## 📦 Available Products

### Websites
- Custom Website (from $100 USD)
- WordPress
- React (additional cost)

### Systems
- Medical Appointment System
- Inventory System
- Payment Collection System
- Event Ticket System
- Custom ERP

### Applications
- Android Applications

## 🛠 Technologies

- **Node.js** + **TypeScript**
- **Express.js**
- **Sequelize** + **Sequelize-TypeScript**
- **SQLite** (Relational database)
- **Redis** (Cache and queues)
- **Bull** (Queue system)
- **Hugging Face API** (Free AI)
- **Docker** + **Docker Compose**
- **WhatsApp Web** (Baileys — primary connection)
- **WhatsApp Cloud API** (fallback)

## 📋 Prerequisites

- Node.js 18+
- Docker and Docker Compose
- WhatsApp account (for QR code pairing via WhatsApp Web)
- (Optional) Hugging Face token for advanced AI
- (Optional) WhatsApp Business API account (for Cloud API fallback mode)

## ⚙️ Installation

1. **Clone the repository:**
```bash
git clone <repo-url>
cd whatsapp-bot-demo
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
PORT=3000
NODE_ENV=development

# SQLite Database
DB_STORAGE=./data/database.sqlite

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# WhatsApp Cloud API (optional — fallback)
WHATSAPP_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token

# AI (Optional)
HUGGING_FACE_TOKEN=your_huggingface_token

# Bitcoin
BITCOIN_ADDRESS=your_bitcoin_address
```

4. **Run with Docker Compose:**
```bash
docker-compose up -d
```

Or **run locally:**
```bash
# Start Redis (required)
docker run -d -p 6379:6379 redis:7-alpine

# Start the application
npm run dev
```

## 🔧 WhatsApp Web Connection (Primary Method)

The bot connects to WhatsApp using the **Baileys** library, which implements the WhatsApp Web protocol. This is the **primary connection method** — no API tokens or Meta Business account required for receiving messages.

1. **Start the application** — on first run, a QR code will be printed in the terminal:

```bash
npm run dev
```

2. **Scan the QR code** with your phone:
   - Open WhatsApp on your phone
   - Tap the **three dots** menu (Android) or **Settings** (iOS)
   - Go to **Linked Devices** → **Link a Device**
   - Scan the QR code displayed in the terminal

3. **Automatic reconnection** — the bot saves authentication state in the `auth_info/` directory and will reconnect automatically on restart. If the session expires or logs out, delete the `auth_info/` folder and restart.

### Cloud API Fallback

If the WhatsApp Web client is not connected, the bot falls back to the **WhatsApp Cloud API** for sending messages. Messages are queued via Bull and delivered once the connection is established or via the Cloud API if configured.

### Webhook Configuration (Cloud API)

If using WhatsApp Cloud API as your primary or backup method:

1. Configure the webhook in your Meta Developer account:
   - URL: `https://your-domain.com/whatsapp/webhook`
   - Verify token: Same value as `WEBHOOK_VERIFY_TOKEN` in `.env`
   - Events: `messages`

2. For local development, use **ngrok** or similar:
```bash
ngrok http 3000
```

> **Note:** When using WhatsApp Web (Baileys), the webhook is only needed if you also integrate the Cloud API. The QR code method handles incoming messages directly through the WebSocket connection.

## 📱 Bot Usage

### Available Commands:

- **MENU** - View main menu
- **CATALOG** - View full product catalog
- **CART** - View shopping cart
- **ADD [number]** - Add product to cart (e.g., ADD 1)
- **REMOVE [number]** - Remove product from cart
- **CLEAR** - Clear cart
- **CHECKOUT** - Complete purchase
- **BITCOIN** - Pay with Bitcoin
- **HOURS** - View business hours
- **HELP** - View help

### Purchase Flow:

1. User sends **CATALOG**
2. Selects a product by sending **ADD [number]**
3. Views cart with **CART**
4. Proceeds with **CHECKOUT**
5. Selects payment method (**BITCOIN**)
6. Receives Bitcoin address
7. Sends payment and submits TXID
8. Order confirmed

## 🐳 Docker

### Build and run:
```bash
docker-compose up -d --build
```

### View logs:
```bash
docker-compose logs -f app
```

### Stop:
```bash
docker-compose down
```

### Stop and remove volumes:
```bash
docker-compose down -v
```

## 📁 Project Structure

```
whatsapp-bot-demo/
├── src/
│   ├── config/          # Configuration (DB, Redis, Queues)
│   ├── controllers/     # HTTP controllers
│   ├── models/          # Database models
│   ├── routes/          # Express routes
│   ├── services/        # Business logic
│   │   ├── ai.service.ts           # AI service (Hugging Face)
│   │   ├── bitcoin.service.ts      # Bitcoin payments
│   │   ├── bot.service.ts          # Core bot logic
│   │   ├── cart.service.ts         # Shopping cart
│   │   ├── md-reader.service.ts    # Markdown reader
│   │   ├── product.service.ts      # Product management
│   │   ├── schedule.service.ts     # Business hours
│   │   ├── whatsapp.service.ts     # WhatsApp messaging (Cloud API + Web)
│   │   └── whatsapp-web.service.ts # WhatsApp Web connection (Baileys)
│   ├── app.ts
│   └── server.ts
├── data/                # SQLite database (generated)
├── auth_info/           # WhatsApp Web auth state (generated)
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## 🔐 Security

- Never commit your `.env` files
- Use secure tokens for production
- Configure HTTPS for the webhook (Cloud API mode)
- Validate all user input
- The `auth_info/` directory contains your WhatsApp session credentials — treat it as sensitive data and add it to `.gitignore`

## 🤝 Contributing

Contributions are welcome. Please:

1. Fork the project
2. Create a branch for your feature
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

See the LICENSE file.

## 📞 Support

For support, open an issue in the repository.

---

Built with ❤️ to automate software sales
