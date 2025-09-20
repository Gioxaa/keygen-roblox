import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/healthz', (req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    now: new Date().toISOString(),
  });
});
