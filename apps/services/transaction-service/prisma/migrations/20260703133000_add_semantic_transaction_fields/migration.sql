ALTER TABLE "transaction"
  ADD COLUMN "filiere" VARCHAR(100),
  ADD COLUMN "niveau" VARCHAR(50),
  ADD COLUMN "versement" VARCHAR(50),
  ADD COLUMN "type_frais" VARCHAR(100);

CREATE INDEX IF NOT EXISTS "transaction_type_flux_id_idx" ON "transaction"("type_flux_id");
CREATE INDEX IF NOT EXISTS "transaction_filiere_idx" ON "transaction"("filiere");
CREATE INDEX IF NOT EXISTS "transaction_niveau_idx" ON "transaction"("niveau");
CREATE INDEX IF NOT EXISTS "transaction_type_frais_idx" ON "transaction"("type_frais");
