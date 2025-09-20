import type { Redis } from 'ioredis';

import { unixSeconds } from '../utils.js';

export interface RevocationService {
  revoke(jti: string, exp?: number): Promise<void>;
  isRevoked(jti: string): Promise<boolean>;
  disconnect(): Promise<void>;
}

const DEFAULT_PREFIX = 'revoked:';

export class RedisRevocationService implements RevocationService {
  private readonly redis: Redis;
  private readonly prefix: string;

  constructor(redis: Redis, prefix = DEFAULT_PREFIX) {
    this.redis = redis;
    this.prefix = prefix;
  }

  async revoke(jti: string, exp?: number): Promise<void> {
    const key = ${this.prefix};
    const now = unixSeconds();
    const ttlSeconds = exp ? Math.max(exp - now, 0) : null;

    if (ttlSeconds && ttlSeconds > 0) {
      await this.redis.set(key, '1', 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, '1');
    }
  }

  async isRevoked(jti: string): Promise<boolean> {
    const key = ${this.prefix};
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

export class InMemoryRevocationService implements RevocationService {
  private readonly store = new Map<string, number | null>();

  async revoke(jti: string, exp?: number): Promise<void> {
    this.store.set(jti, exp ?? null);
  }

  async isRevoked(jti: string): Promise<boolean> {
    const exp = this.store.get(jti);
    if (typeof exp === 'number' && exp <= unixSeconds()) {
      this.store.delete(jti);
      return false;
    }

    return this.store.has(jti);
  }

  async disconnect(): Promise<void> {
    this.store.clear();
  }
}
