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

seed:
	docker exec -it progi-auth-service npx prisma db seed
	docker exec -it progi-etudiant-service npx prisma db seed
	docker exec -it progi-transaction-service npx prisma db seed
	docker exec -it progi-order-service npx prisma db seed

sync-schema:
	cd apps/services/auth-service && npx prisma migrate dev --name sync_schema
	cd apps/services/etudiant-service && npx prisma migrate dev --name sync_schema
	cd apps/services/transaction-service && npx prisma migrate dev --name sync_schema
	cd apps/services/order-service && npx prisma migrate dev --name sync_schema
	cd apps/services/transaction-service && npm run db:triggers

test:
	docker exec -it progi-auth-service npm test
	docker exec -it progi-etudiant-service npm test
	docker exec -it progi-transaction-service npm test
	docker exec -it progi-order-service npm test

docs:
	@echo "API Documentation available at:"
	@echo "  Gateway Swagger UI: http://localhost:4000/api-docs"
	@echo "  Auth Service Swagger UI: http://localhost:5001/api-docs"
	@echo "  Etudiant Service Swagger UI: http://localhost:5002/api-docs"
	@echo "  Transaction Service Swagger UI: http://localhost:5003/api-docs"
	@echo "  Order Service Swagger UI: http://localhost:5004/api-docs"

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

generate-docs:
	@echo "Generating OpenAPI specs inside containers..."
	@docker exec -t progi-auth-service npm run generate:docs || true
	@docker exec -t progi-etudiant-service npm run generate:docs || true
	@docker exec -t progi-transaction-service npm run generate:docs || true
	@docker exec -t progi-order-service npm run generate:docs || true
	@echo "Copying specs to host..."
	@docker cp progi-auth-service:/app/openapi.json ./apps/services/auth-service/openapi.json || true
	@docker cp progi-etudiant-service:/app/openapi.json ./apps/services/etudiant-service/openapi.json || true
	@docker cp progi-transaction-service:/app/openapi.json ./apps/services/transaction-service/openapi.json || true
	@docker cp progi-order-service:/app/openapi.json ./apps/services/order-service/openapi.json || true
	@echo "Merging specifications..."
	@node scripts/merge-apis.js
