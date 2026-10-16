#!/bin/bash
# ================================================
# deploy.sh — Script de déploiement ProgiTresor
# VPS LWS — progitpaie.online (180.149.199.203)
# Usage: bash deploy.sh
# ================================================

set -e  # Arrêt si erreur

REPO_URL="https://github.com/Kabre57/ProgiTresor.git"
APP_DIR="$HOME/apps/progitpaie"
ENV_FILE="$APP_DIR/.env.production"
COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   DÉPLOIEMENT PROGITRESOR — VPS LWS      ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ------------------------------------------------
# ÉTAPE 1 — Cloner ou mettre à jour le projet
# ------------------------------------------------
echo "▶ [1/6] Clonage / Mise à jour du projet..."

if [ -d "$APP_DIR" ]; then
  echo "  → Dossier existant, mise à jour avec git pull..."
  cd "$APP_DIR"
  git pull origin master
else
  echo "  → Premier déploiement, clonage..."
  mkdir -p "$HOME/apps"
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ------------------------------------------------
# ÉTAPE 2 — Vérifier le fichier .env.production
# ------------------------------------------------
echo ""
echo "▶ [2/6] Vérification du fichier .env.production..."

if [ ! -f "$ENV_FILE" ]; then
  echo ""
  echo "  ⚠️  ATTENTION : Le fichier .env.production est MANQUANT !"
  echo ""
  echo "  Crée-le maintenant avec:"
  echo "    nano $ENV_FILE"
  echo ""
  echo "  Contenu minimal requis:"
  echo "  ─────────────────────────────────────────────────"
  cat << 'EOF'
  JWT_SECRET=<openssl rand -base64 32>
  REFRESH_TOKEN_SECRET=<openssl rand -base64 32>
  INTERNAL_API_SECRET=<openssl rand -base64 32>
  REDIS_URL=redis://redis:6379
  POSTGRES_USER=postgres
  POSTGRES_PASSWORD=<mot_de_passe_fort>
  MINIO_ROOT_USER=ProgiAdmin2026
  MINIO_ROOT_PASSWORD=<mot_de_passe_fort>
  DATABASE_URL_AUTH=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/progi_auth
  DATABASE_URL_ETUDIANT=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/progi_etudiant
  DATABASE_URL_TRANSACTION=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/progi_transaction
  DATABASE_URL_ORDER=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/progi_order
  DATABASE_URL_ANALYSE=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/progi_analyse
  DATABASE_URL_COMPTA=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/progi_compta
  DATABASE_URL_BUDGET=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/progi_budget
  PDF_STORAGE_TYPE=s3
  PDF_PUBLIC_BASE_URL=https://progitpaie.online/api/analyse
EOF
  echo "  ─────────────────────────────────────────────────"
  echo ""
  echo "  Relance ce script après avoir créé le fichier."
  exit 1
else
  echo "  ✅ .env.production trouvé"
fi

# ------------------------------------------------
# ÉTAPE 3 — Builder les images Docker
# ------------------------------------------------
echo ""
echo "▶ [3/6] Build des images Docker (peut prendre 10-15 min)..."
cd "$APP_DIR"
$COMPOSE_CMD build

# ------------------------------------------------
# ÉTAPE 4 — Démarrer les conteneurs
# ------------------------------------------------
echo ""
echo "▶ [4/6] Démarrage des conteneurs..."
$COMPOSE_CMD up -d

echo "  → Attente que PostgreSQL soit prêt (30s)..."
sleep 30

# ------------------------------------------------
# ÉTAPE 5 — Migrations de bases de données
# ------------------------------------------------
echo ""
echo "▶ [5/6] Application des migrations Prisma..."

SERVICES=("auth-service" "etudiant-service" "transaction-service" "order-service" "analyse-service" "compta-service" "budget-service")

for svc in "${SERVICES[@]}"; do
  container="progi-$svc"
  echo "  → Migration: $container"
  docker exec "$container" npx prisma migrate deploy || echo "  ⚠️  Erreur migration $container (peut-être déjà appliquée)"
done

# ------------------------------------------------
# ÉTAPE 6 — Seed données initiales (1ère fois)
# ------------------------------------------------
echo ""
echo "▶ [6/6] Seed des données initiales..."
docker exec progi-auth-service npx prisma db seed || echo "  ⚠️  Seed auth déjà fait ou erreur"
docker exec progi-etudiant-service npx prisma db seed || echo "  ⚠️  Seed etudiant déjà fait ou erreur"
docker exec progi-transaction-service npx prisma db seed || echo "  ⚠️  Seed transaction déjà fait ou erreur"
docker exec progi-order-service npx prisma db seed || echo "  ⚠️  Seed order déjà fait ou erreur"

# ------------------------------------------------
# RÉSUMÉ
# ------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   DÉPLOIEMENT TERMINÉ !                  ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "État des conteneurs:"
$COMPOSE_CMD ps
echo ""
echo "🌐 URLs (après config Nginx + SSL):"
echo "   Frontend  → https://progitpaie.online"
echo "   API       → https://api.progitpaie.online"
echo "   MinIO     → https://storage.progitpaie.online"
echo ""
echo "📋 Commandes utiles:"
echo "   Logs      → $COMPOSE_CMD logs -f"
echo "   Restart   → $COMPOSE_CMD restart <service>"
echo "   Status    → $COMPOSE_CMD ps"
echo ""
