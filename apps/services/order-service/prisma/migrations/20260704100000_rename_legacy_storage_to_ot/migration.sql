-- Rename physical OT storage while preserving existing data.
ALTER TABLE IF EXISTS "synthese_op" RENAME TO "synthese_ot";
ALTER TABLE IF EXISTS "ordre_paiement" RENAME TO "ordre_traitement";
ALTER TABLE IF EXISTS "op_counter" RENAME TO "ot_counter";

ALTER TABLE IF EXISTS "ordre_traitement" RENAME COLUMN "code_op" TO "code_ot";

CREATE TABLE IF NOT EXISTS "ot_counter" (
  "year" INTEGER NOT NULL,
  "antenne_id" INTEGER NOT NULL,
  "sequence" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ot_counter_pkey" PRIMARY KEY ("year", "antenne_id")
);

ALTER INDEX IF EXISTS "synthese_op_pkey" RENAME TO "synthese_ot_pkey";
ALTER INDEX IF EXISTS "synthese_op_reference_key" RENAME TO "synthese_ot_reference_key";
ALTER INDEX IF EXISTS "synthese_op_type_flux_id_idx" RENAME TO "synthese_ot_type_flux_id_idx";
ALTER INDEX IF EXISTS "synthese_op_statut_idx" RENAME TO "synthese_ot_statut_idx";

ALTER INDEX IF EXISTS "ordre_paiement_pkey" RENAME TO "ordre_traitement_pkey";
ALTER INDEX IF EXISTS "ordre_paiement_code_op_key" RENAME TO "ordre_traitement_code_ot_key";
ALTER INDEX IF EXISTS "ordre_paiement_synthese_id_idx" RENAME TO "ordre_traitement_synthese_id_idx";
ALTER INDEX IF EXISTS "ordre_paiement_code_op_idx" RENAME TO "ordre_traitement_code_ot_idx";
ALTER INDEX IF EXISTS "ordre_paiement_antenne_id_idx" RENAME TO "ordre_traitement_antenne_id_idx";
ALTER INDEX IF EXISTS "ordre_paiement_niveau_id_idx" RENAME TO "ordre_traitement_niveau_id_idx";
ALTER INDEX IF EXISTS "ordre_paiement_filiere_id_idx" RENAME TO "ordre_traitement_filiere_id_idx";
ALTER INDEX IF EXISTS "ordre_paiement_type_recette_id_idx" RENAME TO "ordre_traitement_type_recette_id_idx";
ALTER INDEX IF EXISTS "ordre_paiement_statut_idx" RENAME TO "ordre_traitement_statut_idx";
ALTER INDEX IF EXISTS "op_counter_pkey" RENAME TO "ot_counter_pkey";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ordre_paiement_synthese_id_fkey'
  ) THEN
    ALTER TABLE "ordre_traitement"
      RENAME CONSTRAINT "ordre_paiement_synthese_id_fkey" TO "ordre_traitement_synthese_id_fkey";
  END IF;
END $$;
