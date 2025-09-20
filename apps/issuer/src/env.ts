import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ADMIN_USER: z.string().min(1),
  ADMIN_PASS: z.string().min(1),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  JWT_KID: z.string().min(1),
  REDIS_URL: z.string().url(),
  SQLITE_PATH: z.string().min(1),
  RATE_MAX: z.coerce.number().int().min(1).default(120),
  SLOW_DELAY_AFTER: z.coerce.number().int().min(1).default(20),
  SLOW_DELAY_MS: z.coerce.number().int().min(0).default(200),
  CORS_ORIGINS: z.string().default('*'),
  PRIVATE_KEY_PATH: z.string().optional(),
  PUBLIC_KEY_PATH: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const loadEnv = () => envSchema.parse(process.env);

const env = loadEnv();

export default env;
