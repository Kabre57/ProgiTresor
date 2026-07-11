-- DropIndex
DROP INDEX "nomenclature_produit_libelle_brut_key";

-- AlterTable
ALTER TABLE "niveau" DROP COLUMN "cycle";

-- AlterTable
ALTER TABLE "nomenclature_produit" DROP COLUMN "libelle_brut",
DROP COLUMN "libelle_standard",
ADD COLUMN     "libelle" VARCHAR(150) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "nomenclature_produit_code_produit_key" ON "nomenclature_produit"("code_produit");
