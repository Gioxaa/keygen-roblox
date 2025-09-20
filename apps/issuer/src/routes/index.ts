import { Router } from 'express';

import { createIssueRouter } from './issue.js';
import { createVerifyRouter } from './verify.js';
import { createRevokeRouter } from './revoke.js';
import { createStatusRouter } from './status.js';
import { healthRouter } from './health.js';
import { createLicensesRouter } from './licenses.js';
import type { JwtService } from '../services/jwt.js';
import type { RevocationService } from '../services/revoke.js';
import type { AuditService } from '../services/audit.js';
import type { RequestHandler } from 'express';

export interface RoutesDependencies {
  jwtService: JwtService;
  revocationService: RevocationService;
  auditService: AuditService;
  adminAuth: RequestHandler;
}

export const createRoutes = ({ jwtService, revocationService, auditService, adminAuth }: RoutesDependencies) => {
  const router = Router();

  router.use(healthRouter);
  router.use(createIssueRouter({ jwtService, auditService, adminAuth }));
  router.use(createVerifyRouter({ jwtService, revocationService }));
  router.use(createRevokeRouter({ revocationService, auditService, adminAuth }));
  router.use(createStatusRouter(revocationService));
  router.use(createLicensesRouter({ auditService, adminAuth }));

  return router;
};
