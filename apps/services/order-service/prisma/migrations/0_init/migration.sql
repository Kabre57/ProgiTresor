-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "synthese_op" (
    "id" SERIAL NOT NULL,
    "reference" VARCHAR(40) NOT NULL,
    "periode_debut" DATE NOT NULL,
    "periode_fin" DATE NOT NULL,
    "type_flux_id" INTEGER NOT NULL,
    "statut" VARCHAR(25) NOT NULL,
    "auteur_id" INTEGER NOT NULL,
    "transmis_par_id" INTEGER,
    "montant_total" BIGINT NOT NULL DEFAULT 0,
    "nb_transactions" INTEGER NOT NULL DEFAULT 0,
    "date_generation" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_transmission" TIMESTAMPTZ,

    CONSTRAINT "synthese_op_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordre_paiement" (
    "id" SERIAL NOT NULL,
    "code_op" VARCHAR(30) NOT NULL,
    "synthese_id" INTEGER NOT NULL,
    "antenne_id" INTEGER NOT NULL,
    "niveau_id" INTEGER NOT NULL,
    "type_recette_id" INTEGER NOT NULL,
    "montant_cumule" BIGINT NOT NULL DEFAULT 0,
    "nombre_flux" INTEGER NOT NULL DEFAULT 0,
    "statut" VARCHAR(30) NOT NULL DEFAULT 'Brouillon',
    "cree_par_id" INTEGER NOT NULL,
    "valide_par_id" INTEGER,
    "date_creation" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_emission" TIMESTAMPTZ,
    "date_transmission_budget" TIMESTAMPTZ,
    "date_validation_chef_comptable" TIMESTAMPTZ,
    "validateur_chef_comptable_id" INTEGER,
    "date_approbation_directeur_financier" TIMESTAMPTZ,
    "approbateur_directeur_financier_id" INTEGER,
    "motif_rejet" TEXT,
    "date_rejet" TIMESTAMPTZ,
    "date_paiement" TIMESTAMPTZ,

    CONSTRAINT "ordre_paiement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "synthese_op_reference_key" ON "synthese_op"("reference");

-- CreateIndex
CREATE INDEX "synthese_op_type_flux_id_idx" ON "synthese_op"("type_flux_id");

-- CreateIndex
CREATE INDEX "synthese_op_statut_idx" ON "synthese_op"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "ordre_paiement_code_op_key" ON "ordre_paiement"("code_op");

-- CreateIndex
CREATE INDEX "ordre_paiement_synthese_id_idx" ON "ordre_paiement"("synthese_id");

-- CreateIndex
CREATE INDEX "ordre_paiement_code_op_idx" ON "ordre_paiement"("code_op");

-- CreateIndex
CREATE INDEX "ordre_paiement_antenne_id_idx" ON "ordre_paiement"("antenne_id");

-- CreateIndex
CREATE INDEX "ordre_paiement_niveau_id_idx" ON "ordre_paiement"("niveau_id");

-- CreateIndex
CREATE INDEX "ordre_paiement_type_recette_id_idx" ON "ordre_paiement"("type_recette_id");

-- CreateIndex
CREATE INDEX "ordre_paiement_statut_idx" ON "ordre_paiement"("statut");

-- AddForeignKey
ALTER TABLE "ordre_paiement" ADD CONSTRAINT "ordre_paiement_synthese_id_fkey" FOREIGN KEY ("synthese_id") REFERENCES "synthese_op"("id") ON DELETE CASCADE ON UPDATE CASCADE;

