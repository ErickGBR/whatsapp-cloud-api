const https = require('https');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Makes an HTTPS request to Facebook Graph API
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
 * Verify phone number ID by fetching its information
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

const sendMessage = (phoneNumberId, to, message) => {
  return new Promise(async (resolve, reject) => {
    // Clean phone number - remove + and any non-numeric characters
    const cleanTo = to.replace(/[^\d]/g, '');
    
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'text',
      text: { 
        preview_url: false,
        body: message 
      },
    };

    // Try different API versions if one fails (most recent first)
    const apiVersions = process.env.API_VERSION 
      ? [process.env.API_VERSION] 
      : ['v22.0', 'v21.0', 'v20.0', 'v19.0', 'v18.0', 'v17.0', 'v16.0', 'v15.0', 'v14.0', 'v13.0', 'v12.0'];
    
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

    const trySendMessage = async (versionIndex = 0) => {
      const apiVersion = apiVersions[versionIndex];
      
      // Try different endpoint formats
      const endpointFormats = [
        `/${apiVersion}/${phoneNumberId}/messages`,  // Standard format
        `/${apiVersion}/${phoneNumberId}`,  // Alternative format
      ];
      
      console.log(`\nTrying API version: ${apiVersion}`);

      for (let formatIndex = 0; formatIndex < endpointFormats.length; formatIndex++) {
        const path = endpointFormats[formatIndex];
        console.log(`Trying endpoint format ${formatIndex + 1}: https://graph.facebook.com${path}`);

        try {
          // Try to send the message
          const result = await makeRequest('POST', path, data, accessToken);
          console.log(`\n✓✓✓ SUCCESS! Message sent with ${apiVersion} using format ${formatIndex + 1} ✓✓✓`);
          console.log(`Response:`, JSON.stringify(result, null, 2));
          resolve(result);
          return; // Success, exit the function
        } catch (error) {
          const errorMsg = error.body?.error?.message || error.body?.error || error.message || error.raw || JSON.stringify(error);
          console.error(`✗ Failed with format ${formatIndex + 1} (HTTP ${error.statusCode || 'N/A'}):`, errorMsg);
          
          // If this is the last format and last version, reject
          if (formatIndex === endpointFormats.length - 1 && versionIndex === apiVersions.length - 1) {
            const finalError = error.body?.error || { message: errorMsg };
            reject(new Error(`All endpoint formats and API versions failed. Last error: HTTP ${error.statusCode || 'N/A'}: ${JSON.stringify(finalError)}`));
            return;
          }
          
          // Continue to next format or version
          if (formatIndex < endpointFormats.length - 1) {
            continue; // Try next format
          } else if (versionIndex < apiVersions.length - 1) {
            console.log(`\nTrying next API version...`);
            await trySendMessage(versionIndex + 1);
            return;
          }
        }
      }
    };

    // Start trying with the first version
    await trySendMessage(0);
  });
};

/**
 * Get phone numbers associated with the WhatsApp Business Account
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
      
      // Try different endpoint formats
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
  getPhoneNumbers,
  verifyPhoneNumberId,
};

