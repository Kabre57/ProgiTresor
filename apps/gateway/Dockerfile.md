FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY node_modules ./node_modules

# === STAGE 2: Builder ===
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY node_modules ./node_modules
COPY . .
# Nettoyage radical des fichiers obsolètes avant le build
RUN find . -name "*student*" -delete && \
    find src/routes/ -name "index.ts" -exec sed -i 's/student.routes/etudiant.routes/g' {} + && \
    find src/ -name "*.ts" -exec sed -i 's/STUDENT_SERVICE_URL/ETUDIANT_SERVICE_URL/g' {} +

COPY tsconfig.json ./
RUN npm run build

# === STAGE 3: Runner ===
FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
USER nextjs
EXPOSE 4000
CMD ["node", "dist/server.js"]