# === STAGE 1: Dependencies ===
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl postgresql-client
WORKDIR /app
COPY apps/services/analyse-service/package.json apps/services/analyse-service/pnpm-lock.yaml apps/services/analyse-service/tsconfig.json ./apps/services/analyse-service/
COPY apps/services/analyse-service/prisma ./apps/services/analyse-service/prisma
COPY apps/services/analyse-service/prisma.config.ts ./apps/services/analyse-service/prisma.config.ts
WORKDIR /app/apps/services/analyse-service
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN pnpm install --frozen-lockfile --prod
RUN pnpm exec prisma generate

# === STAGE 2: Builder ===
FROM node:20-alpine AS builder
WORKDIR /app
COPY apps/services/analyse-service/package.json apps/services/analyse-service/pnpm-lock.yaml apps/services/analyse-service/tsconfig.json ./apps/services/analyse-service/
COPY apps/services/analyse-service/prisma ./apps/services/analyse-service/prisma
COPY apps/services/analyse-service/prisma.config.ts ./apps/services/analyse-service/prisma.config.ts
COPY shared ./shared
COPY apps/services/analyse-service/src ./apps/services/analyse-service/src
WORKDIR /app/apps/services/analyse-service
ENV NODE_ENV=development
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate
RUN pnpm run build

# === STAGE 3: Runner ===
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl postgresql-client
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app/apps/services/analyse-service
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeuser

COPY --from=deps --chown=nodeuser:nodejs /app/apps/services/analyse-service/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodejs /app/apps/services/analyse-service/dist ./dist
COPY --from=builder --chown=nodeuser:nodejs /app/apps/services/analyse-service/package.json ./
COPY --from=builder --chown=nodeuser:nodejs /app/apps/services/analyse-service/prisma ./prisma
COPY --from=builder --chown=nodeuser:nodejs /app/apps/services/analyse-service/prisma.config.ts ./
COPY --from=builder --chown=nodeuser:nodejs /app/shared /app/shared
COPY --chown=nodeuser:nodejs apps/services/analyse-service/uploads ./uploads
COPY apps/services/analyse-service/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

USER nodeuser
EXPOSE 5005
CMD ["./entrypoint.sh"]
