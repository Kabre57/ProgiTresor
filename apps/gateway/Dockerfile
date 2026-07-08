# === STAGE 1: Dependencies ===
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Installer TOUTES les dépendances (dont devDependencies pour le build)
RUN npm ci

# === STAGE 2: Builder ===
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# === STAGE 3: Runner ===
FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs
EXPOSE 4000
CMD ["node", "dist/server.js"]
