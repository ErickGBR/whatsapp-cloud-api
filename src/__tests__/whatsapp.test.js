const request = require('supertest');
const app = require('../index');

describe('WhatsApp Cloud API', () => {
  // ── Health Check ──────────────────────────────────────────
  describe('GET /', () => {
    it('should return health check status OK', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'OK');
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/WhatsApp Cloud API Server/i);
    });
  });

  // ── Webhook Verification (GET) ────────────────────────────
  describe('GET /api/webhook', () => {
    it('should verify webhook with correct token', async () => {
      const res = await request(app)
        .get('/api/webhook')
        .query({ 'hub.verify_token': process.env.VERIFY_TOKEN || 'your-verify-token-here' })
        .query({ 'hub.challenge': '123456789' });
      expect(res.statusCode).toBe(200);
      expect(res.text).toBe('123456789');
    });

    it('should reject webhook with wrong token', async () => {
      const res = await request(app)
        .get('/api/webhook')
        .query({ 'hub.verify_token': 'wrong-token' })
        .query({ 'hub.challenge': '123456789' });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── Webhook Receiver (POST) ───────────────────────────────
  describe('POST /api/webhook', () => {
    it('should respond with 200 for valid whatsapp webhook event', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { phone_number_id: '456' },
                  messages: [
                    {
                      from: '521234567890',
                      id: 'msg1',
                      type: 'text',
                      text: { body: 'Hello' },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };
      const res = await request(app).post('/api/webhook').send(payload);
      expect(res.statusCode).toBe(200);
    });

    it('should respond with 404 for non-whatsapp object', async () => {
      const payload = { object: 'something_else' };
      const res = await request(app).post('/api/webhook').send(payload);
      expect(res.statusCode).toBe(404);
    });

    it('should respond with 200 for status update webhook', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { phone_number_id: '456' },
                  statuses: [
                    {
                      id: 'status1',
                      status: 'read',
                      recipient_id: '521234567890',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };
      const res = await request(app).post('/api/webhook').send(payload);
      expect(res.statusCode).toBe(200);
    });
  });

  // ── Send Message ──────────────────────────────────────────
  describe('POST /api/send-message', () => {
    it('should return 400 when "to" is missing', async () => {
      const res = await request(app)
        .post('/api/send-message')
        .send({ message: 'Hello' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when "message" is missing', async () => {
      const res = await request(app)
        .post('/api/send-message')
        .send({ to: '521234567890' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for invalid phone number format', async () => {
      const res = await request(app)
        .post('/api/send-message')
        .send({ to: 'abc', message: 'Hello' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // ── Media Endpoints ───────────────────────────────────────
  describe('POST /api/send-image', () => {
    it('should return 400 when mediaUrl is missing', async () => {
      const res = await request(app)
        .post('/api/send-image')
        .send({ to: '521234567890' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/send-document', () => {
    it('should return 400 when mediaUrl is missing', async () => {
      const res = await request(app)
        .post('/api/send-document')
        .send({ to: '521234567890' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/send-audio', () => {
    it('should return 400 when mediaUrl is missing', async () => {
      const res = await request(app)
        .post('/api/send-audio')
        .send({ to: '521234567890' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/send-video', () => {
    it('should return 400 when mediaUrl is missing', async () => {
      const res = await request(app)
        .post('/api/send-video')
        .send({ to: '521234567890' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // ── Interactive Endpoints ─────────────────────────────────
  describe('POST /api/send-button', () => {
    it('should return 400 when bodyText is missing', async () => {
      const res = await request(app)
        .post('/api/send-button')
        .send({ to: '521234567890' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when buttons are missing', async () => {
      const res = await request(app)
        .post('/api/send-button')
        .send({ to: '521234567890', bodyText: 'Choose:', buttons: [] });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when more than 3 buttons', async () => {
      const res = await request(app)
        .post('/api/send-button')
        .send({
          to: '521234567890',
          bodyText: 'Choose:',
          buttons: [
            { id: '1', title: 'A' },
            { id: '2', title: 'B' },
            { id: '3', title: 'C' },
            { id: '4', title: 'D' },
          ],
        });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/send-list', () => {
    it('should return 400 when bodyText is missing', async () => {
      const res = await request(app)
        .post('/api/send-list')
        .send({ to: '521234567890' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when sections are missing', async () => {
      const res = await request(app)
        .post('/api/send-list')
        .send({ to: '521234567890', bodyText: 'Select:', sections: [] });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // ── Template Endpoints ────────────────────────────────────
  describe('POST /api/send-template', () => {
    it('should return 400 when templateName is missing', async () => {
      const res = await request(app)
        .post('/api/send-template')
        .send({ to: '521234567890', languageCode: 'en_US' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when languageCode is missing', async () => {
      const res = await request(app)
        .post('/api/send-template')
        .send({ to: '521234567890', templateName: 'hello_world' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // ── 404 for unknown routes ────────────────────────────────
  describe('Unknown routes', () => {
    it('should return 404 for undefined route', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.statusCode).toBe(404);
    });
  });
});
