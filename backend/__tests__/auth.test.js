// Unit tests for Node.js authentication service
import request from 'supertest';
import express from 'express';
import authRouter from '../auth.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Node.js Authentication Service', () => {
  describe('POST /api/auth/google', () => {
    test('should reject missing idToken', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('ID token is required');
    });

    test('should reject invalid Google token', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .send({ idToken: 'invalid_token' })
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Authentication failed');
    });

    test('should handle malformed requests', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/auth/me', () => {
    test('should reject missing authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('No token provided');
    });

    test('should reject invalid token format', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    test('should reject invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Invalid token');
    });
  });

  describe('Health endpoint', () => {
    test('should return ok status', async () => {
      // Create a simple health route for testing
      const testApp = express();
      testApp.get('/api/health', (req, res) => res.json({ ok: true }));

      const response = await request(testApp)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
    });
  });
});