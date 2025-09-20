import { Router } from 'express';
import { z } from 'zod';

import type { RevocationService } from '../services/revoke.js';

const paramsSchema = z.object({
  jti: z.string().min(1).max(256),
});

export const createStatusRouter = (revocationService: RevocationService) => {
  const router = Router();

  router.get('/status/:jti', async (req, res) => {
    const parseResult = paramsSchema.safeParse(req.params);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid jti' });
    }

    const { jti } = parseResult.data;
    const revoked = await revocationService.isRevoked(jti);

    return res.json({ revoked });
  });

  return router;
};
