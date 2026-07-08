#!/bin/bash

# Script de nettoyage des console.log pour le projet ProgiTresor
# Ce script parcourt les dossiers src des microservices et du frontend
# pour commenter ou supprimer les lignes contenant console.log

echo "🚀 Démarrage du nettoyage des console.log..."

# Définition des dossiers à parcourir
TARGET_DIRS=(
    "apps/frontend/src"
    "apps/services/auth-service/src"
    "apps/services/etudiant-service/src"
    "apps/services/transaction-service/src"
    "apps/services/analyse-service/src"
    "apps/gateway/src"
)

for DIR in "${TARGET_DIRS[@]}"; do
    if [ -d "$DIR" ]; then
        echo "📁 Nettoyage dans : $DIR"
        
        # Utilisation de sed pour commenter les console.log
        # On cherche les lignes contenant console.log et on ajoute // devant
        # On ignore les lignes déjà commentées
        find "$DIR" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -exec sed -i '/^[[:space:]]*console\.log/ s/^[[:space:]]*/\/\/ &/' {} +
        
        # Optionnel : Supprimer complètement les lignes au lieu de les commenter
        # find "$DIR" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -exec sed -i '/^[[:space:]]*console\.log/d' {} +
    else
        echo "⚠️ Dossier non trouvé : $DIR"
    fi
done

echo "✅ Nettoyage terminé avec succès !"
