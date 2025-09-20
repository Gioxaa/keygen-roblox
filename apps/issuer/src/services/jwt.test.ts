import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { JwtService } from './jwt.js';

const createKeys = () =>
  generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });

describe('JwtService', () => {
  it('signs and verifies a license token', () => {
    const { privateKey, publicKey } = createKeys();
    const service = new JwtService({
      privateKey,
      publicKey,
      issuer: 'test-issuer',
      audience: 'test-audience',
      keyId: 'test-key',
    });

    const result = service.signLicense({
      hwid: 'HWID-123',
      ttlSeconds: 3600,
      plan: 'pro',
    });

    expect(result.token).toBeTypeOf('string');
    expect(result.jti).toBeTypeOf('string');
    expect(result.exp).toBeGreaterThan(result.iat);

    const payload = service.verifyLicense(result.token);
    expect(payload.hwid).toBe('HWID-123');
    expect(payload.plan).toBe('pro');
    expect(payload.jti).toBe(result.jti);
  });

  it('throws when verifying with the wrong audience', () => {
    const { privateKey, publicKey } = createKeys();
    const service = new JwtService({
      privateKey,
      publicKey,
      issuer: 'test-issuer',
      audience: 'test-audience',
      keyId: 'test-key',
    });

    const { token } = service.signLicense({
      hwid: 'HWID-123',
      ttlSeconds: 3600,
      plan: null,
    });

    const verifier = new JwtService({
      privateKey: '',
      publicKey,
      issuer: 'test-issuer',
      audience: 'other-audience',
      keyId: 'test-key',
    });

    expect(() => verifier.verifyLicense(token)).toThrow();
  });
});
