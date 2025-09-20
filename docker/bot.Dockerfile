# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
ENV PNPM_HOME=/usr/local
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/issuer/package.json apps/issuer/
COPY apps/discord-bot/package.json apps/discord-bot/

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @hwid-licenser/discord-bot build
RUN pnpm --filter @hwid-licenser/discord-bot deploy --prod --target /out

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /out .

RUN adduser -S appuser
USER appuser

CMD ["node", "dist/index.js"]
