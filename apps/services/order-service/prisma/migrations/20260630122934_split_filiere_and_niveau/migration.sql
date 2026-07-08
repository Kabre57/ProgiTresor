/*
  Warnings:

  - You are about to drop the column `filiere_id` on the `ordre_paiement` table. All the data in the column will be lost.
  - Added the required column `niveau_id` to the `ordre_paiement` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX IF EXISTS "ordre_paiement_filiere_id_idx";

-- RenameColumn
ALTER TABLE "ordre_paiement" RENAME COLUMN "filiere_id" TO "niveau_id";

-- CreateIndex
CREATE INDEX "ordre_paiement_niveau_id_idx" ON "ordre_paiement"("niveau_id");
