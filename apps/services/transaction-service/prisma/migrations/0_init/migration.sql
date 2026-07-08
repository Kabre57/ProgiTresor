-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "import_fichier" (
    "id" SERIAL NOT NULL,
    "nom_fichier" VARCHAR(255) NOT NULL,
    "type_fichier" VARCHAR(10) NOT NULL,
    "auteur_id" INTEGER NOT NULL,
    "date_import" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periode_debut" DATE,
    "periode_fin" DATE,
    "nb_lignes_lues" INTEGER,
    "nb_lignes_traitees" INTEGER,
    "nb_erreurs" INTEGER,
    "statut" VARCHAR(20) NOT NULL DEFAULT 'TERMINE',
    "logs_erreurs" TEXT,

    CONSTRAINT "import_fichier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" BIGSERIAL NOT NULL,
    "ref_tresor" VARCHAR(40) NOT NULL,
    "date_heure" TIMESTAMPTZ NOT NULL,
    "montant" BIGINT NOT NULL,
    "etudiant_id" INTEGER,
    "antenne_id" INTEGER,
    "nomenclature_id" INTEGER,
    "type_flux_id" INTEGER,
    "import_id" INTEGER NOT NULL,
    "ordre_paiement_id" INTEGER,
    "mois" VARCHAR(15),
    "nom_payeur_brut" VARCHAR(200),
    "libelle_produit_brut" VARCHAR(200),
    "statut_traitement" VARCHAR(20) NOT NULL DEFAULT 'IMPORTE',
    "gele" BOOLEAN NOT NULL DEFAULT false,
    "date_creation" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordre_paiement_miroir" (
    "id" INTEGER NOT NULL,
    "code_op" VARCHAR(30) NOT NULL,
    "statut" VARCHAR(20) NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ordre_paiement_miroir_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_ref_tresor_key" ON "transaction"("ref_tresor");

-- CreateIndex
CREATE INDEX "transaction_import_id_idx" ON "transaction"("import_id");

-- CreateIndex
CREATE INDEX "transaction_ref_tresor_idx" ON "transaction"("ref_tresor");

-- CreateIndex
CREATE INDEX "transaction_date_heure_idx" ON "transaction"("date_heure");

-- CreateIndex
CREATE INDEX "transaction_statut_traitement_idx" ON "transaction"("statut_traitement");

-- CreateIndex
CREATE INDEX "transaction_ordre_paiement_id_idx" ON "transaction"("ordre_paiement_id");

-- CreateIndex
CREATE INDEX "transaction_etudiant_id_idx" ON "transaction"("etudiant_id");

-- CreateIndex
CREATE INDEX "transaction_antenne_id_idx" ON "transaction"("antenne_id");

-- CreateIndex
CREATE UNIQUE INDEX "ordre_paiement_miroir_code_op_key" ON "ordre_paiement_miroir"("code_op");

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "import_fichier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

