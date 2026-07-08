-- Rename OP grouping column from niveau_id to filiere_id while preserving existing data.
ALTER TABLE "ordre_paiement" RENAME COLUMN "niveau_id" TO "filiere_id";
ALTER INDEX "ordre_paiement_niveau_id_idx" RENAME TO "ordre_paiement_filiere_id_idx";
