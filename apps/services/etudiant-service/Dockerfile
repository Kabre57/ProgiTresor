# === STAGE 1: Dependencies ===
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl postgresql-client
WORKDIR /app
COPY apps/services/etudiant-service/package*.json apps/services/etudiant-service/tsconfig.json ./apps/services/etudiant-service/
COPY apps/services/etudiant-service/prisma ./apps/services/etudiant-service/prisma
COPY apps/services/etudiant-service/prisma.config.ts ./apps/services/etudiant-service/prisma.config.ts
WORKDIR /app/apps/services/etudiant-service
RUN npm install --omit=dev --no-audit --no-fund
RUN npx prisma generate

# === STAGE 2: Builder ===
FROM node:20-alpine AS builder
WORKDIR /app
COPY apps/services/etudiant-service/package*.json apps/services/etudiant-service/tsconfig.json ./apps/services/etudiant-service/
COPY apps/services/etudiant-service/prisma ./apps/services/etudiant-service/prisma
COPY apps/services/etudiant-service/prisma.config.ts ./apps/services/etudiant-service/prisma.config.ts
COPY shared ./shared
COPY apps/services/etudiant-service/src ./apps/services/etudiant-service/src
WORKDIR /app/apps/services/etudiant-service
ENV NODE_ENV=development
RUN npm install --no-audit --no-fund
RUN npx prisma generate
RUN npm run build
RUN npx tsc prisma/seed.ts --target es2022 --module commonjs --esModuleInterop --skipLibCheck

# === STAGE 3: Runner ===
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl postgresql-client
WORKDIR /app/apps/services/etudiant-service
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeuser

COPY --from=deps --chown=nodeuser:nodejs /app/apps/services/etudiant-service/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodejs /app/apps/services/etudiant-service/dist ./dist
COPY --from=builder --chown=nodeuser:nodejs /app/apps/services/etudiant-service/package.json ./
COPY --from=builder --chown=nodeuser:nodejs /app/apps/services/etudiant-service/prisma ./prisma
COPY --from=builder --chown=nodeuser:nodejs /app/apps/services/etudiant-service/prisma.config.ts ./
COPY --from=builder --chown=nodeuser:nodejs /app/shared /app/shared
COPY --from=builder --chown=nodeuser:nodejs /app/apps/services/etudiant-service/prisma/seed.js ./prisma/seed.js

COPY apps/services/etudiant-service/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

USER nodeuser
EXPOSE 5002
CMD ["./entrypoint.sh"]
