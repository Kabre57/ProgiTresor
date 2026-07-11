#!/bin/bash

# Script de validation de l'externalisation des secrets dans docker-compose.yml

DOCKER_COMPOSE_FILE="/home/ubuntu/ProgiTresor/ProgiTresor/docker-compose.yml"
ERRORS=0

echo "Vérification de l'externalisation des secrets dans $DOCKER_COMPOSE_FILE..."

# Vérifier POSTGRES_PASSWORD
if grep -q "POSTGRES_PASSWORD: postgres" "$DOCKER_COMPOSE_FILE"; then
    echo "[ERREUR] POSTGRES_PASSWORD est encore hardcodé."
    ERRORS=$((ERRORS + 1))
else
    if grep -q "POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}" "$DOCKER_COMPOSE_FILE"; then
        echo "[OK] POSTGRES_PASSWORD est correctement externalisé."
    else
        echo "[ERREUR] Référence à \${POSTGRES_PASSWORD} non trouvée."
        ERRORS=$((ERRORS + 1))
    fi
fi

# Vérifier MINIO_ROOT_USER
if grep -q "MINIO_ROOT_USER: \${MINIO_ROOT_USER:-minioadmin}" "$DOCKER_COMPOSE_FILE"; then
    echo "[ERREUR] MINIO_ROOT_USER a encore une valeur par défaut hardcodée."
    ERRORS=$((ERRORS + 1))
else
    if grep -q "MINIO_ROOT_USER: \${MINIO_ROOT_USER}" "$DOCKER_COMPOSE_FILE"; then
        echo "[OK] MINIO_ROOT_USER est correctement externalisé."
    else
        echo "[ERREUR] Référence à \${MINIO_ROOT_USER} non trouvée."
        ERRORS=$((ERRORS + 1))
    fi
fi

# Vérifier MINIO_ROOT_PASSWORD
if grep -q "MINIO_ROOT_PASSWORD: \${MINIO_ROOT_PASSWORD:-minioadmin}" "$DOCKER_COMPOSE_FILE"; then
    echo "[ERREUR] MINIO_ROOT_PASSWORD a encore une valeur par défaut hardcodée."
    ERRORS=$((ERRORS + 1))
else
    if grep -q "MINIO_ROOT_PASSWORD: \${MINIO_ROOT_PASSWORD}" "$DOCKER_COMPOSE_FILE"; then
        echo "[OK] MINIO_ROOT_PASSWORD est correctement externalisé."
    else
        echo "[ERREUR] Référence à \${MINIO_ROOT_PASSWORD} non trouvée."
        ERRORS=$((ERRORS + 1))
    fi
fi

if [ $ERRORS -eq 0 ]; then
    echo "Validation réussie : tous les secrets sont externalisés."
    exit 0
else
    echo "Validation échouée : $ERRORS erreur(s) trouvée(s)."
    exit 1
fi
