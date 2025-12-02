const express = require('express');
const router = express.Router();
const WhatsAppController = require('../controller/whatsapp.controller');

// Webhook routes for receiving messages
router.get('/webhook', WhatsAppController.verifyToken);
router.post('/webhook', WhatsAppController.RecieverMessage);

// Route for sending messages manually
router.post('/send-message', WhatsAppController.sendMessage);

// Route for debugging - get available phone numbers
router.get('/phone-numbers', WhatsAppController.getPhoneNumbers);

module.exports = router;