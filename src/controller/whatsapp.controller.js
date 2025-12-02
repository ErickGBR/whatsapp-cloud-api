const dotenv = require('dotenv');
const fs = require('fs');
const myConsole = new console.Console(fs.createWriteStream('./debug.log'));
const whatsappService = require('../services/whatsappService');

dotenv.config();
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
 * RecieverMessage
 * 
 */
const RecieverMessage = (req, res) => {
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
 * Handles sending messages manually via POST request.
 * 
 * Expected body format:
 * {
 *   "to": "1234567890",  // Phone number in international format (e.g., "521234567890" for Mexico)
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
          message: 'Hello, this is a test message'
        }
      });
    }

    if (!message) {
      return res.status(400).json({ 
        error: 'Missing required field: message',
        example: {
          to: '1234567890',
          message: 'Hello, this is a test message'
        }
      });
    }

    // Validate phone number format (should be numeric, 10-15 digits)
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(to.replace(/\D/g, ''))) {
      return res.status(400).json({ 
        error: 'Invalid phone number format',
        message: 'Phone number must be 10-15 digits in international format (e.g., "521234567890")',
        received: to
      });
    }

    if (!phoneNumberId) {
      return res.status(500).json({ 
        error: 'PHONE_NUMBER_ID not configured in environment variables',
        instructions: 'Add PHONE_NUMBER_ID to your .env file. Get it from: https://developers.facebook.com/apps/ > Your App > WhatsApp > API Setup'
      });
    }

    // Clean phone number (remove any non-numeric characters)
    const cleanPhoneNumber = to.replace(/\D/g, '');

    console.log(`Sending message to ${cleanPhoneNumber} via Phone Number ID: ${phoneNumberId}`);
    
    const result = await whatsappService.sendMessage(phoneNumberId, cleanPhoneNumber, message);
    
    res.status(200).json({ 
      success: true, 
      message: 'Message sent successfully',
      data: result
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
          step5: 'Restart the server after updating .env'
        },
        currentPhoneNumberId: phoneNumberId
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to send message', 
      details: error.message 
    });
  }
};

/**
 * Get available phone numbers for debugging
 */
const getPhoneNumbers = async (req, res) => {
  try {
    const phoneNumbers = await whatsappService.getPhoneNumbers();
    res.status(200).json({ 
      success: true, 
      phoneNumbers: phoneNumbers.data || phoneNumbers.phone_numbers || phoneNumbers
    });
  } catch (error) {
    console.error('Error getting phone numbers:', error);
    res.status(500).json({ 
      error: 'Failed to get phone numbers', 
      details: error.message 
    });
  }
};

module.exports = {
  verifyToken,
  RecieverMessage,
  sendMessage,
  getPhoneNumbers,
};