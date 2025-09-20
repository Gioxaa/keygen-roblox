import { describe, expect, it } from 'vitest';

import { InMemoryRevocationService } from './revoke.js';
import { unixSeconds } from '../utils.js';

describe('InMemoryRevocationService', () => {
  it('tracks revoked JTIs', async () => {
    const service = new InMemoryRevocationService();
    const jti = 'test-jti';

    expect(await service.isRevoked(jti)).toBe(false);
    await service.revoke(jti, unixSeconds() + 60);
    expect(await service.isRevoked(jti)).toBe(true);
  });

  it('expires revocations when past exp', async () => {
    const service = new InMemoryRevocationService();
    const jti = 'expired-jti';

    await service.revoke(jti, unixSeconds() - 1);
    expect(await service.isRevoked(jti)).toBe(false);
  });
});
