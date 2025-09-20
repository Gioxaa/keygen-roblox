import { generateKeyPairSync } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Env } from './env.js';
import { createServer, type ServerContext } from './server.js';
import { AuditService } from './services/audit.js';
import { JwtService } from './services/jwt.js';
import { InMemoryRevocationService } from './services/revoke.js';

process.env.NODE_ENV = 'test';

describe('Issuer API', () => {
  const adminUser = 'admin';
  const adminPass = 'secret';
  const authHeader = `Basic ${Buffer.from(`${adminUser}:${adminPass}`).toString('base64')}`;

  let ctx: ServerContext;
  let audit: AuditService;

  const setupServer = async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    });

    const env: Env = {
      PORT: 0,
      NODE_ENV: 'test',
      ADMIN_USER: adminUser,
      ADMIN_PASS: adminPass,
      JWT_ISSUER: 'test-issuer',
      JWT_AUDIENCE: 'test-audience',
      JWT_KID: 'test-key',
      REDIS_URL: 'redis://localhost:6379',
      SQLITE_PATH: ':memory:',
      RATE_MAX: 1000,
      SLOW_DELAY_AFTER: 1000,
      SLOW_DELAY_MS: 1,
      CORS_ORIGINS: '*',
      PRIVATE_KEY_PATH: undefined,
      PUBLIC_KEY_PATH: undefined,
    };

    audit = new AuditService(':memory:');
    const revocations = new InMemoryRevocationService();
    const jwtService = new JwtService({
      privateKey,
      publicKey,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      keyId: env.JWT_KID,
    });

    ctx = await createServer({ env, auditService: audit, revocationService: revocations, jwtService });
  };

  beforeAll(async () => {
    await setupServer();
  });

  afterAll(async () => {
    await ctx.close();
    await ctx.revocationService.disconnect();
    audit.close();
  });

  it('issues and verifies a license token', async () => {
    const issueResponse = await request(ctx.app)
      .post('/issue')
      .set('Authorization', authHeader)
      .send({ hwid: 'HWID-1', ttlSeconds: 3600, plan: 'pro', note: 'demo' })
      .expect(201);

    expect(issueResponse.body.token).toBeTruthy();
    expect(issueResponse.body.jti).toBeTruthy();

    const verifyResponse = await request(ctx.app)
      .post('/verify')
      .send({ token: issueResponse.body.token, hwid: 'HWID-1' })
      .expect(200);

    expect(verifyResponse.body.ok).toBe(true);
    expect(verifyResponse.body.plan).toBe('pro');
  });

  it('detects HWID mismatch and revocation status', async () => {
    const issueResponse = await request(ctx.app)
      .post('/issue')
      .set('Authorization', authHeader)
      .send({ hwid: 'HWID-2', ttlSeconds: 3600 })
      .expect(201);

    const token = issueResponse.body.token;
    const jti = issueResponse.body.jti;

    await request(ctx.app)
      .post('/verify')
      .send({ token, hwid: 'DIFFERENT' })
      .expect(401, { ok: false, reason: 'hwid_mismatch' });

    await request(ctx.app)
      .post('/revoke')
      .set('Authorization', authHeader)
      .send({ jti })
      .expect(200, { ok: true });

    await request(ctx.app)
      .post('/verify')
      .send({ token, hwid: 'HWID-2' })
      .expect(401, { ok: false, reason: 'revoked' });

    const statusResponse = await request(ctx.app).get(`/status/${jti}`).expect(200);
    expect(statusResponse.body).toEqual({ revoked: true });
  });

  it('lists issued licenses', async () => {
    const issueResponse = await request(ctx.app)
      .post('/issue')
      .set('Authorization', authHeader)
      .send({ hwid: 'HWID-3', ttlSeconds: 3600, plan: 'basic' })
      .expect(201);

    await request(ctx.app)
      .get('/licenses')
      .set('Authorization', authHeader)
      .expect(200)
      .then((res) => {
        expect(Array.isArray(res.body.items)).toBe(true);
        expect(res.body.items.length).toBeGreaterThan(0);
        const match = res.body.items.find((item: any) => item.jti === issueResponse.body.jti);
        expect(match).toBeTruthy();
      });
  });
});
