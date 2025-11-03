
const https = require('https');

const sendMessage = (phoneNumberId, to, message) => {
  const data = JSON.stringify({
    messaging_product: 'whatsapp',
    to: to,
    text: { body: message },
  });

  const options = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: `/${phoneNumberId}/messages`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    },
  };

  const req = https.request(options, (res) => {
    let responseBody = '';

    res.on('data', (chunk) => {
      responseBody += chunk;
    });

    res.on('end', () => {
      console.log('Response:', responseBody);
    });
  });

  req.on('error', (error) => {
    console.error('Error sending message:', error);
  });

  req.write(data);
  req.end();
};

module.exports = {
  sendMessage,
};

