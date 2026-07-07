const https = require('https');

/**
 * Makes an HTTPS request to Facebook Graph API.
 * @param {string} method - HTTP method (GET, POST, etc.).
 * @param {string} path - API path (e.g. '/v22.0/PHONE_NUMBER_ID/messages').
 * @param {Object|null} data - Request body (for POST/PUT).
 * @param {string} accessToken - WhatsApp access token.
 * @returns {Promise<Object>} Parsed response body.
 */
const makeRequest = (method, path, data, accessToken) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    };

    const req = https.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject({ statusCode: res.statusCode, body: parsed, raw: responseBody });
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ raw: responseBody });
          } else {
            reject({ statusCode: res.statusCode, body: responseBody, raw: responseBody });
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
};

/**
 * Returns the list of API versions to try, starting with the configured one.
 * @returns {string[]} API version strings (e.g. ['v22.0', 'v21.0', ...]).
 */
const getApiVersions = () => {
  return process.env.API_VERSION
    ? [process.env.API_VERSION]
    : ['v22.0', 'v21.0', 'v20.0', 'v19.0', 'v18.0', 'v17.0', 'v16.0', 'v15.0', 'v14.0', 'v13.0', 'v12.0'];
};

/**
 * Tries to send a WhatsApp message using multiple API versions and endpoint formats.
 *
 * @param {string} phoneNumberId - WhatsApp Business Phone Number ID.
 * @param {string} to - Clean recipient phone number (digits only).
 * @param {Object} data - The full request payload body.
 * @param {string} actionLabel - Label for console logs (e.g. 'Sending Image').
 * @returns {Promise<Object>} API response.
 */
const trySendWithFallback = (phoneNumberId, to, data, actionLabel) => {
  return new Promise(async (resolve, reject) => {
    const apiVersions = getApiVersions();
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!accessToken) {
      reject(new Error('WHATSAPP_ACCESS_TOKEN not configured'));
      return;
    }

    console.log(`\n=== ${actionLabel} ===`);
    console.log(`To: ${to}`);
    console.log(`Phone Number ID: ${phoneNumberId}`);

    const tryRequest = async (versionIndex = 0) => {
      const apiVersion = apiVersions[versionIndex];

      const endpointFormats = [
        `/${apiVersion}/${phoneNumberId}/messages`,
        `/${apiVersion}/${phoneNumberId}`,
      ];

      console.log(`\nTrying API version: ${apiVersion}`);

      for (let formatIndex = 0; formatIndex < endpointFormats.length; formatIndex++) {
        const path = endpointFormats[formatIndex];
        console.log(`Trying endpoint format ${formatIndex + 1}: https://graph.facebook.com${path}`);

        try {
          const result = await makeRequest('POST', path, data, accessToken);
          console.log(`\n✓✓✓ SUCCESS! ${actionLabel} completed with ${apiVersion} using format ${formatIndex + 1} ✓✓✓`);
          console.log(`Response:`, JSON.stringify(result, null, 2));
          resolve(result);
          return;
        } catch (error) {
          const errorMsg = error.body?.error?.message || error.body?.error || error.message || error.raw || JSON.stringify(error);
          console.error(`✗ Failed with format ${formatIndex + 1} (HTTP ${error.statusCode || 'N/A'}):`, errorMsg);

          if (formatIndex === endpointFormats.length - 1 && versionIndex === apiVersions.length - 1) {
            const finalError = error.body?.error || { message: errorMsg };
            reject(new Error(`All endpoint formats and API versions failed. Last error: HTTP ${error.statusCode || 'N/A'}: ${JSON.stringify(finalError)}`));
            return;
          }

          if (formatIndex < endpointFormats.length - 1) {
            continue;
          } else if (versionIndex < apiVersions.length - 1) {
            console.log(`\nTrying next API version...`);
            await tryRequest(versionIndex + 1);
            return;
          }
        }
      }
    };

    await tryRequest(0);
  });
};

/**
 * Verify phone number ID by fetching its information.
 * @param {string} phoneNumberId - WhatsApp Business Phone Number ID.
 * @param {string} accessToken - WhatsApp access token.
 * @param {string} apiVersion - API version string.
 * @returns {Promise<boolean>} Whether the phone number ID is valid.
 */
const verifyPhoneNumberId = async (phoneNumberId, accessToken, apiVersion) => {
  try {
    const path = `/${apiVersion}/${phoneNumberId}?fields=verified_name,display_phone_number`;
    const result = await makeRequest('GET', path, null, accessToken);
    console.log(`✓ Phone Number ID verified:`, result);
    return true;
  } catch (error) {
    console.error(`✗ Phone Number ID verification failed:`, error.body || error);
    return false;
  }
};

/**
 * Sends a text message.
 * @param {string} phoneNumberId - WhatsApp Business Phone Number ID.
 * @param {string} to - Recipient phone number.
 * @param {string} message - Text message body.
 * @returns {Promise<Object>} API response.
 */
const sendMessage = (phoneNumberId, to, message) => {
  return new Promise(async (resolve, reject) => {
    const cleanTo = to.replace(/[^\d]/g, '');

    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'text',
      text: {
        preview_url: false,
        body: message,
      },
    };

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!accessToken) {
      reject(new Error('WHATSAPP_ACCESS_TOKEN not configured'));
      return;
    }

    console.log(`\n=== Sending Message ===`);
    console.log(`To: ${cleanTo}`);
    console.log(`Phone Number ID: ${phoneNumberId}`);
    console.log(`Message: ${message}`);
    console.log(`\n⚠️  IMPORTANT: If you get "Unknown path components" error:`);
    console.log(`   1. Verify your PHONE_NUMBER_ID is correct in .env file`);
    console.log(`   2. Check that your access token has permissions for this phone number`);
    console.log(`   3. Ensure the phone number is registered in your WhatsApp Business Account`);
    console.log(`   4. Get the correct Phone Number ID from: https://developers.facebook.com/apps/`);
    console.log(`      Go to: Your App > WhatsApp > API Setup > Phone number ID\n`);

    const apiVersions = getApiVersions();

    const trySendMessage = async (versionIndex = 0) => {
      const apiVersion = apiVersions[versionIndex];

      const endpointFormats = [
        `/${apiVersion}/${phoneNumberId}/messages`,
        `/${apiVersion}/${phoneNumberId}`,
      ];

      console.log(`\nTrying API version: ${apiVersion}`);

      for (let formatIndex = 0; formatIndex < endpointFormats.length; formatIndex++) {
        const path = endpointFormats[formatIndex];
        console.log(`Trying endpoint format ${formatIndex + 1}: https://graph.facebook.com${path}`);

        try {
          const result = await makeRequest('POST', path, data, accessToken);
          console.log(`\n✓✓✓ SUCCESS! Message sent with ${apiVersion} using format ${formatIndex + 1} ✓✓✓`);
          console.log(`Response:`, JSON.stringify(result, null, 2));
          resolve(result);
          return;
        } catch (error) {
          const errorMsg = error.body?.error?.message || error.body?.error || error.message || error.raw || JSON.stringify(error);
          console.error(`✗ Failed with format ${formatIndex + 1} (HTTP ${error.statusCode || 'N/A'}):`, errorMsg);

          if (formatIndex === endpointFormats.length - 1 && versionIndex === apiVersions.length - 1) {
            const finalError = error.body?.error || { message: errorMsg };
            reject(new Error(`All endpoint formats and API versions failed. Last error: HTTP ${error.statusCode || 'N/A'}: ${JSON.stringify(finalError)}`));
            return;
          }

          if (formatIndex < endpointFormats.length - 1) {
            continue;
          } else if (versionIndex < apiVersions.length - 1) {
            console.log(`\nTrying next API version...`);
            await trySendMessage(versionIndex + 1);
            return;
          }
        }
      }
    };

    await trySendMessage(0);
  });
};

/**
 * Sends a media message (image, document, audio, or video).
 *
 * @param {string} phoneNumberId - WhatsApp Business Phone Number ID.
 * @param {string} to - Recipient phone number.
 * @param {string} type - Media type: 'image', 'document', 'audio', or 'video'.
 * @param {string} mediaUrl - Public URL of the media file.
 * @param {string} [caption] - Optional caption (for image, document, video).
 * @returns {Promise<Object>} API response.
 */
const sendMedia = (phoneNumberId, to, type, mediaUrl, caption) => {
  const cleanTo = to.replace(/[^\d]/g, '');

  const data = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: type,
    [type]: {
      link: mediaUrl,
    },
  };

  // Caption is supported for image, document, and video (not audio)
  if (caption && type !== 'audio') {
    data[type].caption = caption;
  }

  return trySendWithFallback(phoneNumberId, cleanTo, data, `Sending ${type.charAt(0).toUpperCase() + type.slice(1)}`);
};

/**
 * Sends an interactive message (button reply or list).
 *
 * @param {string} phoneNumberId - WhatsApp Business Phone Number ID.
 * @param {string} to - Recipient phone number.
 * @param {string} type - Interactive type: 'button' or 'list'.
 * @param {Object} interactiveData - Interactive payload object (body, action, optional header/footer).
 * @returns {Promise<Object>} API response.
 */
const sendInteractive = (phoneNumberId, to, type, interactiveData) => {
  const cleanTo = to.replace(/[^\d]/g, '');

  const data = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'interactive',
    interactive: interactiveData,
  };

  return trySendWithFallback(phoneNumberId, cleanTo, data, `Sending interactive ${type}`);
};

/**
 * Sends a message template.
 *
 * @param {string} phoneNumberId - WhatsApp Business Phone Number ID.
 * @param {string} to - Recipient phone number.
 * @param {string} templateName - Name of the message template.
 * @param {string} languageCode - Language code (e.g. 'en_US', 'es_MX').
 * @param {Array} [components] - Optional array of template component objects.
 * @returns {Promise<Object>} API response.
 */
const sendTemplate = (phoneNumberId, to, templateName, languageCode, components) => {
  const cleanTo = to.replace(/[^\d]/g, '');

  const data = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
    },
  };

  if (components && components.length > 0) {
    data.template.components = components;
  }

  return trySendWithFallback(phoneNumberId, cleanTo, data, `Sending template "${templateName}"`);
};

/**
 * Get phone numbers associated with the WhatsApp Business Account.
 * @returns {Promise<Object>} Phone numbers data.
 */
const getPhoneNumbers = async () => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersions = ['v22.0', 'v21.0', 'v20.0', 'v19.0', 'v18.0'];

  if (!accessToken) {
    throw new Error('WHATSAPP_ACCESS_TOKEN not configured');
  }

  for (const apiVersion of apiVersions) {
    try {
      console.log(`Trying to get phone numbers with API version ${apiVersion}...`);

      const endpoints = [
        `/${apiVersion}/me?fields=id,name,phone_numbers{id,verified_name,display_phone_number}`,
        `/${apiVersion}/me/phone_numbers?fields=id,verified_name,display_phone_number`,
        `/${apiVersion}/me`,
      ];

      for (const endpoint of endpoints) {
        try {
          const result = await makeRequest('GET', endpoint, null, accessToken);
          console.log(`✓ Success with ${apiVersion} using endpoint: ${endpoint}`);
          return result;
        } catch (error) {
          console.log(`✗ Failed with endpoint ${endpoint}: ${error.body?.error?.message || error.message}`);
          continue;
        }
      }
    } catch (error) {
      console.log(`Failed with ${apiVersion}, trying next version...`);
      continue;
    }
  }

  throw new Error('Failed to get phone numbers with all API versions. Please check your access token permissions.');
};

module.exports = {
  sendMessage,
  sendMedia,
  sendInteractive,
  sendTemplate,
  getPhoneNumbers,
  verifyPhoneNumberId,
};
