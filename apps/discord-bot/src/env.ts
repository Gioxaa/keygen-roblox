import { z } from 'zod';

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().optional().nullable(),
  ISSUER_BASE_URL: z.string().url(),
  ISSUER_ADMIN_USER: z.string().min(1),
  ISSUER_ADMIN_PASS: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export const loadEnv = () => envSchema.parse(process.env);

const env = loadEnv();

export default env;
