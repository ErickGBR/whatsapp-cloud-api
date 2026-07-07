<div align="center">

# 🤖 WhatsApp Cloud API

### `Node.js · Express · Meta Graph API`

> *Production-ready integration with WhatsApp Cloud API for automated messaging, webhook handling, and chatbot capabilities.*

<br>

[![License](https://img.shields.io/badge/License-ISC-22d3ee?style=flat-square)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=nodedotjs&logoColor=white)](package.json)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white)](package.json)

</div>

---

## 📋 Description

REST API for integration with Meta's **WhatsApp Cloud API**. Enables programmatic sending and receiving of WhatsApp messages, with support for real-time webhooks, multimedia message handling, and message templates.

Built on Meta's cloud infrastructure, designed to scale from a personal chatbot to an enterprise customer service system.

---

## ✨ Features

- **Message sending** — Text, multimedia (images, documents), and message templates
- **Webhook receiver** — Receives incoming messages and status updates in real time
- **Automatic verification** — OOB (Out-of-Box) webhook verification handshake
- **Multi-version API** — Automatic fallback across Graph API versions (v12.0 → v22.0)
- **Number validation** — E.164 international format with sanitization
- **Debug logging** — Detailed incoming message logging to `debug.log`
- **Health check** — Server status monitoring endpoint

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- **Meta Developer** account (https://developers.facebook.com/)
- A **Meta App** with WhatsApp configured
- **Phone Number ID** and **Access Token** from the WhatsApp dashboard
- **ngrok** (optional, for testing webhooks locally)

### Installation

```bash
git clone https://github.com/ErickGBR/whatsapp-cloud-api.git
cd whatsapp-cloud-api
npm install
```

### Configuration

Copy the environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
WHATSAPP_ACCESS_TOKEN=EAAT...tu_token_aqui
PHONE_NUMBER_ID=123456789012345
VERIFY_TOKEN=tu_token_verificacion_seguro
PORT=3000
```

### Running

```bash
# Production
npm start

# Development (with hot-reload)
npm run dev
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Server health check |
| `GET` | `/api/webhook` | Webhook verification (WhatsApp handshake) |
| `POST` | `/api/webhook` | Receive incoming messages and updates |
| `POST` | `/api/send-message` | Send a text message |
| `GET` | `/api/phone-numbers` | Get numbers associated with the account |

### Example: Send message

```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "to": "521234567890",
    "message": "¡Hola desde la API! 🚀"
  }'
```

---

## 🏗️ Architecture

```
src/
├── index.js                    # Entry point — Express server
├── routes/
│   └── routes.js               # Route definitions
├── controller/
│   └── whatsapp.controller.js  # Handler logic
├── services/
│   └── whatsappService.js      # Graph API integration
└── shared/
    └── sampleModel.js          # Example models
```

---

## 🛠 Stack

| Layer | Technology |
|------|-----------|
| Runtime | Node.js 20+ |
| Framework | Express 5.x |
| API | Meta WhatsApp Cloud API (Graph API) |
| Logging | Debug file + console |

---

## 📜 License

ISC — Erick Burgos
