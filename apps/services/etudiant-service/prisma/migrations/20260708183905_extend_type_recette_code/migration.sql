-- DropIndex
DROP INDEX "niveau_filiere_id_idx";

-- AlterTable
ALTER TABLE "etudiant" ALTER COLUMN "photo_url" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "nomenclature_produit" ALTER COLUMN "code_produit" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "type_recette" ALTER COLUMN "code" SET DATA TYPE VARCHAR(100);

-- CreateTable
CREATE TABLE "configuration_frais_niveau" (
    "id" SERIAL NOT NULL,
    "nomenclature_produit_id" INTEGER NOT NULL,
    "niveau_id" INTEGER NOT NULL,
    "statut_etudiant_id" INTEGER NOT NULL,
    "montant_specifique" INTEGER,
    "est_obligatoire" BOOLEAN NOT NULL DEFAULT true,
    "date_debut_validite" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_fin_validite" TIMESTAMP(3),

    CONSTRAINT "configuration_frais_niveau_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "configuration_frais_niveau_nomenclature_produit_id_idx" ON "configuration_frais_niveau"("nomenclature_produit_id");

-- CreateIndex
CREATE INDEX "configuration_frais_niveau_niveau_id_idx" ON "configuration_frais_niveau"("niveau_id");

-- CreateIndex
CREATE INDEX "configuration_frais_niveau_statut_etudiant_id_idx" ON "configuration_frais_niveau"("statut_etudiant_id");

-- CreateIndex
CREATE UNIQUE INDEX "configuration_frais_niveau_nomenclature_produit_id_niveau_i_key" ON "configuration_frais_niveau"("nomenclature_produit_id", "niveau_id", "statut_etudiant_id");

-- AddForeignKey
ALTER TABLE "configuration_frais_niveau" ADD CONSTRAINT "configuration_frais_niveau_nomenclature_produit_id_fkey" FOREIGN KEY ("nomenclature_produit_id") REFERENCES "nomenclature_produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuration_frais_niveau" ADD CONSTRAINT "configuration_frais_niveau_niveau_id_fkey" FOREIGN KEY ("niveau_id") REFERENCES "niveau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuration_frais_niveau" ADD CONSTRAINT "configuration_frais_niveau_statut_etudiant_id_fkey" FOREIGN KEY ("statut_etudiant_id") REFERENCES "statut_etudiant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
