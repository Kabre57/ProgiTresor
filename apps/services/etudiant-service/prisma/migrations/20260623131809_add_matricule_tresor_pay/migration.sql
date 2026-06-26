-- CreateTable
CREATE TABLE "antenne" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "nom" VARCHAR(80) NOT NULL,
    "ville" VARCHAR(60) NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "antenne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "niveau" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "libelle" VARCHAR(60) NOT NULL,
    "cycle" VARCHAR(30) NOT NULL,
    "annee_etude" SMALLINT NOT NULL,

    CONSTRAINT "niveau_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statut_etudiant" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "libelle" VARCHAR(60) NOT NULL,

    CONSTRAINT "statut_etudiant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etudiant" (
    "id" SERIAL NOT NULL,
    "matricule" VARCHAR(30) NOT NULL,
    "nom" VARCHAR(75) NOT NULL,
    "prenom" VARCHAR(75) NOT NULL,
    "prefixe_matricule" VARCHAR(10),
    "antenne_id" INTEGER NOT NULL,
    "niveau_id" INTEGER NOT NULL,
    "statut_id" INTEGER NOT NULL,
    "date_creation" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matricule_tresor_pay" VARCHAR(50),
    "est_temporaire" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "etudiant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_etudiant_temporaire" (
    "id" SERIAL NOT NULL,
    "date_creation" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matricule_tresor_pay" VARCHAR(50) NOT NULL,
    "nom_payeur" VARCHAR(200) NOT NULL,
    "etudiant_temporaire_id" INTEGER NOT NULL,
    "traite" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notification_etudiant_temporaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "type_flux" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "libelle" VARCHAR(60) NOT NULL,

    CONSTRAINT "type_flux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "type_recette" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "libelle" VARCHAR(120) NOT NULL,
    "type_flux_id" INTEGER NOT NULL,

    CONSTRAINT "type_recette_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nomenclature_produit" (
    "id" SERIAL NOT NULL,
    "libelle_brut" VARCHAR(200) NOT NULL,
    "code_produit" VARCHAR(40) NOT NULL,
    "libelle_standard" VARCHAR(150) NOT NULL,
    "type_recette_id" INTEGER NOT NULL,
    "niveau_id" INTEGER,
    "statut_id" INTEGER,
    "num_versement" SMALLINT,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "nomenclature_produit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "antenne_code_key" ON "antenne"("code");

-- CreateIndex
CREATE UNIQUE INDEX "antenne_nom_key" ON "antenne"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "niveau_code_key" ON "niveau"("code");

-- CreateIndex
CREATE UNIQUE INDEX "statut_etudiant_code_key" ON "statut_etudiant"("code");

-- CreateIndex
CREATE UNIQUE INDEX "etudiant_matricule_key" ON "etudiant"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "etudiant_matricule_tresor_pay_key" ON "etudiant"("matricule_tresor_pay");

-- CreateIndex
CREATE INDEX "etudiant_antenne_id_idx" ON "etudiant"("antenne_id");

-- CreateIndex
CREATE INDEX "etudiant_niveau_id_idx" ON "etudiant"("niveau_id");

-- CreateIndex
CREATE INDEX "etudiant_statut_id_idx" ON "etudiant"("statut_id");

-- CreateIndex
CREATE INDEX "etudiant_nom_idx" ON "etudiant"("nom");

-- CreateIndex
CREATE INDEX "etudiant_prenom_idx" ON "etudiant"("prenom");

-- CreateIndex
CREATE INDEX "notification_etudiant_temporaire_etudiant_temporaire_id_idx" ON "notification_etudiant_temporaire"("etudiant_temporaire_id");

-- CreateIndex
CREATE UNIQUE INDEX "type_flux_code_key" ON "type_flux"("code");

-- CreateIndex
CREATE UNIQUE INDEX "type_recette_code_key" ON "type_recette"("code");

-- CreateIndex
CREATE INDEX "type_recette_type_flux_id_idx" ON "type_recette"("type_flux_id");

-- CreateIndex
CREATE UNIQUE INDEX "nomenclature_produit_libelle_brut_key" ON "nomenclature_produit"("libelle_brut");

-- CreateIndex
CREATE INDEX "nomenclature_produit_type_recette_id_idx" ON "nomenclature_produit"("type_recette_id");

-- CreateIndex
CREATE INDEX "nomenclature_produit_niveau_id_idx" ON "nomenclature_produit"("niveau_id");

-- CreateIndex
CREATE INDEX "nomenclature_produit_statut_id_idx" ON "nomenclature_produit"("statut_id");

-- AddForeignKey
ALTER TABLE "etudiant" ADD CONSTRAINT "etudiant_antenne_id_fkey" FOREIGN KEY ("antenne_id") REFERENCES "antenne"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etudiant" ADD CONSTRAINT "etudiant_niveau_id_fkey" FOREIGN KEY ("niveau_id") REFERENCES "niveau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etudiant" ADD CONSTRAINT "etudiant_statut_id_fkey" FOREIGN KEY ("statut_id") REFERENCES "statut_etudiant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_etudiant_temporaire" ADD CONSTRAINT "notification_etudiant_temporaire_etudiant_temporaire_id_fkey" FOREIGN KEY ("etudiant_temporaire_id") REFERENCES "etudiant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type_recette" ADD CONSTRAINT "type_recette_type_flux_id_fkey" FOREIGN KEY ("type_flux_id") REFERENCES "type_flux"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nomenclature_produit" ADD CONSTRAINT "nomenclature_produit_type_recette_id_fkey" FOREIGN KEY ("type_recette_id") REFERENCES "type_recette"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nomenclature_produit" ADD CONSTRAINT "nomenclature_produit_niveau_id_fkey" FOREIGN KEY ("niveau_id") REFERENCES "niveau"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nomenclature_produit" ADD CONSTRAINT "nomenclature_produit_statut_id_fkey" FOREIGN KEY ("statut_id") REFERENCES "statut_etudiant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
