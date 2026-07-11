ALTER TABLE "ordre_traitement"
  ADD COLUMN IF NOT EXISTS "titre" VARCHAR(180),
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "reference_vague" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "transmis_par_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "date_transmission_synthese" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "ordre_traitement_reference_vague_idx"
  ON "ordre_traitement"("reference_vague");

CREATE TABLE IF NOT EXISTS "ot_transmission_history" (
  "id" SERIAL NOT NULL,
  "ordre_traitement_id" INTEGER NOT NULL,
  "reference_vague" VARCHAR(80) NOT NULL,
  "titre" VARCHAR(180) NOT NULL,
  "description" TEXT,
  "utilisateur_id" INTEGER NOT NULL,
  "nombre_lignes" INTEGER NOT NULL DEFAULT 0,
  "nombre_flux" INTEGER NOT NULL DEFAULT 0,
  "montant_total" BIGINT NOT NULL DEFAULT 0,
  "date_transmission" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ot_transmission_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ot_transmission_history_ordre_traitement_id_fkey"
    FOREIGN KEY ("ordre_traitement_id") REFERENCES "ordre_traitement"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ot_transmission_history_reference_vague_idx"
  ON "ot_transmission_history"("reference_vague");

CREATE INDEX IF NOT EXISTS "ot_transmission_history_ordre_traitement_id_idx"
  ON "ot_transmission_history"("ordre_traitement_id");
