COMPOSE = docker compose
PROD_COMPOSE = $(COMPOSE) -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production

.PHONY: build up down logs clean seed-dev prod-config prod-build prod-up prod-down prod-logs prod-ps

# Développement local uniquement : les ports du fichier de base sont publiés.
build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

clean:
	docker compose down -v

seed-dev:
	docker exec -it progi-auth-service pnpm exec prisma db seed
	docker exec -it progi-etudiant-service pnpm exec prisma db seed
	docker exec -it progi-transaction-service pnpm exec prisma db seed
	docker exec -it progi-order-service pnpm exec prisma db seed

# Production : utilise les surcharges réseau et les secrets de .env.production.
prod-config:
	$(PROD_COMPOSE) config --quiet

prod-build: prod-config
	$(PROD_COMPOSE) build

prod-up: prod-config
	$(PROD_COMPOSE) up -d

prod-down:
	$(PROD_COMPOSE) down

prod-logs:
	$(PROD_COMPOSE) logs -f

prod-ps:
	$(PROD_COMPOSE) ps

sync-schema:
	cd apps/services/auth-service && pnpm exec prisma migrate dev --name sync_schema
	cd apps/services/etudiant-service && pnpm exec prisma migrate dev --name sync_schema
	cd apps/services/transaction-service && pnpm exec prisma migrate dev --name sync_schema
	cd apps/services/order-service && pnpm exec prisma migrate dev --name sync_schema
	cd apps/services/analyse-service && pnpm exec prisma migrate dev --name sync_schema
	cd apps/services/transaction-service && pnpm run db:triggers

test:
	docker exec -it progi-auth-service pnpm test
	docker exec -it progi-etudiant-service pnpm test
	docker exec -it progi-transaction-service pnpm test
	docker exec -it progi-order-service pnpm test
	docker exec -it progi-analyse-service pnpm test

docs:
	@echo "API Documentation available at:"
	@echo "  Gateway Swagger UI: http://localhost:4000/api-docs"
	@echo "  Auth Service Swagger UI: http://localhost:5001/api-docs"
	@echo "  Etudiant Service Swagger UI: http://localhost:5002/api-docs"
	@echo "  Transaction Service Swagger UI: http://localhost:5003/api-docs"
	@echo "  Order Service Swagger UI: http://localhost:5004/api-docs"
	@echo "  Analyse Service Swagger UI: http://localhost:5005/api-docs"

metrics:
	@echo "Querying services metrics..."
	@echo "--- Gateway ---"
	@curl -s http://localhost:4000/metrics | grep -E "^(gateway_|process_|nodejs_)" | head -n 10
	@echo "--- Auth Service ---"
	@curl -s http://localhost:5001/metrics | grep -E "^(auth_|process_|nodejs_)" | head -n 10
	@echo "--- Etudiant Service ---"
	@curl -s http://localhost:5002/metrics | grep -E "^(etudiant_|process_|nodejs_)" | head -n 10
	@echo "--- Transaction Service ---"
	@curl -s http://localhost:5003/metrics | grep -E "^(transaction_|process_|nodejs_)" | head -n 10
	@echo "--- Order Service ---"
	@curl -s http://localhost:5004/metrics | grep -E "^(order_|process_|nodejs_)" | head -n 10
	@echo "--- Analyse Service ---"
	@curl -s http://localhost:5005/metrics | grep -E "^(analyse_|process_|nodejs_)" | head -n 10

generate-docs:
	@echo "Generating OpenAPI specs inside containers..."
	@docker exec -t progi-auth-service pnpm run generate:docs || true
	@docker exec -t progi-etudiant-service pnpm run generate:docs || true
	@docker exec -t progi-transaction-service pnpm run generate:docs || true
	@docker exec -t progi-order-service pnpm run generate:docs || true
	@docker exec -t progi-analyse-service pnpm run generate:docs || true
	@echo "Copying specs to host..."
	@docker cp progi-auth-service:/app/openapi.json ./apps/services/auth-service/openapi.json || true
	@docker cp progi-etudiant-service:/app/openapi.json ./apps/services/etudiant-service/openapi.json || true
	@docker cp progi-transaction-service:/app/openapi.json ./apps/services/transaction-service/openapi.json || true
	@docker cp progi-order-service:/app/openapi.json ./apps/services/order-service/openapi.json || true
	@docker cp progi-analyse-service:/app/openapi.json ./apps/services/analyse-service/openapi.json || true
	@echo "Merging specifications..."
	@node scripts/merge-apis.js
