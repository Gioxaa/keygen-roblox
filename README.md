# HWID Licenser

Production-ready hardware-bound licensing system with issuance, verification, revocation, audit logging, and Discord-based administration. The stack combines a Node.js/Express v5 issuer API, Redis-backed revocation, SQLite audit logs, and a Discord bot with slash commands for day-to-day management.

## Features

- RS256-signed JWT licenses with HWID binding, TTL enforcement, issuer/audience claims, and key identifiers
- Private REST API for issuance/revocation, public verification/status endpoints, and health check
- Redis-backed revocation store with per-license TTL to automatically expire entries
- SQLite audit log capturing issuance and revocation metadata (hwid, plan, notes, admin, IP)
- Discord bot slash commands (`/issue`, `/revoke`, `/status`, `/list`) talking to the issuer over HTTPS with basic auth
- Strict request validation (zod), security middleware (helmet, cors, compression), and traffic controls (rate limit + slow down)
- Comprehensive test coverage with Vitest + Supertest, plus smoke HTTP examples
- Dockerised deployment (issuer, Redis, optional Discord bot) and helper script to manage RSA key material

## Repository Layout

```
hwid-licenser/
├─ apps/
│  ├─ issuer/              # REST API
│  └─ discord-bot/         # Discord management bot
├─ docker/                 # Dockerfiles and docker-compose
├─ scripts/                # Utility scripts (key generation, smoke tests)
├─ package.json            # Workspace root
├─ pnpm-workspace.yaml
└─ README.md
```

## Prerequisites

- Node.js 20+ and PNPM (Corepack enabled)
- Redis 6+
- OpenSSL (for key generation)
- Discord application & bot token (for the bot)
- Native build tooling for `better-sqlite3` (Visual Studio Build Tools on Windows, Xcode Command Line Tools on macOS, build-essential on Linux)

> On Windows the native module requires the "Desktop development with C++" workload. Without it `pnpm install` will fail while compiling `better-sqlite3`.

## Generate RSA Keys

Use the helper script to create a 4096-bit keypair.

```bash
./scripts/gen-keys.sh            # writes to apps/issuer/src/keys/
./scripts/gen-keys.sh ./keys     # custom output directory (useful for Docker volumes)
```

Note the suggested `JWT_KID` the script prints and place the resulting `public.pem` with your client binaries. Keep `private.pem` secret.

## Environment Configuration

Copy the provided examples and adjust values:

```bash
cp apps/issuer/.env.example apps/issuer/.env
cp apps/discord-bot/.env.example apps/discord-bot/.env
```

Key issuer settings:

- `ADMIN_USER` / `ADMIN_PASS`: Basic auth credentials for administrative endpoints
- `JWT_ISSUER` / `JWT_AUDIENCE`: Stable identifiers baked into every token
- `REDIS_URL`: Redis connection string (revocation store)
- `SQLITE_PATH`: Location for the audit database (createable if missing)
- `PRIVATE_KEY_PATH` / `PUBLIC_KEY_PATH`: Absolute paths to RSA keys (defaults to `src/keys/*.pem`)
- Rate limit knobs: `RATE_MAX`, `SLOW_DELAY_AFTER`, `SLOW_DELAY_MS`

Discord bot settings:

- `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, optional `DISCORD_GUILD_ID`
- `ISSUER_BASE_URL`: External URL for the issuer (e.g. `https://licenser.example.com`)
- `ISSUER_ADMIN_USER`, `ISSUER_ADMIN_PASS`: Same as issuer admin credentials

## Install Dependencies

```bash
corepack enable
corepack pnpm install            # requires native toolchain for better-sqlite3
```

If you only need the lockfile without running native builds, use `PNPM_IGNORE_SCRIPTS=1 corepack pnpm install --lockfile-only`, then re-run the full install once the toolchain is available.

## Development Workflow

Issuer API:

```bash
cd apps/issuer
pnpm dev                         # tsx watch mode
pnpm test                        # Vitest + Supertest suite
pnpm lint                        # ESLint
```

Discord bot:

```bash
cd apps/discord-bot
pnpm dev                         # tsx watch mode (registers commands on start)
pnpm test
```

Workspace-wide commands:

```bash
pnpm -r test
pnpm -r lint
pnpm -r build
```

## Docker Deployment

The Compose file brings up Redis, the issuer, and (optionally) the bot.

```bash
mkdir -p keys
./scripts/gen-keys.sh ./keys
cp apps/issuer/.env.example .env            # adjust values or set env vars directly
cd docker
docker-compose up --build                   # issuer on :4000, redis on :6379
```

By default the bot service is behind the `bot` profile; enable with `docker-compose --profile bot up`. Provide the Discord secrets via environment variables (see compose file for required names).

Volumes:

- `../keys:/keys:ro` – mount your RSA pair (used by issuer container)
- `issuer_data` – persists `audit.db`

## Discord Slash Commands

- `/issue hwid:<string> ttl:<seconds> plan:<basic|pro?> note:<text?>`
- `/revoke jti:<string>`
- `/status jti:<string>`
- `/list count:<1..50>`

Tokens are returned via ephemeral replies so only the issuer sees the value. The bot uses HTTP Basic auth to reach the issuer API.

## Offline Verification Example

Distribute `public.pem` to clients and verify tokens offline:

```ts
import { readFileSync } from 'node:fs';
import jwt from 'jsonwebtoken';

const publicKey = readFileSync('./public.pem', 'utf8');
const token = process.argv[2];
const expectedHwid = process.argv[3];

try {
  const payload = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'your-issuer',
    audience: 'your-app',
  }) as jwt.JwtPayload;

  if (payload.sub !== 'license' || payload.hwid !== expectedHwid) {
    throw new Error('HWID mismatch');
  }

  console.log('License OK', { plan: payload.plan, exp: payload.exp });
} catch (error) {
  console.error('License invalid', error);
  process.exit(1);
}
```

To augment with online revocation checks, call `POST /verify` or `GET /status/:jti` on the issuer.

## Smoke Testing

Use the provided `scripts/smoke.http` (HTTPie / VSCode REST client format) for quick manual validation. Replace placeholders for tokens/JTIs as you test the flow.

## Common Tasks

- `scripts/gen-keys.sh` – generate RSA key pair & suggested KID
- `pnpm -r format` – check formatting
- `pnpm -r build` – TypeScript build for issuer/bot
- `docker/docker-compose.yml` – production-ready stack (issuer + redis + optional bot)

## Testing Status

Automated tests are wired up (`pnpm -r test`). Running them locally requires a native build toolchain so that `better-sqlite3` can compile; installs without it will fail during `pnpm install`. Once the prerequisites are met, run the standard workspace tests and integration suite.

## Security Notes

- Never commit `private.pem`; mount or inject it via secrets in production
- Rotate keys periodically and publish the new `kid` via configuration/client updates
- Restrict Discord bot usage via channel permissions or dedicated admin guilds
- Monitor Redis for evictions – per-license TTL protects long-lived revocation entries, but ensure memory settings are appropriate

## License

MIT
