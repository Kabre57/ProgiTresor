ALTER TABLE "nomenclature_produit"
  ADD COLUMN IF NOT EXISTS "regex_pattern" VARCHAR(500);

CREATE INDEX IF NOT EXISTS "nomenclature_produit_actif_idx"
  ON "nomenclature_produit"("actif");
