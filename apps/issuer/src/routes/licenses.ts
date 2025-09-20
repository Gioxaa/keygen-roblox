import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';

import type { AuditService } from '../services/audit.js';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  revoked: z
    .enum(['true', 'false', 'all'])
    .optional()
    .default('all'),
});

export interface LicensesRouteDeps {
  auditService: AuditService;
  adminAuth: RequestHandler;
}

export const createLicensesRouter = ({ auditService, adminAuth }: LicensesRouteDeps) => {
  const router = Router();

  router.get('/licenses', adminAuth, (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query', details: parsed.error.flatten() });
    }

    const { limit, revoked } = parsed.data;

    const include =
      revoked === 'all' ? 'all' : revoked === 'true' ? 'revoked' : 'active';

    const licenses = auditService.listLicenses({ limit, include });

    return res.json({
      items: licenses.map((license) => ({
        jti: license.jti,
        hwid: license.hwid,
        plan: license.plan,
        note: license.note,
        issuedAt: license.issuedAt,
        exp: license.exp,
        issuerIp: license.issuerIp,
        revoked: Boolean(license.revokedAt),
        revokedAt: license.revokedAt,
        revokedBy: license.revokedBy,
      })),
    });
  });

  return router;
};
