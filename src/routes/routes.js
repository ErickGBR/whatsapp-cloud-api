
const express = require('express');
const router = express.Router();
const WhatsAppController = require('../controller/whatsapp.controller');

router.get('/', WhatsAppController.verifyToken);
router.post('/webhook', WhatsAppController.RecieverMessage);

module.exports = router;