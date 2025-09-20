import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IssuerClient } from './issuerClient.js';

const buildResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('IssuerClient', () => {
  const client = new IssuerClient('https://issuer.test', 'user', 'pass');
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('issues a license', async () => {
    fetchSpy.mockResolvedValueOnce(
      buildResponse(200, { token: 'token', jti: '123', exp: 100 }),
    );

    const result = await client.issueLicense({ hwid: 'HW', ttlSeconds: 60, plan: 'basic' });

    expect(result.token).toBe('token');
    expect(fetchSpy).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ method: 'POST' }));
  });

  it('throws on error responses', async () => {
    fetchSpy.mockResolvedValueOnce(buildResponse(401, { error: 'Unauthorized' }));

    await expect(client.getStatus('bad')).rejects.toThrow('Unauthorized');
  });
});
