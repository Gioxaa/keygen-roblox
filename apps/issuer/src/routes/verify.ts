import { Router } from 'express';
import { z } from 'zod';

import type { RevocationService } from '../services/revoke.js';
import type { JwtService } from '../services/jwt.js';

const verifySchema = z.object({
  token: z.string().min(10),
  hwid: z.string().min(1).max(256),
});

export interface VerifyRouteDeps {
  jwtService: JwtService;
  revocationService: RevocationService;
}

export const createVerifyRouter = ({ jwtService, revocationService }: VerifyRouteDeps) => {
  const router = Router();

  router.post('/verify', async (req, res) => {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, reason: 'invalid_or_expired', details: parsed.error.flatten() });
    }

    const { token, hwid } = parsed.data;

    try {
      const payload = jwtService.verifyLicense(token);

      if (payload.hwid !== hwid) {
        return res.status(401).json({ ok: false, reason: 'hwid_mismatch' });
      }

      const revoked = await revocationService.isRevoked(payload.jti);
      if (revoked) {
        return res.status(401).json({ ok: false, reason: 'revoked' });
      }

      return res.json({ ok: true, plan: payload.plan, exp: payload.exp });
    } catch (error) {
      return res.status(401).json({ ok: false, reason: 'invalid_or_expired' });
    }
  });

  return router;
};
