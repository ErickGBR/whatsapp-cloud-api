const express = require('express');
const router = express.Router();
const WhatsAppController = require('../controller/whatsapp.controller');

// Webhook routes for receiving messages
router.get('/webhook', WhatsAppController.verifyToken);
router.post('/webhook', WhatsAppController.receiverMessage);

// Route for sending messages manually
router.post('/send-message', WhatsAppController.sendMessage);

// Media message routes
router.post('/send-image', WhatsAppController.sendImage);
router.post('/send-document', WhatsAppController.sendDocument);
router.post('/send-audio', WhatsAppController.sendAudio);
router.post('/send-video', WhatsAppController.sendVideo);

// Interactive message routes
router.post('/send-button', WhatsAppController.sendButton);
router.post('/send-list', WhatsAppController.sendList);

// Message template routes
router.post('/send-template', WhatsAppController.sendTemplate);

// Route for debugging — get available phone numbers
router.get('/phone-numbers', WhatsAppController.getPhoneNumbers);

module.exports = router;
