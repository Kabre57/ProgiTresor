# === STAGE 1: Dependencies ===
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl postgresql-client
WORKDIR /app
COPY apps/services/budget-service/package*.json apps/services/budget-service/tsconfig.json ./apps/services/budget-service/
COPY apps/services/budget-service/prisma ./apps/services/budget-service/prisma
COPY apps/services/budget-service/prisma.config.ts ./apps/services/budget-service/prisma.config.ts
WORKDIR /app/apps/services/budget-service
RUN npm ci --only=production
RUN npx prisma generate

# === STAGE 2: Builder ===
FROM node:20-alpine AS builder
WORKDIR /app
COPY apps/services/budget-service/package*.json apps/services/budget-service/tsconfig.json ./apps/services/budget-service/
COPY apps/services/budget-service/prisma ./apps/services/budget-service/prisma
COPY apps/services/budget-service/prisma.config.ts ./apps/services/budget-service/prisma.config.ts
COPY shared ./shared
COPY apps/services/budget-service/src ./apps/services/budget-service/src
WORKDIR /app/apps/services/budget-service
ENV NODE_ENV=development
RUN npm ci
RUN npx prisma generate
RUN npm run build

# === STAGE 3: Runner ===
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl postgresql-client
WORKDIR /app/apps/services/budget-service
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeuser

COPY --from=deps --chown=nodeuser:nodejs /app/apps/services/budget-service/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodejs /app/apps/services/budget-service/dist ./dist
COPY --from=builder --chown=nodeuser:nodejs /app/apps/services/budget-service/package.json ./
COPY --from=builder --chown=nodeuser:nodejs /app/apps/services/budget-service/prisma ./prisma
COPY --from=builder --chown=nodeuser:nodejs /app/apps/services/budget-service/prisma.config.ts ./
COPY --from=builder --chown=nodeuser:nodejs /app/shared /app/shared
COPY apps/services/budget-service/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

USER nodeuser
EXPOSE 5007
CMD ["./entrypoint.sh"]
