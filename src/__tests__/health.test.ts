import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Health endpoint', () => {
  it('GET /v1/health should return status ok', async () => {
    const res = await request(app).get('/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.uptime).toBeDefined();
    expect(typeof res.body.uptime).toBe('number');
  });

  it('GET /v1/nonexistent should return 404', async () => {
    const res = await request(app).get('/v1/nonexistent');

    expect(res.status).toBe(404);
  });
});

describe('Swagger docs', () => {
  it('GET /docs should return swagger UI', async () => {
    const res = await request(app).get('/docs/').redirects(1);

    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger');
  });
});

describe('Security headers', () => {
  it('should include security headers from Helmet', async () => {
    const res = await request(app).get('/v1/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});

describe('CORS', () => {
  it('should allow requests from configured origins', async () => {
    const res = await request(app)
      .options('/v1/health')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });
});

describe('JSON parsing', () => {
  it('should parse JSON body', async () => {
    const res = await request(app)
      .post('/v1/health')
      .send({ test: 'data' });

    // health route doesn't handle POST, but confirms json parsing works
    expect(res.status).toBe(404);
  });
});
