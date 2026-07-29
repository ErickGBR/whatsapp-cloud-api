# WhatsApp Sales Bot — AI Support + Dashboard

An intelligent WhatsApp bot with an AI-powered sales and support agent, ticket management system, and a full-featured admin dashboard. Connects via WhatsApp Web (QR code pairing) with Cloud API fallback for message delivery.

## Screenshots

<div align="center">
  <table>
    <tr>
      <td align="center"><strong>Login</strong></td>
      <td align="center"><strong>Admin Dashboard</strong></td>
    </tr>
    <tr>
      <td><img src="screenshots/login.png" alt="Login" width="400"/></td>
      <td><img src="screenshots/admin-dashboard.png" alt="Admin Dashboard" width="400"/></td>
    </tr>
    <tr>
      <td align="center"><strong>Tickets Management</strong></td>
      <td align="center"><strong>Support Agents</strong></td>
    </tr>
    <tr>
      <td><img src="screenshots/tickets.png" alt="Tickets" width="400"/></td>
      <td><img src="screenshots/agents.png" alt="Agents" width="400"/></td>
    </tr>
    <tr>
      <td align="center"><strong>Activity Logs</strong></td>
      <td align="center"><strong>Permissions Management</strong></td>
    </tr>
    <tr>
      <td><img src="screenshots/activity.png" alt="Activity" width="400"/></td>
      <td><img src="screenshots/permissions.png" alt="Permissions" width="400"/></td>
    </tr>
    <tr>
      <td align="center"><strong>Support Tickets</strong></td>
      <td align="center"><strong>Live Chat</strong></td>
    </tr>
    <tr>
      <td><img src="screenshots/support-tickets.png" alt="Support Tickets" width="400"/></td>
      <td><img src="screenshots/support-chat.png" alt="Support Chat" width="400"/></td>
    </tr>
  </table>
</div>

## Features

- **AI-powered sales/support agent** (Hugging Face)
- **WhatsApp Web connection** (QR code pairing via Baileys)
- **Ticket system** with human support escalation
- **Admin dashboard** with real-time metrics
- **Support agent panel** with chat interface
- **Analytics and activity tracking**
- **Permission management** with break tracking
- **Queue system** (Bull) for async processing
- **Dockerized deployment** with Docker support
- **Render-ready** (deploy via Docker on Render)

## Tech Stack

- **Node.js** + **TypeScript**
- **Express.js**
- **Sequelize** + **SQLite** (relational database)
- **Redis** (cache and queues)
- **Bull** (queue system)
- **Hugging Face API** (AI agent)
- **pnpm** (package manager)
- **Docker**
- **React** + **Vite** + **Tailwind CSS** (dashboard frontend)
- **WhatsApp Web** (Baileys — primary connection)
- **WhatsApp Cloud API** (fallback)

## Prerequisites

- Node.js 18+
- pnpm 9+
- Docker (optional, for containerized deployment)
- WhatsApp account (for QR code pairing via WhatsApp Web)
- (Optional) Hugging Face token for advanced AI
- (Optional) WhatsApp Business API account (for Cloud API fallback mode)

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
├── dashboard/            # React frontend (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── pages/        # Dashboard pages
│   │   ├── contexts/     # Auth & Socket contexts
│   │   └── components/   # Reusable UI components
│   └── ...
├── data/                 # SQLite database (generated)
├── auth_info/            # WhatsApp Web auth state (generated)
├── screenshots/          # Application screenshots
├── docker-compose.yml
├── Dockerfile
├── render.yaml           # Render deployment config (Docker)
├── .env.example
└── package.json
```

## Quick Start

### 1. Clone the repository

```bash
git clone <repo-url>
cd whatsapp-bot-demo
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials. At minimum, set a `JWT_SECRET` for dashboard authentication.

### 4. Build and run

```bash
# Build TypeScript
pnpm run build

# Start the server
pnpm start
```

The API server will start on port `3000` by default.

### 5. Start the dashboard (development mode)

```bash
cd dashboard
pnpm install
pnpm dev
```

The dashboard frontend will start on port `5173` (Vite dev server).

## Docker Deployment

### Build and run with Docker

```bash
docker build -t whatsapp-bot .
docker run -p 3000:3000 --env-file .env whatsapp-bot
```

### Docker Compose

```bash
docker compose up -d --build
```

### View logs

```bash
docker compose logs -f app
```

### Stop

```bash
docker compose down
```

### Stop and remove volumes

```bash
docker compose down -v
```

## Deploy to Render

This project includes a `render.yaml` blueprint for one-click deployment on Render using Docker:

1. Push your repository to GitHub
2. In the Render Dashboard, click **New +** → **Blueprint**
3. Connect your repository
4. Set the required environment variables in Render's dashboard
5. Deploy — Render will build the Docker image and start the service

Alternatively, create a **Web Service** manually:
- **Runtime**: Docker
- **Health Check Path**: `/health`
- **Env vars**: Set `JWT_SECRET`, `REDIS_URL`, `WHATSAPP_TOKEN`, etc.

> **Note**: Render's free tier does not support Redis. For the queue system to work, upgrade to a plan that supports Redis or disable the queue.

## WhatsApp Web Connection (Primary Method)

The bot connects to WhatsApp using the **Baileys** library, which implements the WhatsApp Web protocol. This is the **primary connection method** — no API tokens or Meta Business account required for receiving messages.

1. **Start the application** — on first run, a QR code will be printed in the terminal:

```bash
pnpm start
```

2. **Scan the QR code** with your phone:
   - Open WhatsApp on your phone
   - Tap the **three dots** menu (Android) or **Settings** (iOS)
   - Go to **Linked Devices** → **Link a Device**
   - Scan the QR code displayed in the terminal

3. **Automatic reconnection** — the bot saves authentication state in the `auth_info/` directory and will reconnect automatically on restart. If the session expires or logs out, delete the `auth_info/` folder and restart.

### Cloud API Fallback

If the WhatsApp Web client is not connected, the bot falls back to the **WhatsApp Cloud API** for sending messages. Messages are queued via Bull and delivered once the connection is established or via the Cloud API if configured.

## Dashboard

The admin dashboard is available at `http://localhost:3000/dashboard` (or your configured port).

### Dashboard Setup

1. **Set `JWT_SECRET`** in your `.env` file — this secures dashboard authentication.
2. **Set `DASHBOARD_ORIGIN`** to match your frontend URL (default: `http://localhost:5173` for Vite dev server).
3. **Start the app** and navigate to the dashboard URL.
4. **Login** with your admin credentials (default seed: `admin@example.com` / `admin123`).

> **Note:** When running the dashboard frontend separately (e.g., Vite dev server on port 5173), ensure `DASHBOARD_ORIGIN` matches the frontend origin to allow CORS.

## Bot Commands

- **MENU** — View main menu
- **HELP** — View help and available commands
- **HOURS** — View business hours

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `DB_STORAGE` | SQLite database file path | `./data/database.sqlite` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password (optional) | — |
| `WHATSAPP_TOKEN` | WhatsApp Cloud API token | — |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp phone number ID | — |
| `WEBHOOK_VERIFY_TOKEN` | Webhook verification token | — |
| `JWT_SECRET` | JWT secret for dashboard auth | — |
| `HUGGING_FACE_TOKEN` | Hugging Face API token (optional) | — |
| `DASHBOARD_ORIGIN` | Dashboard frontend origin for CORS | `http://localhost:5173` |

## Security

- Never commit your `.env` files or `.env` content
- Use a strong, unique `JWT_SECRET` in production
- Configure HTTPS for the webhook (Cloud API mode)
- Validate all user input
- The `auth_info/` directory contains your WhatsApp session credentials — treat it as sensitive data and add it to `.gitignore`
- API endpoints are protected with JWT-based authentication

## License

See the LICENSE file.

---

Built with automation to streamline sales and support
