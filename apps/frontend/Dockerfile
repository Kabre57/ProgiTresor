# === STAGE 1: Dependencies ===
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Utiliser --legacy-peer-deps pour résoudre le conflit react-datepicker
RUN npm ci --legacy-peer-deps

# === STAGE 2: Builder ===
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_GATEWAY=http://localhost:4000/api
ENV NEXT_PUBLIC_API_GATEWAY=$NEXT_PUBLIC_API_GATEWAY

RUN npm run build

# === STAGE 3: Runner ===
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/postcss.config.js ./
COPY --from=builder /app/tailwind.config.js ./
RUN mkdir -p .next/cache/images && chown -R nextjs:nodejs /app/.next

USER nextjs

EXPOSE 3030

ENV PORT=3030
ENV HOSTNAME="0.0.0.0"

CMD ["node", "node_modules/.bin/next", "start", "-p", "3030"]
