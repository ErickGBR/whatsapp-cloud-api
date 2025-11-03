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
  const VERIFY_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

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

    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {

        const message_object = body.entry[0].changes[0].value.messages[0];
        const phone_number_id =
          body.entry[0].id;
        const from = body.entry[0].changes[0].value.messages[0].from;
        const msg_body =
          body.entry[0].changes[0].value.messages[0].text.body;

        console.log('Phone Number ID: ' + phone_number_id);
        console.log('From: ' + from);
        console.log('Message Body: ' + msg_body);

        myConsole.log(message_object);

        whatsappService.sendMessage(
          phone_number_id,
          from,
          'This is a response from your WhatsApp bot.'
        );
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Error processing incoming message:', error);
    res.sendStatus(500);
  }

};

module.exports = {
  verifyToken,
  RecieverMessage,
};