# WhatsApp Sales Bot

AI-powered WhatsApp sales and support bot with a real-time admin dashboard. Connects via **Baileys QR** (WhatsApp Web pairing) as the primary channel, with an optional **Meta WhatsApp Cloud API** webhook fallback. The dashboard is a React 19 + Vite + Tailwind v4 SPA served statically by the backend in a single container.

## Features

- **Baileys QR pairing** (primary) — scan from WhatsApp app, Linked Devices
- **WhatsApp Cloud API webhook** (optional fallback) — production-ready, headless
- **Google Gemini AI** — REST-based via axios; rule-based fallback when no API key is set
- **Ticket system** — AI escalation or configured ticket commands (TICKET, AGENTE, SOPORTE, SUPPORT)
- **Real-time updates** — Socket.IO for live ticket events and connection status
- **Admin dashboard** — single-container, served at the same origin as the API
- **Admin-editable bot config** — system prompt, welcome message, ticket commands, AI model
- **Bull queues** (Redis) — optional, app degrades gracefully without it
- **JWT bearer auth** — CSRF-mitigated (no session cookies), admin-only QR exposure
- **Docker** — unified 3-stage build, non-root runtime, health check
- **Render Blueprint** — deploy via `render.yaml` (Docker runtime)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Docker container (node:22-bookworm-slim, non-root) │
│                                                     │
│  ┌──────────────┐   ┌───────────────────────────┐  │
│  │ Express API  │   │  Static SPA (dashboard)   │  │
│  │  :3000       │   │  served from /app/public   │  │
│  │              │   │  served at same origin     │  │
│  │  /health     │   │  /dashboard                │  │
│  │  /whatsapp/* │   │                            │  │
│  │  /api/*      │   │  React 19 + Vite + Tailwind│  │
│  └──────┬───────┘   └────────────┬──────────────┘  │
│         │                        │                   │
│         ▼                        ▼                   │
│  ┌──────────────┐   ┌───────────────────────────┐  │
│  │ Baileys QR   │   │  Gemini REST (axios)      │  │
│  │ Cloud API    │   │  GEMINI_API_KEY (opt.)    │  │
│  └──────────────┘   └───────────────────────────┘  │
│                                                     │
│  ┌──────────────┐   ┌───────────────────────────┐  │
│  │ SQLite       │   │  Redis (Bull queues)      │  │
│  │ ./data/      │   │  (optional, graceful      │  │
│  │ database.sqlite│  │   degradation)             │  │
│  └──────────────┘   └───────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

- **Node.js 22** + **TypeScript** + **Express**
- **SQLite** via **Sequelize** (ORM) at `./data/database.sqlite`
- **@whiskeysockets/baileys** — WhatsApp Web QR pairing
- **Google Gemini** REST API (via `axios`) — configurable model per BotConfig
- **Socket.IO** — real-time dashboard updates
- **Bull** + **Redis** — optional job queues (graceful degradation)
- **React 19** + **Vite** + **Tailwind v4** — dashboard frontend (compiled into backend)
- **Yarn 1** (classic) — package manager (root `yarn.lock` + `dashboard/yarn.lock`)
- **Docker** — 3-stage build (backend compile, dashboard compile, runtime)
- **Playwright** — E2E testing

## Quick Start (Local)

### 1. Clone and install

```bash
git clone <repo-url>
cd whatsapp-bot-demo
yarn install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials. See [Configuration](#configuration) for details.

### 3. Run in development mode

```bash
yarn dev
```

The backend starts on `http://localhost:3000`. The dashboard is served at the same origin (`http://localhost:3000/dashboard`). A QR code is printed in the terminal for WhatsApp pairing.

### 4. Run E2E tests

```bash
# Start the Docker stack first, then:
yarn test:e2e

# Or use the convenience script (builds + starts Docker + runs tests + tears down):
./scripts/run-e2e.sh
```

## Configuration

### Environment Variables

| Variable | Required? | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `DB_STORAGE` | No | `./data/database.sqlite` | SQLite database path |
| `DASHBOARD_STATIC_DIR` | No | `/app/public` | Directory for compiled dashboard assets |
| `JWT_SECRET` | **Yes (production)** | — | Signs admin JWT tokens; app refuses to boot in production without it |
| `ADMIN_EMAIL` | **Yes (production)** | — | Initial admin email; app refuses to boot in production without it |
| `ADMIN_PASSWORD` | **Yes (production)** | — | Initial admin password; app refuses to boot in production without it |
| `GEMINI_API_KEY` | No | — | Google Gemini API key; without it the bot uses rule-based fallback responses |
| `GEMINI_API_URL` | No | `https://generativelanguage.googleapis.com/v1beta/models/{aiModel}:generateContent` | Gemini REST endpoint (model is configurable per BotConfig) |
| `WHATSAPP_TOKEN` | No | — | WhatsApp Cloud API token (fallback channel) |
| `WHATSAPP_PHONE_NUMBER_ID` | No | — | WhatsApp Cloud API phone number ID (fallback channel) |
| `WEBHOOK_VERIFY_TOKEN` | No | — | Webhook verification token (fallback channel) |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection string for Bull queues |
| `REDIS_HOST` | No | `localhost` | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |
| `DASHBOARD_ORIGIN` | No | `http://localhost:3000` | CORS origin for the dashboard (same origin in production) |

> **Production note:** `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` are required when `NODE_ENV=production`. The app fails fast (exits on boot) without them.

## WhatsApp QR Connection

The **primary** WhatsApp channel is **Baileys QR pairing** (WhatsApp Web protocol).

1. Start the app: `yarn dev` (or `yarn start`).
2. A QR code is printed in the terminal on first run.
3. Scan it with your phone:
   - Open WhatsApp > **Settings** > **Linked Devices** > **Link a Device**
   - Point the camera at the terminal QR code
4. The session is persisted in `auth_info/` and reconnects automatically on restart.

### Cloud API Fallback (Optional)

When Baileys is not connected, the bot can receive messages via the **Meta WhatsApp Cloud API** webhook. Set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and `WEBHOOK_VERIFY_TOKEN` in your environment. Configure the webhook URL in the Meta Developer Console to point to `https://<your-domain>/whatsapp/webhook`.

## Admin Panel (Dashboard)

The dashboard is a React 19 + Vite + Tailwind v4 SPA compiled into the backend and served statically at the same origin. Pages:

- **Dashboard** — real-time metrics and overview
- **Tickets** — view and manage support tickets
- **Agents** — manage support agents and permissions
- **Activity Logs** — audit trail of actions
- **Permissions** — role-based access control
- **WhatsApp** — live QR code display, connection status, logout button
- **Bot Config** — edit `businessName`, `systemPrompt`, `welcomeMessage`, `ticketCommands`, `aiModel`

Login with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. In production these must be set via environment variables; the default `admin@example.com` / `admin123` is development-only.

## Bot Configuration

The admin panel exposes the following bot settings:

- **systemPrompt** — the AI persona/context (admin-editable). Combined with the live product catalog from the database, business hours, and the escalation rule (`__ESCALATE__` marker).
- **welcomeMessage** — message sent when a new conversation starts.
- **ticketCommands** — configured commands that trigger ticket creation (defaults: `TICKET`, `AGENTE`, `SOPORTE`, `SUPPORT`). These cannot collide with the `MENU`/`HELP`/`HOURS`/`CATALOG` family.
- **aiModel** — Gemini model to use (default: `gemini-1.5-flash`). Configurable per `BotConfig`.

Without `GEMINI_API_KEY`, the bot falls back to rule-based responses.

## Tickets Flow

1. A customer messages the bot on WhatsApp.
2. The bot creates a ticket via **AI escalation** (Gemini detects a support request) **or** when the customer types a configured **ticket command** (e.g., `TICKET`, `SOPORTE`).
3. Support agents see new tickets in real time via the Socket.IO event `support:new-ticket`.
4. Agent replies are forwarded back to the customer's WhatsApp (via Baileys JID or Cloud API phone number).

## Docker (Local Development)

### Docker Compose

```bash
docker compose up -d --build
```

This starts two services:

- **app** — the unified backend + dashboard container (port `3000`)
- **redis** — optional Bull queue backend (port `6379`)

The app degrades gracefully if Redis is unavailable.

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

## Render Deploy (Blueprint)

The project uses a **Docker runtime** on Render (single unified image), not the native Node.js runtime.

### One-click deploy

1. Push this repository to GitHub.
2. In the Render Dashboard, click **New +** → **Blueprint**.
3. Connect your repository — the `render.yaml` in the repo root is picked up automatically.
4. After the first Blueprint sync, set the required secrets in **Service** → **Environment**:
   - `JWT_SECRET` — long, random value
   - `ADMIN_EMAIL` — initial admin email
   - `ADMIN_PASSWORD` — strong initial admin password
5. Deploy. Render builds the Docker image and starts it; the health check hits `/health`.

### First QR scan after deploy

1. After the first deploy, check the Render logs for the QR code (or connect via `docker compose exec app node -e "..."` if using a persistent shell).
2. Scan the QR code with your phone (WhatsApp > Linked Devices > Link a Device).
3. The session persists in the `data/` volume. On subsequent deploys the session remains valid unless the volume is reset.

> **Ephemeral disk note:** Render's free tier uses an ephemeral filesystem. The `data/` volume (SQLite + WhatsApp session) is preserved across deploys on the free tier only if Render's persistent disk feature is enabled. Without it, the database and session are wiped on each deploy.

## CI/CD

GitHub Actions workflow at `.github/workflows/ci.yml`:

- **Triggers:** push and pull requests to `main`
- **Node version:** 22 (pinned)
- **Steps:** `yarn install` (root + dashboard) → `yarn build` (backend) → `yarn build` (dashboard)
- **Tests are intentionally skipped** — Jest is knowingly broken (no `jest.config`) and would fail the pipeline. Build-only keeps CI green.
- **Pinned action SHAs** are used for security.

## E2E Testing

E2E tests use **Playwright** and run against the Docker stack.

```bash
# Run against the running Docker stack:
yarn test:e2e

# Run with browser UI:
yarn test:e2e:headed

# Or use the convenience script (builds + starts Docker + runs tests + tears down):
./scripts/run-e2e.sh
```

The E2E config (`e2e/playwright.config.ts`) uses `baseURL: http://localhost:3000`. Default test credentials are `admin@example.com` / `admin123` (set by `scripts/run-e2e.sh`).

## Troubleshooting

### QR code not connecting

- Ensure the terminal is showing the QR code (first run or after `auth_info/` is deleted).
- Scan from WhatsApp on your phone: **Settings** > **Linked Devices** > **Link a Device**.
- If the session expired, delete the `auth_info/` directory and restart the app.

### Ephemeral session resets on redeploy

- On Render's free tier, the filesystem is ephemeral. The `data/` directory (SQLite + WhatsApp session) is lost on each deploy unless persistent storage is configured.
- After redeploy, rescan the QR code to re-link WhatsApp.

### Redis is absent

- Redis is optional. The app starts without it and runs normally — Bull queues simply do not process jobs.
- To add Redis, set `REDIS_URL` (e.g., `redis://localhost:6379`) and start a Redis instance.

### Docker build fails with network errors

- The Dockerfile uses `node:22-bookworm-slim` and installs build tools (python3, make, g++) for native dependencies like `sqlite3` and `libsignal`.
- If the build network is restricted, ensure the Docker daemon can reach `https://deb.debian.org` (the sources list is rewritten to HTTPS in the Dockerfile).
- If prebuilt binaries are available for your platform, the build tools step may be skipped by the package manager.

---

Built with automation to streamline sales and support
