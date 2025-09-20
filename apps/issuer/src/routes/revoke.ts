import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';

import type { AuditService } from '../services/audit.js';
import type { RevocationService } from '../services/revoke.js';
import { parseBasicAuthHeader } from '../middleware/adminAuth.js';
import { unixSeconds } from '../utils.js';

const revokeSchema = z.object({
  jti: z.string().min(1).max(256),
});

export interface RevokeRouteDeps {
  revocationService: RevocationService;
  auditService: AuditService;
  adminAuth: RequestHandler;
}

export const createRevokeRouter = ({ revocationService, auditService, adminAuth }: RevokeRouteDeps) => {
  const router = Router();

  router.post('/revoke', adminAuth, async (req, res) => {
    const parsed = revokeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const { jti } = parsed.data;

    try {
      const license = auditService.getLicense(jti);
      await revocationService.revoke(jti, license?.exp);

      const adminCredentials = parseBasicAuthHeader(req.headers.authorization);
      auditService.logRevoke({
        jti,
        revokedAt: unixSeconds(),
        admin: adminCredentials?.username ?? 'unknown',
      });

      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to revoke license' });
    }
  });

  return router;
};
