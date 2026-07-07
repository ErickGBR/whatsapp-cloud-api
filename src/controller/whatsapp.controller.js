const fs = require('fs');
const myConsole = new console.Console(fs.createWriteStream('./debug.log'));
const whatsappService = require('../services/whatsappService');

/**
 * Handles the verification of the webhook token for WhatsApp Cloud API.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const verifyToken = (req, res) => {
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;

  if (token === VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    res.status(200).send(challenge);
  } else {
    console.log('WEBHOOK_NOT_VERIFIED');
    res.sendStatus(403);
  }
};

/**
 * Handles incoming messages from the WhatsApp Cloud API webhook.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const receiverMessage = (req, res) => {
  const body = req.body;

  try {
    // Verify this is a WhatsApp webhook event
    if (body.object === 'whatsapp_business_account') {
      // Handle incoming messages
      if (
        body.entry &&
        body.entry[0]?.changes &&
        body.entry[0].changes[0]?.value?.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const change = body.entry[0].changes[0];
        const message_object = change.value.messages[0];
        const phone_number_id = change.value.metadata?.phone_number_id;
        const from = message_object.from;
        const message_id = message_object.id;
        const message_type = message_object.type;

        // Extract message body based on type
        let msg_body = '';
        if (message_type === 'text') {
          msg_body = message_object.text?.body || '';
        } else if (message_type === 'image') {
          msg_body = `[Image] ${message_object.image?.caption || ''}`;
        } else if (message_type === 'audio') {
          msg_body = '[Audio message]';
        } else if (message_type === 'video') {
          msg_body = `[Video] ${message_object.video?.caption || ''}`;
        } else if (message_type === 'document') {
          msg_body = `[Document] ${message_object.document?.filename || ''}`;
        } else {
          msg_body = `[${message_type}]`;
        }

        console.log('=== Incoming Message ===');
        console.log('Phone Number ID:', phone_number_id);
        console.log('From:', from);
        console.log('Message ID:', message_id);
        console.log('Message Type:', message_type);
        console.log('Message Body:', msg_body);

        myConsole.log('Full message object:', JSON.stringify(message_object, null, 2));

        // Send response message
        if (phone_number_id && from) {
          whatsappService.sendMessage(
            phone_number_id,
            from,
            `You sent: ${msg_body}\n\nThis is an automated response from your WhatsApp bot.`
          ).catch(error => {
            console.error('Error sending response message:', error);
          });
        }
      }

      // Handle status updates (message delivery status, read receipts, etc.)
      if (
        body.entry &&
        body.entry[0]?.changes &&
        body.entry[0].changes[0]?.value?.statuses &&
        body.entry[0].changes[0].value.statuses[0]
      ) {
        const status = body.entry[0].changes[0].value.statuses[0];
        console.log('=== Status Update ===');
        console.log('Message ID:', status.id);
        console.log('Status:', status.status);
        console.log('Recipient:', status.recipient_id);

        myConsole.log('Status update:', JSON.stringify(status, null, 2));
      }

      // Always respond with 200 to acknowledge receipt
      res.sendStatus(200);
    } else {
      // Not a WhatsApp webhook event
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Error processing incoming message:', error);
    myConsole.error('Error:', error);
    res.sendStatus(500);
  }
};

/**
 * Validates common message request fields.
 * @param {Object} body - The request body.
 * @param {Object} res - The response object.
 * @returns {string|null} Cleaned phone number or null if validation failed.
 */
const validateCommonFields = (body, res) => {
  const { to } = body;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;

  if (!to) {
    res.status(400).json({ error: 'Missing required field: to' });
    return null;
  }

  const phoneRegex = /^\d{10,15}$/;
  if (!phoneRegex.test(to.replace(/\D/g, ''))) {
    res.status(400).json({
      error: 'Invalid phone number format',
      message: 'Phone number must be 10-15 digits in international format',
      received: to,
    });
    return null;
  }

  if (!phoneNumberId) {
    res.status(500).json({
      error: 'PHONE_NUMBER_ID not configured in environment variables',
      instructions: 'Add PHONE_NUMBER_ID to your .env file.',
    });
    return null;
  }

  return to.replace(/\D/g, '');
};

/**
 * Sends a text message via POST /api/send-message.
 *
 * Expected body:
 * {
 *   "to": "1234567890",
 *   "message": "Your message text here"
 * }
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const sendMessage = async (req, res) => {
  const phoneNumberId = process.env.PHONE_NUMBER_ID;

  try {
    const { to, message } = req.body;

    // Validate required fields
    if (!to) {
      return res.status(400).json({
        error: 'Missing required field: to',
        example: {
          to: '1234567890',
          message: 'Hello, this is a test message',
        },
      });
    }

    if (!message) {
      return res.status(400).json({
        error: 'Missing required field: message',
        example: {
          to: '1234567890',
          message: 'Hello, this is a test message',
        },
      });
    }

    // Validate phone number format (should be numeric, 10-15 digits)
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(to.replace(/\D/g, ''))) {
      return res.status(400).json({
        error: 'Invalid phone number format',
        message: 'Phone number must be 10-15 digits in international format (e.g., "521234567890")',
        received: to,
      });
    }

    if (!phoneNumberId) {
      return res.status(500).json({
        error: 'PHONE_NUMBER_ID not configured in environment variables',
        instructions: 'Add PHONE_NUMBER_ID to your .env file. Get it from: https://developers.facebook.com/apps/ > Your App > WhatsApp > API Setup',
      });
    }

    // Clean phone number (remove any non-numeric characters)
    const cleanPhoneNumber = to.replace(/\D/g, '');

    console.log(`Sending message to ${cleanPhoneNumber} via Phone Number ID: ${phoneNumberId}`);

    const result = await whatsappService.sendMessage(phoneNumberId, cleanPhoneNumber, message);

    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error sending message:', error);

    // Check if it's the "Unknown path components" error
    if (error.message && error.message.includes('Unknown path components')) {
      return res.status(400).json({
        error: 'Invalid Phone Number ID',
        details: error.message,
        solution: {
          step1: 'The PHONE_NUMBER_ID in your .env file is not valid',
          step2: 'Get the correct Phone Number ID from: https://developers.facebook.com/apps/',
          step3: 'Navigate to: Your App > WhatsApp > API Setup > Phone number ID',
          step4: 'Copy the Phone number ID and update your .env file',
          step5: 'Restart the server after updating .env',
        },
        currentPhoneNumberId: phoneNumberId,
      });
    }

    res.status(500).json({
      error: 'Failed to send message',
      details: error.message,
    });
  }
};

/**
 * Sends an image message via POST /api/send-image.
 *
 * Expected body:
 * {
 *   "to": "1234567890",
 *   "mediaUrl": "https://example.com/image.jpg",
 *   "caption": "Optional caption"
 * }
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const sendImage = async (req, res) => {
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const cleanTo = validateCommonFields(req.body, res);
  if (!cleanTo) return;

  const { mediaUrl, caption } = req.body;

  if (!mediaUrl) {
    return res.status(400).json({
      error: 'Missing required field: mediaUrl',
      example: { to: '1234567890', mediaUrl: 'https://example.com/image.jpg', caption: 'Optional caption' },
    });
  }

  if (!phoneNumberId) {
    return res.status(500).json({ error: 'PHONE_NUMBER_ID not configured in environment variables' });
  }

  try {
    const result = await whatsappService.sendMedia(phoneNumberId, cleanTo, 'image', mediaUrl, caption);
    res.status(200).json({ success: true, message: 'Image sent successfully', data: result });
  } catch (error) {
    console.error('Error sending image:', error);
    res.status(500).json({ error: 'Failed to send image', details: error.message });
  }
};

/**
 * Sends a document message via POST /api/send-document.
 *
 * Expected body:
 * {
 *   "to": "1234567890",
 *   "mediaUrl": "https://example.com/doc.pdf",
 *   "caption": "Optional caption"
 * }
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const sendDocument = async (req, res) => {
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const cleanTo = validateCommonFields(req.body, res);
  if (!cleanTo) return;

  const { mediaUrl, caption } = req.body;

  if (!mediaUrl) {
    return res.status(400).json({
      error: 'Missing required field: mediaUrl',
      example: { to: '1234567890', mediaUrl: 'https://example.com/doc.pdf', caption: 'Optional caption' },
    });
  }

  if (!phoneNumberId) {
    return res.status(500).json({ error: 'PHONE_NUMBER_ID not configured in environment variables' });
  }

  try {
    const result = await whatsappService.sendMedia(phoneNumberId, cleanTo, 'document', mediaUrl, caption);
    res.status(200).json({ success: true, message: 'Document sent successfully', data: result });
  } catch (error) {
    console.error('Error sending document:', error);
    res.status(500).json({ error: 'Failed to send document', details: error.message });
  }
};

/**
 * Sends an audio message via POST /api/send-audio.
 *
 * Expected body:
 * {
 *   "to": "1234567890",
 *   "mediaUrl": "https://example.com/audio.mp3"
 * }
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const sendAudio = async (req, res) => {
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const cleanTo = validateCommonFields(req.body, res);
  if (!cleanTo) return;

  const { mediaUrl } = req.body;

  if (!mediaUrl) {
    return res.status(400).json({
      error: 'Missing required field: mediaUrl',
      example: { to: '1234567890', mediaUrl: 'https://example.com/audio.mp3' },
    });
  }

  if (!phoneNumberId) {
    return res.status(500).json({ error: 'PHONE_NUMBER_ID not configured in environment variables' });
  }

  try {
    const result = await whatsappService.sendMedia(phoneNumberId, cleanTo, 'audio', mediaUrl);
    res.status(200).json({ success: true, message: 'Audio sent successfully', data: result });
  } catch (error) {
    console.error('Error sending audio:', error);
    res.status(500).json({ error: 'Failed to send audio', details: error.message });
  }
};

/**
 * Sends a video message via POST /api/send-video.
 *
 * Expected body:
 * {
 *   "to": "1234567890",
 *   "mediaUrl": "https://example.com/video.mp4",
 *   "caption": "Optional caption"
 * }
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const sendVideo = async (req, res) => {
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const cleanTo = validateCommonFields(req.body, res);
  if (!cleanTo) return;

  const { mediaUrl, caption } = req.body;

  if (!mediaUrl) {
    return res.status(400).json({
      error: 'Missing required field: mediaUrl',
      example: { to: '1234567890', mediaUrl: 'https://example.com/video.mp4', caption: 'Optional caption' },
    });
  }

  if (!phoneNumberId) {
    return res.status(500).json({ error: 'PHONE_NUMBER_ID not configured in environment variables' });
  }

  try {
    const result = await whatsappService.sendMedia(phoneNumberId, cleanTo, 'video', mediaUrl, caption);
    res.status(200).json({ success: true, message: 'Video sent successfully', data: result });
  } catch (error) {
    console.error('Error sending video:', error);
    res.status(500).json({ error: 'Failed to send video', details: error.message });
  }
};

/**
 * Sends an interactive button message via POST /api/send-button.
 *
 * Expected body:
 * {
 *   "to": "1234567890",
 *   "headerText": "Optional header",
 *   "bodyText": "Choose an option:",
 *   "footerText": "Optional footer",
 *   "buttons": [
 *     { "id": "btn1", "title": "Option 1" },
 *     { "id": "btn2", "title": "Option 2" }
 *   ]
 * }
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const sendButton = async (req, res) => {
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const cleanTo = validateCommonFields(req.body, res);
  if (!cleanTo) return;

  const { bodyText, buttons, headerText, footerText } = req.body;

  if (!bodyText) {
    return res.status(400).json({
      error: 'Missing required field: bodyText',
      example: {
        to: '1234567890',
        bodyText: 'Choose an option:',
        buttons: [{ id: 'btn1', title: 'Option 1' }, { id: 'btn2', title: 'Option 2' }],
      },
    });
  }

  if (!buttons || !Array.isArray(buttons) || buttons.length === 0) {
    return res.status(400).json({
      error: 'Missing or invalid field: buttons',
      message: 'buttons must be a non-empty array of { id, title } objects',
    });
  }

  if (buttons.length > 3) {
    return res.status(400).json({
      error: 'Maximum 3 buttons allowed',
    });
  }

  if (!phoneNumberId) {
    return res.status(500).json({ error: 'PHONE_NUMBER_ID not configured in environment variables' });
  }

  // Build the interactive data payload
  const interactiveData = {
    type: 'button',
    body: { text: bodyText },
    action: {
      buttons: buttons.map((btn) => ({
        type: 'reply',
        reply: { id: btn.id, title: btn.title },
      })),
    },
  };

  if (headerText) {
    interactiveData.header = { type: 'text', text: headerText };
  }

  if (footerText) {
    interactiveData.footer = { text: footerText };
  }

  try {
    const result = await whatsappService.sendInteractive(phoneNumberId, cleanTo, 'button', interactiveData);
    res.status(200).json({ success: true, message: 'Button message sent successfully', data: result });
  } catch (error) {
    console.error('Error sending button message:', error);
    res.status(500).json({ error: 'Failed to send button message', details: error.message });
  }
};

/**
 * Sends an interactive list message via POST /api/send-list.
 *
 * Expected body:
 * {
 *   "to": "1234567890",
 *   "headerText": "Optional header",
 *   "bodyText": "Please select an option:",
 *   "footerText": "Optional footer",
 *   "buttonText": "View Options",
 *   "sections": [
 *     {
 *       "title": "Section 1",
 *       "rows": [
 *         { "id": "opt1", "title": "Option 1", "description": "Description" }
 *       ]
 *     }
 *   ]
 * }
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const sendList = async (req, res) => {
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const cleanTo = validateCommonFields(req.body, res);
  if (!cleanTo) return;

  const { bodyText, sections, buttonText, headerText, footerText } = req.body;

  if (!bodyText) {
    return res.status(400).json({
      error: 'Missing required field: bodyText',
      example: {
        to: '1234567890',
        bodyText: 'Please select an option:',
        sections: [{ title: 'Section 1', rows: [{ id: 'opt1', title: 'Option 1' }] }],
      },
    });
  }

  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    return res.status(400).json({
      error: 'Missing or invalid field: sections',
      message: 'sections must be a non-empty array',
    });
  }

  if (!phoneNumberId) {
    return res.status(500).json({ error: 'PHONE_NUMBER_ID not configured in environment variables' });
  }

  // Build the interactive data payload
  const interactiveData = {
    type: 'list',
    body: { text: bodyText },
    action: {
      button: buttonText || 'View Options',
      sections: sections,
    },
  };

  if (headerText) {
    interactiveData.header = { type: 'text', text: headerText };
  }

  if (footerText) {
    interactiveData.footer = { text: footerText };
  }

  try {
    const result = await whatsappService.sendInteractive(phoneNumberId, cleanTo, 'list', interactiveData);
    res.status(200).json({ success: true, message: 'List message sent successfully', data: result });
  } catch (error) {
    console.error('Error sending list message:', error);
    res.status(500).json({ error: 'Failed to send list message', details: error.message });
  }
};

/**
 * Sends a message template via POST /api/send-template.
 *
 * Expected body:
 * {
 *   "to": "1234567890",
 *   "templateName": "hello_world",
 *   "languageCode": "en_US",
 *   "components": [
 *     {
 *       "type": "body",
 *       "parameters": [
 *         { "type": "text", "text": "Parameter value" }
 *       ]
 *     }
 *   ]
 * }
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const sendTemplate = async (req, res) => {
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const cleanTo = validateCommonFields(req.body, res);
  if (!cleanTo) return;

  const { templateName, languageCode, components } = req.body;

  if (!templateName) {
    return res.status(400).json({
      error: 'Missing required field: templateName',
      example: {
        to: '1234567890',
        templateName: 'hello_world',
        languageCode: 'en_US',
        components: [{ type: 'body', parameters: [{ type: 'text', text: 'Parameter value' }] }],
      },
    });
  }

  if (!languageCode) {
    return res.status(400).json({
      error: 'Missing required field: languageCode',
      example: 'en_US, es_MX, pt_BR',
    });
  }

  if (!phoneNumberId) {
    return res.status(500).json({ error: 'PHONE_NUMBER_ID not configured in environment variables' });
  }

  try {
    const result = await whatsappService.sendTemplate(
      phoneNumberId,
      cleanTo,
      templateName,
      languageCode,
      components || []
    );
    res.status(200).json({ success: true, message: 'Template sent successfully', data: result });
  } catch (error) {
    console.error('Error sending template:', error);
    res.status(500).json({ error: 'Failed to send template', details: error.message });
  }
};

/**
 * Get available phone numbers for debugging.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const getPhoneNumbers = async (req, res) => {
  try {
    const phoneNumbers = await whatsappService.getPhoneNumbers();
    res.status(200).json({
      success: true,
      phoneNumbers: phoneNumbers.data || phoneNumbers.phone_numbers || phoneNumbers,
    });
  } catch (error) {
    console.error('Error getting phone numbers:', error);
    res.status(500).json({
      error: 'Failed to get phone numbers',
      details: error.message,
    });
  }
};

module.exports = {
  verifyToken,
  receiverMessage,
  sendMessage,
  sendImage,
  sendDocument,
  sendAudio,
  sendVideo,
  sendButton,
  sendList,
  sendTemplate,
  getPhoneNumbers,
};
