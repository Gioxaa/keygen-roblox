import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import type { RequestHandler } from 'express';

export interface RateLimitConfig {
  max: number;
  delayAfter: number;
  delayMs: number;
}

export const createRateLimiters = (config: RateLimitConfig): RequestHandler[] => {
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: config.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: 'Too many requests, please try again later.',
  });

  const slowdown = slowDown({
    windowMs: 60_000,
    delayAfter: config.delayAfter,
    delayMs: () => config.delayMs,
    validate: {
      delayMs: false,
    },
  });

  return [limiter, slowdown];
};
