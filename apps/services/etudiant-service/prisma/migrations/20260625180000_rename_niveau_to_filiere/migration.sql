-- Rename Niveau referential to Filiere while preserving existing data.
ALTER TABLE "niveau" RENAME TO "filiere";

ALTER TABLE "etudiant" RENAME COLUMN "niveau_id" TO "filiere_id";
ALTER TABLE "nomenclature_produit" RENAME COLUMN "niveau_id" TO "filiere_id";

ALTER INDEX "niveau_code_key" RENAME TO "filiere_code_key";
ALTER INDEX "etudiant_niveau_id_idx" RENAME TO "etudiant_filiere_id_idx";
ALTER INDEX "nomenclature_produit_niveau_id_idx" RENAME TO "nomenclature_produit_filiere_id_idx";

ALTER TABLE "filiere" RENAME CONSTRAINT "niveau_pkey" TO "filiere_pkey";
ALTER TABLE "etudiant" RENAME CONSTRAINT "etudiant_niveau_id_fkey" TO "etudiant_filiere_id_fkey";
ALTER TABLE "nomenclature_produit" RENAME CONSTRAINT "nomenclature_produit_niveau_id_fkey" TO "nomenclature_produit_filiere_id_fkey";
