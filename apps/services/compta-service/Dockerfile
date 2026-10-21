# === STAGE 1: Dependencies ===
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl postgresql-client
WORKDIR /app
COPY apps/services/compta-service/package.json apps/services/compta-service/pnpm-lock.yaml apps/services/compta-service/tsconfig.json ./apps/services/compta-service/
COPY apps/services/compta-service/prisma ./apps/services/compta-service/prisma
COPY apps/services/compta-service/prisma.config.ts ./apps/services/compta-service/prisma.config.ts
WORKDIR /app/apps/services/compta-service
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN pnpm install --frozen-lockfile --prod
RUN pnpm exec prisma generate

# === STAGE 2: Builder ===
FROM node:20-alpine AS builder
WORKDIR /app
COPY apps/services/compta-service/package.json apps/services/compta-service/pnpm-lock.yaml apps/services/compta-service/tsconfig.json ./apps/services/compta-service/
COPY apps/services/compta-service/prisma ./apps/services/compta-service/prisma
COPY apps/services/compta-service/prisma.config.ts ./apps/services/compta-service/prisma.config.ts
COPY shared ./shared
COPY apps/services/compta-service/src ./apps/services/compta-service/src
WORKDIR /app/apps/services/compta-service
ENV NODE_ENV=development
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate
RUN pnpm run build

# === STAGE 3: Runner ===
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl postgresql-client
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app/apps/services/compta-service
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeuser

COPY --from=deps --chown=nodeuser:nodejs /app/apps/services/compta-service/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodejs /app/apps/services/compta-service/dist ./dist
COPY --from=builder --chown=nodeuser:nodejs /app/apps/services/compta-service/package.json ./
COPY --from=builder --chown=nodeuser:nodejs /app/apps/services/compta-service/prisma ./prisma
COPY --from=builder --chown=nodeuser:nodejs /app/apps/services/compta-service/prisma.config.ts ./
COPY --from=builder --chown=nodeuser:nodejs /app/shared /app/shared
COPY apps/services/compta-service/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

USER nodeuser
EXPOSE 5006
CMD ["./entrypoint.sh"]
