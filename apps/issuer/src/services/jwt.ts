import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

import type { IssueRequestBody, IssueResult, LicensePayload } from '../types.js';
import { unixSeconds } from '../utils.js';

export interface JwtServiceOptions {
  privateKey: string;
  publicKey: string;
  issuer: string;
  audience: string;
  keyId: string;
}

export class JwtService {
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly keyId: string;

  constructor(options: JwtServiceOptions) {
    this.privateKey = options.privateKey;
    this.publicKey = options.publicKey;
    this.issuer = options.issuer;
    this.audience = options.audience;
    this.keyId = options.keyId;
  }

  signLicense(input: IssueRequestBody): IssueResult {
    const { hwid, ttlSeconds, plan } = input;
    if (!this.privateKey) {
      throw new Error('Private key not loaded; cannot issue licenses');
    }

    const issuedAt = unixSeconds();
    const jti = randomUUID();
    const token = jwt.sign(
      {
        sub: 'license',
        hwid,
        plan: plan ?? null,
      },
      this.privateKey,
      {
        algorithm: 'RS256',
        keyid: this.keyId,
        issuer: this.issuer,
        audience: this.audience,
        expiresIn: ttlSeconds,
        jwtid: jti,
        subject: 'license',
        notBefore: 0,
      },
    );

    const exp = issuedAt + ttlSeconds;

    return { token, jti, iat: issuedAt, exp };
  }

  verifyLicense(token: string): LicensePayload {
    if (!this.publicKey) {
      throw new Error('Public key not loaded; cannot verify licenses');
    }

    const payload = jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
      issuer: this.issuer,
      audience: this.audience,
    });

    if (typeof payload === 'string') {
      throw new Error('Unexpected token payload format');
    }

    if (payload.sub !== 'license') {
      throw new Error('Unexpected token subject');
    }

    const licensePayload: LicensePayload = {
      sub: 'license',
      hwid: payload.hwid,
      plan: payload.plan ?? null,
      jti: payload.jti ?? payload.jwtid,
      iat: payload.iat!,
      exp: payload.exp!,
    };

    if (!licensePayload.jti) {
      throw new Error('Token missing jti');
    }

    if (typeof licensePayload.hwid !== 'string') {
      throw new Error('Token missing hwid');
    }

    return licensePayload;
  }
}
