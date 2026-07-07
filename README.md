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

## 📋 Descripción

API REST para integración con **WhatsApp Cloud API** de Meta. Permite enviar y recibir mensajes de WhatsApp programáticamente, con soporte para webhooks en tiempo real, manejo de mensajes multimedia, y templates.

Construido sobre la infraestructura cloud de Meta, diseñado para escalar desde un chatbot personal hasta un sistema de atención al cliente empresarial.

---

## ✨ Features

- **Envío de mensajes** — Texto, multimedia (imágenes, documentos), y message templates
- **Webhook receptor** — Recibe mensajes entrantes y actualizaciones de estado en tiempo real
- **Verificación automática** — Handshake de verificación webhook OOB (Out-of-Box)
- **Multi-versión API** — Fallback automático entre versiones de Graph API (v12.0 → v22.0)
- **Validación de números** — Formato internacional E.164 con sanitización
- **Debug logging** — Registro detallado de mensajes entrantes en `debug.log`
- **Health check** — Endpoint de monitoreo de estado del servidor

---

## 🚀 Quick Start

### Prerrequisitos

- Node.js 20+
- Cuenta de **Meta Developer** (https://developers.facebook.com/)
- Una **Meta App** con WhatsApp configurado
- **Phone Number ID** y **Access Token** del dashboard de WhatsApp
- **ngrok** (opcional, para probar webhooks localmente)

### Instalación

```bash
git clone https://github.com/ErickGBR/whatsapp-cloud-api.git
cd whatsapp-cloud-api
npm install
```

### Configuración

Copia el archivo de entorno y completa tus credenciales:

```bash
cp .env.example .env
```

Edita `.env` con tus valores reales:

```env
WHATSAPP_ACCESS_TOKEN=EAAT...tu_token_aqui
PHONE_NUMBER_ID=123456789012345
VERIFY_TOKEN=tu_token_verificacion_seguro
PORT=3000
```

### Ejecución

```bash
# Producción
npm start

# Desarrollo (con hot-reload)
npm run dev
```

---

## 📡 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/` | Health check del servidor |
| `GET` | `/api/webhook` | Verificación webhook (WhatsApp handshake) |
| `POST` | `/api/webhook` | Recibir mensajes y actualizaciones entrantes |
| `POST` | `/api/send-message` | Enviar un mensaje de texto |
| `GET` | `/api/phone-numbers` | Obtener números asociados a la cuenta |

### Ejemplo: Enviar mensaje

```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "to": "521234567890",
    "message": "¡Hola desde la API! 🚀"
  }'
```

---

## 🏗️ Arquitectura

```
src/
├── index.js                    # Entry point — Express server
├── routes/
│   └── routes.js               # Definición de rutas
├── controller/
│   └── whatsapp.controller.js  # Lógica de handlers
├── services/
│   └── whatsappService.js      # Integración con Graph API
└── shared/
    └── sampleModel.js          # Modelos de ejemplo
```

---

## 🛠 Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 20+ |
| Framework | Express 5.x |
| API | Meta WhatsApp Cloud API (Graph API) |
| Logging | Debug file + console |

---

## 📜 Licencia

ISC — Erick Burgos
