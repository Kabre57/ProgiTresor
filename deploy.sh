#!/bin/bash
# ================================================
# deploy.sh — Script de déploiement ProgiTresor
# VPS LWS — progitresor.online (180.149.199.203)
# Usage: bash deploy.sh
# ================================================

set -eu  # Arrêt si erreur ou variable non définie

REPO_URL="https://github.com/Kabre57/ProgiTresor.git"
APP_DIR="$HOME/apps/progitresor"
ENV_FILE="$APP_DIR/.env.production"
COMPOSE_ARGS=(-f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production)

compose() {
  docker compose "${COMPOSE_ARGS[@]}" "$@"
}

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   DÉPLOIEMENT PROGITRESOR — VPS LWS      ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ------------------------------------------------
# ÉTAPE 1 — Cloner ou mettre à jour le projet
# ------------------------------------------------
echo "▶ [1/4] Clonage / Mise à jour du projet..."

if [ -d "$APP_DIR" ]; then
  if [ ! -d "$APP_DIR/.git" ]; then
    echo "  ❌ $APP_DIR existe mais n'est pas un dépôt Git. Arrêt par sécurité."
    exit 1
  fi

  cd "$APP_DIR"
  if [ -n "$(git status --porcelain)" ]; then
    echo "  ❌ Le dépôt contient des changements locaux ou non suivis."
    echo "     Valide-les ou mets-les de côté avant de relancer le déploiement."
    exit 1
  fi

  echo "  → Dossier propre, mise à jour rapide uniquement..."
  git pull --ff-only origin master
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
echo "▶ [2/4] Vérification du fichier .env.production..."

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
  CORS_ORIGIN=https://progitresor.online,https://www.progitresor.online
  POSTGRES_USER=postgres
  POSTGRES_PASSWORD=<openssl rand -hex 32>
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
  PDF_PUBLIC_BASE_URL=https://progitresor.online/api/analyse
  RUN_SEED=false
EOF
  echo "  ─────────────────────────────────────────────────"
  echo ""
  echo "  Relance ce script après avoir créé le fichier."
  exit 1
else
  echo "  ✅ .env.production trouvé"
fi

# ------------------------------------------------
# ÉTAPE 3 — Valider la configuration puis builder les images Docker
# ------------------------------------------------
echo ""
echo "▶ [3/4] Validation de la configuration..."
cd "$APP_DIR"
compose config --quiet

echo "  ✅ Configuration Docker Compose valide"
echo "▶ Build des images Docker (peut prendre 10-15 min)..."
compose build

# ------------------------------------------------
# ÉTAPE 4 — Démarrer les conteneurs
# ------------------------------------------------
echo ""
echo "▶ [4/4] Démarrage des conteneurs..."
compose up -d

# Les entrypoints exécutent prisma migrate deploy et échouent si une migration
# ne peut pas être appliquée. Le seed n'est jamais automatique en production.

# ------------------------------------------------
# RÉSUMÉ
# ------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   DÉPLOIEMENT TERMINÉ !                  ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "État des conteneurs:"
compose ps
echo ""
echo "🌐 URLs (après config Nginx + SSL):"
echo "   Frontend  → https://progitresor.online"
echo "   API       → https://api.progitresor.online"
echo "   MinIO     → https://storage.progitresor.online"
echo ""
echo "📋 Commandes utiles:"
echo "   Logs      → docker compose ${COMPOSE_ARGS[*]} logs -f"
echo "   Restart   → docker compose ${COMPOSE_ARGS[*]} restart <service>"
echo "   Status    → docker compose ${COMPOSE_ARGS[*]} ps"
echo ""
echo "🔐 Premier démarrage uniquement — création contrôlée de l'administrateur:"
echo "   read -rs PROGI_INITIAL_PASSWORD; echo"
echo "   docker exec -e INITIAL_USER_PASSWORD=\"\$PROGI_INITIAL_PASSWORD\" progi-auth-service pnpm exec prisma db seed"
echo "   unset PROGI_INITIAL_PASSWORD"
echo "   (mot de passe d'au moins 16 caractères ; RUN_SEED doit rester à false)"
echo ""
