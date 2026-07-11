/*
  Warnings:

  - You are about to drop the column `niveau_id` on the `etudiant` table. All the data in the column will be lost.
  - You are about to drop the column `niveau_id` on the `nomenclature_produit` table. All the data in the column will be lost.
  - You are about to drop the column `num_versement` on the `nomenclature_produit` table. All the data in the column will be lost.
  - You are about to drop the column `statut_id` on the `nomenclature_produit` table. All the data in the column will be lost.
  - You are about to drop the `configuration_frais_niveau` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `niveau` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `filiere_id` to the `etudiant` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "configuration_frais_niveau" DROP CONSTRAINT "configuration_frais_niveau_niveau_id_fkey";

-- DropForeignKey
ALTER TABLE "configuration_frais_niveau" DROP CONSTRAINT "configuration_frais_niveau_nomenclature_produit_id_fkey";

-- DropForeignKey
ALTER TABLE "configuration_frais_niveau" DROP CONSTRAINT "configuration_frais_niveau_statut_etudiant_id_fkey";

-- DropForeignKey
ALTER TABLE "etudiant" DROP CONSTRAINT "etudiant_niveau_id_fkey";

-- DropForeignKey
ALTER TABLE "niveau" DROP CONSTRAINT "niveau_filiere_id_fkey";

-- DropForeignKey
ALTER TABLE "nomenclature_produit" DROP CONSTRAINT "nomenclature_produit_niveau_id_fkey";

-- DropForeignKey
ALTER TABLE "nomenclature_produit" DROP CONSTRAINT "nomenclature_produit_statut_id_fkey";

-- DropIndex
DROP INDEX "etudiant_niveau_id_idx";

-- DropIndex
DROP INDEX "nomenclature_produit_niveau_id_idx";

-- DropIndex
DROP INDEX "nomenclature_produit_statut_id_idx";

-- AlterTable
ALTER TABLE "etudiant" DROP COLUMN "niveau_id",
ADD COLUMN     "filiere_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "filiere" ALTER COLUMN "abreviation" DROP DEFAULT;

-- AlterTable
ALTER TABLE "nomenclature_produit" DROP COLUMN "niveau_id",
DROP COLUMN "num_versement",
DROP COLUMN "statut_id";

-- DropTable
DROP TABLE "configuration_frais_niveau";

-- DropTable
DROP TABLE "niveau";

-- CreateTable
CREATE TABLE "_EtudiantToNomenclatureProduit" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_EtudiantToNomenclatureProduit_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_EtudiantToNomenclatureProduit_B_index" ON "_EtudiantToNomenclatureProduit"("B");

-- CreateIndex
CREATE INDEX "etudiant_filiere_id_idx" ON "etudiant"("filiere_id");

-- AddForeignKey
ALTER TABLE "etudiant" ADD CONSTRAINT "etudiant_filiere_id_fkey" FOREIGN KEY ("filiere_id") REFERENCES "filiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EtudiantToNomenclatureProduit" ADD CONSTRAINT "_EtudiantToNomenclatureProduit_A_fkey" FOREIGN KEY ("A") REFERENCES "etudiant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EtudiantToNomenclatureProduit" ADD CONSTRAINT "_EtudiantToNomenclatureProduit_B_fkey" FOREIGN KEY ("B") REFERENCES "nomenclature_produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
