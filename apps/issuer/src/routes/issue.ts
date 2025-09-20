import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';

import type { AuditService } from '../services/audit.js';
import type { JwtService } from '../services/jwt.js';
import { getClientIp } from '../utils.js';

const issueSchema = z.object({
  hwid: z.string().min(1).max(256),
  ttlSeconds: z.coerce.number().int().min(60).max(5_184_000),
  plan: z.string().min(1).max(64).optional(),
  note: z.string().min(1).max(512).optional(),
});

export interface IssueRouteDeps {
  jwtService: JwtService;
  auditService: AuditService;
  adminAuth: RequestHandler;
}

export const createIssueRouter = ({ jwtService, auditService, adminAuth }: IssueRouteDeps) => {
  const router = Router();
  router.post('/issue', adminAuth, async (req, res) => {
    const parsed = issueSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const { hwid, ttlSeconds, plan, note } = parsed.data;

    try {
      const issueResult = jwtService.signLicense({
        hwid,
        ttlSeconds,
        plan: plan ?? null,
        note: note ?? null,
      });
      const issuerIp = getClientIp(req);

      auditService.logIssue({
        jti: issueResult.jti,
        hwid,
        plan: plan ?? null,
        note: note ?? null,
        issuedAt: issueResult.iat,
        exp: issueResult.exp,
        issuerIp,
      });

      return res.status(201).json({
        token: issueResult.token,
        jti: issueResult.jti,
        exp: issueResult.exp,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to issue license' });
    }
  });

  return router;
};
