import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import IORedis, { Redis as RedisClient } from 'ioredis';
import morgan from 'morgan';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import env, { loadEnv } from './env.js';
import { createAdminAuth } from './middleware/adminAuth.js';
import { createRateLimiters } from './middleware/rateLimit.js';
import { createRoutes } from './routes/index.js';
import { AuditService } from './services/audit.js';
import { JwtService } from './services/jwt.js';
import { RedisRevocationService } from './services/revoke.js';
import type { RevocationService } from './services/revoke.js';
import { loadKeyFile, parseCorsOrigins } from './utils.js';

const moduleDir = dirname(fileURLToPath(import.meta.url));

export interface CreateServerOptions {
  env?: ReturnType<typeof loadEnv>;
  auditService?: AuditService;
  revocationService?: RevocationService;
  jwtService?: JwtService;
  redisClient?: RedisClient;
}

export interface ServerContext {
  app: express.Express;
  auditService: AuditService;
  revocationService: RevocationService;
  jwtService: JwtService;
  redisClient?: RedisClient;
  close: () => Promise<void>;
}

const safeLoadKey = async (maybePath: string | undefined, fallbackRelative: string) => {
  const path = maybePath ?? join(moduleDir, 'keys', fallbackRelative);
  try {
    return await loadKeyFile(path);
  } catch (error) {
    throw new Error(`Failed to load key at ${path}. Ensure the file exists and permissions are correct.`);
  }
};

export const createServer = async (options: CreateServerOptions = {}): Promise<ServerContext> => {
  const runtimeEnv = options.env ?? env;

  const privateKey = options.jwtService
    ? null
    : await safeLoadKey(runtimeEnv.PRIVATE_KEY_PATH, 'private.pem');
  const publicKey = options.jwtService
    ? null
    : await safeLoadKey(runtimeEnv.PUBLIC_KEY_PATH, 'public.pem');

  const jwtService =
    options.jwtService ??
    new JwtService({
      privateKey: privateKey ?? '',
      publicKey: publicKey ?? '',
      issuer: runtimeEnv.JWT_ISSUER,
      audience: runtimeEnv.JWT_AUDIENCE,
      keyId: runtimeEnv.JWT_KID,
    });

  let redisClient = options.redisClient;
  if (!redisClient && !options.revocationService) {
    redisClient = new IORedis(runtimeEnv.REDIS_URL);
  }

  if (!redisClient && !options.revocationService) {
    throw new Error('Redis client could not be initialised');
  }

  const revocationService =
    options.revocationService ?? new RedisRevocationService(redisClient!);
  const auditService = options.auditService ?? new AuditService(runtimeEnv.SQLITE_PATH);

  const adminAuth = createAdminAuth(runtimeEnv.ADMIN_USER, runtimeEnv.ADMIN_PASS);

  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(compression());

  const corsOrigin = parseCorsOrigins(runtimeEnv.CORS_ORIGINS);
  app.use(
    cors({
      origin: corsOrigin,
      credentials: corsOrigin !== '*',
    }),
  );

  app.use(express.json({ limit: '128kb' }));
  app.use(express.urlencoded({ extended: false }));

  const rateLimiters = createRateLimiters({
    max: runtimeEnv.RATE_MAX,
    delayAfter: runtimeEnv.SLOW_DELAY_AFTER,
    delayMs: runtimeEnv.SLOW_DELAY_MS,
  });

  rateLimiters.forEach((middleware) => app.use(middleware));

  app.use(
    morgan('combined', {
      skip: () => runtimeEnv.NODE_ENV === 'test',
    }),
  );

  app.use(
    createRoutes({
      jwtService,
      revocationService,
      auditService,
      adminAuth,
    }),
  );

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (runtimeEnv.NODE_ENV !== 'test') {
      console.error(err);
    }
    res.status(500).json({ error: 'Internal Server Error' });
  });

  const createdRevocationService = !options.revocationService;
  const createdAuditService = !options.auditService;
  const createdRedisClient = !options.redisClient && createdRevocationService;

  const close = async () => {
    if (createdRevocationService) {
      await revocationService.disconnect();
    }

    if (createdAuditService) {
      auditService.close();
    }

    if (createdRedisClient && redisClient) {
      redisClient.disconnect();
    }
  };

  return { app, auditService, revocationService, jwtService, redisClient, close };
};




