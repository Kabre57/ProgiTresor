#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/cleanup-data-except-auth-service.sh             # aperçu uniquement
  scripts/cleanup-data-except-auth-service.sh --dry-run   # aperçu uniquement
  scripts/cleanup-data-except-auth-service.sh --apply     # aperçu, puis confirmation explicite

Le script nettoie les bases opérationnelles sans toucher à la base auth-service.
Il conserve les référentiels étudiants configurés et les migrations Prisma.
USAGE
}

mode="${1:---dry-run}"
case "$mode" in
  --dry-run) action="plan" ;;
  --apply) action="apply" ;;
  -h|--help) usage; exit 0 ;;
  *) usage >&2; exit 2 ;;
esac

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd -- "$script_dir/.." && pwd)"
cd "$project_dir"

services=(
  "etudiant:progi-etudiant-service:progi_etudiant"
  "transaction:progi-transaction-service:progi_transaction"
  "order:progi-order-service:progi_order"
  "budget:progi-budget-service:progi_budget"
  "compta:progi-compta-service:progi_compta"
  "analyse:progi-analyse-service:progi_analyse"
)

run_for_all_services() {
  local operation="$1"
  local entry service container database
  for entry in "${services[@]}"; do
    IFS=: read -r service container database <<< "$entry"
    if [[ "$(docker inspect --format '{{.State.Running}}' "$container")" != "true" ]]; then
      echo "Service arrêté : $container" >&2
      return 1
    fi
    docker cp "$script_dir/cleanup-db.cjs" "$container:/tmp/progitresor-cleanup-db.cjs" >/dev/null
    docker exec -w "/app/apps/services/$service-service" "$container" \
      node /tmp/progitresor-cleanup-db.cjs "$operation" "$service" "$database"
  done
}

echo "Aperçu du nettoyage demandé :"
run_for_all_services plan
cache_count="$(docker exec progi-redis redis-cli --scan --pattern 'etudiant:*' | wc -l | tr -d '[:space:]')"
kpi_cache_count="$(docker exec progi-redis redis-cli --scan --pattern 'kpis:*' | wc -l | tr -d '[:space:]')"
echo "Clés de cache étudiant à vider après le nettoyage : $cache_count"
echo "Clés de cache KPI à invalider après le nettoyage : $kpi_cache_count"

if [[ "$action" == "apply" ]]; then
  if [[ ! -t 0 ]]; then
    echo "L'exécution exige un terminal interactif. Relance avec --apply depuis le VPS." >&2
    exit 2
  fi
  echo
  echo "Cette opération est irréversible et s'applique séparément à chaque base."
  read -r -p 'Pour continuer, tape exactement NETTOYER : ' confirmation
  if [[ "$confirmation" != "NETTOYER" ]]; then
    echo "Annulé ; aucune donnée supprimée."
    exit 1
  fi
  run_for_all_services apply
  docker exec progi-redis sh -c 'for pattern in "etudiant:*" "kpis:*"; do redis-cli --scan --pattern "$pattern" | while IFS= read -r key; do if [ -n "$key" ]; then redis-cli UNLINK "$key" >/dev/null; fi; done; done'
fi
