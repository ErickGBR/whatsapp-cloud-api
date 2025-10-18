# 🤖 WhatsApp Cloud API Integration

## Descripción

Este repositorio contiene el código y la documentación necesarios para la integración con la **WhatsApp Cloud API**. Este proyecto facilita el **envío y recepción programática de mensajes** en la plataforma de WhatsApp, utilizando la infraestructura segura y escalable en la nube de Meta. Está diseñado para ayudar a empresas y desarrolladores a construir aplicaciones robustas para soporte al cliente, notificaciones y conversaciones interactivas con usuarios a nivel global.

La integración busca ser una solución robusta, escalable y fácil de implementar, gestionando la autenticación, la configuración de webhooks, las plantillas de mensajes y la lógica de manejo de mensajes.

---

## ✨ Características

* **Autenticación Segura:** Utiliza **Tokens de Acceso** para llamadas seguras a la API.
* **Envío de Mensajes:** Soporta el envío de varios tipos de mensajes, incluyendo **texto, multimedia (imágenes, documentos) y plantillas de mensajes**.
* **Receptor de Webhooks:** Incluye una implementación de servidor (ej: **Node.js/Express**, **Python/Flask**) para recibir **actualizaciones de mensajes en tiempo real** y **notificaciones de estado** (entregado, leído, fallido).
* **Gestión de Plantillas:** Muestra cómo usar **plantillas de mensajes pre-aprobadas** para iniciar conversaciones fuera de la ventana de servicio al cliente de 24 horas.
* **Arquitectura Escalable:** Diseñado para ser desplegado en plataformas en la nube (ej: Heroku, AWS, Google Cloud) y manejar un alto volumen de tráfico.

---

## 🚀 Cómo Empezar

Sigue estos pasos para poner en marcha tu proyecto de WhatsApp Cloud API.

### Pre-requisitos

Necesitarás lo siguiente para empezar:

1.  Una **Cuenta de Desarrollador de Meta**.
2.  Una **Aplicación de Meta** configurada para la plataforma WhatsApp.
3.  Un **ID de Número de Teléfono** y un **ID de Cuenta de Negocio** desde el Panel de tu Aplicación de Meta.
4.  Un **Token de Acceso Permanente** (para entornos de producción).
5.  Un entorno de desarrollo local (ej: **Node.js**, **Python**, **PHP** instalado).
6.  Un servicio de tunneling como **ngrok** para exponer tu endpoint de webhook local a internet (para pruebas).

### Instalación y Configuración

1.  **Clonar el repositorio:**
    ```bash
    git clone [TU_URL_DEL_REPOSITORIO]
    cd [TU_NOMBRE_DEL_REPOSITORIO]
    ```

2.  **Instalar dependencias:**
    *(Ejemplo para un proyecto Node.js)*
    ```bash
    npm install
    ```
    *(Ejemplo para un proyecto Python)*
    ```bash
    pip install -r requirements.txt
    ```

3.  **Configurar Variables de Entorno:**
    Crea un archivo llamado `.env` en el directorio raíz y añade tus credenciales:
    ```
    # Reemplaza con tus valores reales
    ACCESS_TOKEN="TU_WHATSAPP_CLOUD_API_ACCESS_TOKEN"
    PHONE_NUMBER_ID="TU_WHATSAPP_PHONE_NUMBER_ID"
    VERIFY_TOKEN="TU_WEBHOOK_VERIFY_TOKEN"
    PORT=3000
    ```

4.  **Iniciar el Servidor:**
    ```bash
    npm start # o python app.py
    ```

5.  **Configurar Webhooks (para recibir mensajes):**
    * Inicia tu servicio de tunneling (ej: `ngrok http 3000`).
    * Toma la **URL HTTPS** proporcionada por ngrok.
    * En el Panel de la Aplicación de Meta → WhatsApp → Configuración, establece la **URL de Retorno del Webhook** a tu URL de ngrok más la ruta del webhook (ej: `https://[TU_ID_NGROK].ngrok-free.app/webhook`).
    * Establece el **Token de Verificación** al que definiste en tu archivo `.env`.

---

## 📄 Endpoints de la API

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/send-message` | Envía un mensaje de texto o plantilla a un destinatario específico. |
| `POST` | `/webhook` | Recibe y procesa los mensajes entrantes y las actualizaciones de estado de WhatsApp. |
| `GET` | `/webhook` | Usado por WhatsApp para el handshake inicial de verificación del webhook. |

---

## 🛠 Stack Tecnológico

* **Lenguaje:** [Ej: Node.js / Python / PHP]
* **Framework:** [Ej: Express.js / Flask / Laravel]
* **API:** WhatsApp Cloud API (Meta)

---

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! No dudes en abrir un *issue* o enviar un *pull request*.

---

## 📜 Licencia

Este proyecto está bajo la **Licencia MIT** - consulta el archivo `LICENSE` para más detalles.
