# WhatsApp Sales Bot — AI Support + Dashboard

An intelligent WhatsApp bot with an AI-powered sales and support agent, ticket management system, and a full-featured admin dashboard. Connects via WhatsApp Web (QR code pairing) with Cloud API fallback for message delivery.

## Features

- **AI-powered sales/support agent** (Hugging Face)
- **WhatsApp Web connection** (QR code pairing via Baileys)
- **Ticket system** with human support escalation
- **Admin dashboard** with real-time metrics
- **Support agent panel** with chat interface
- **Analytics and activity tracking**
- **Permission management** with break tracking
- **Queue system** (Bull) for async processing
- **Dockerized** with Docker Compose

## Tech Stack

- **Node.js** + **TypeScript**
- **Express.js**
- **Sequelize** + **SQLite** (relational database)
- **Redis** (cache and queues)
- **Bull** (queue system)
- **Hugging Face API** (AI agent)
- **Docker** + **Docker Compose**
- **WhatsApp Web** (Baileys — primary connection)
- **WhatsApp Cloud API** (fallback)

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- WhatsApp account (for QR code pairing via WhatsApp Web)
- (Optional) Hugging Face token for advanced AI
- (Optional) WhatsApp Business API account (for Cloud API fallback mode)

## Quick Start

### 1. Clone the repository

```bash
git clone <repo-url>
cd whatsapp-bot-demo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials. At minimum, set a `JWT_SECRET` for dashboard authentication.

### 4. Run with Docker Compose

```bash
docker-compose up -d --build
```

Or **run locally:**

```bash
# Start Redis (required)
docker run -d -p 6379:6379 redis:7-alpine

# Start the application
npm run dev
```

## Bot Commands

- **MENU** — View main menu
- **HELP** — View help and available commands
- **HOURS** — View business hours

## Dashboard

The admin dashboard is available at `http://localhost:3000/dashboard` (or your configured port).

### Dashboard Setup

1. **Set `JWT_SECRET`** in your `.env` file — this secures dashboard authentication.
2. **Set `DASHBOARD_ORIGIN`** to match your frontend URL (default: `http://localhost:5173` for Vite dev server).
3. **Start the app** and navigate to the dashboard URL.
4. **Login** with your admin credentials.

> **Note:** When running the dashboard frontend separately (e.g., Vite dev server on port 5173), ensure `DASHBOARD_ORIGIN` matches the frontend origin to allow CORS.

## WhatsApp Web Connection (Primary Method)

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

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `DB_STORAGE` | SQLite database file path | `./data/database.sqlite` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `WHATSAPP_TOKEN` | WhatsApp Cloud API token | — |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp phone number ID | — |
| `WEBHOOK_VERIFY_TOKEN` | Webhook verification token | — |
| `JWT_SECRET` | JWT secret for dashboard auth | — |
| `HUGGING_FACE_TOKEN` | Hugging Face API token (optional) | — |
| `DASHBOARD_ORIGIN` | Dashboard frontend origin for CORS | `http://localhost:5173` |

## Docker

### Build and run

```bash
docker-compose up -d --build
```

### View logs

```bash
docker-compose logs -f app
```

### Stop

```bash
docker-compose down
```

### Stop and remove volumes

```bash
docker-compose down -v
```

## Project Structure

```
whatsapp-bot-demo/
├── src/
│   ├── config/           # Configuration (DB, Redis, Queues)
│   ├── controllers/      # HTTP controllers
│   ├── models/           # Database models
│   ├── routes/           # Express routes
│   ├── services/         # Business logic
│   │   ├── ai.service.ts           # AI service (Hugging Face)
│   │   ├── bot.service.ts          # Core bot logic
│   │   ├── whatsapp.service.ts     # WhatsApp messaging (Cloud API + Web)
│   │   └── whatsapp-web.service.ts # WhatsApp Web connection (Baileys)
│   ├── app.ts
│   └── server.ts
├── data/                 # SQLite database (generated)
├── auth_info/            # WhatsApp Web auth state (generated)
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

## Security

- Never commit your `.env` files
- Use a strong, unique `JWT_SECRET` in production
- Configure HTTPS for the webhook (Cloud API mode)
- Validate all user input
- The `auth_info/` directory contains your WhatsApp session credentials — treat it as sensitive data and add it to `.gitignore`

## License

See the LICENSE file.

---

Built with automation to streamline sales and support
