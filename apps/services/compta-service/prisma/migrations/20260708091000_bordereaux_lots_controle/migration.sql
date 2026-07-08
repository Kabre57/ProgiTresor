CREATE TABLE IF NOT EXISTS "ligne_budgetaire" (
  "id" SERIAL NOT NULL,
  "code" VARCHAR(100) NOT NULL,
  "libelle" VARCHAR(255) NOT NULL,
  "annee_budgetaire" INTEGER NOT NULL,
  "montant_alloue" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "montant_utilise" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "date_creation" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "date_mise_a_jour" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ligne_budgetaire_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "bordereau" (
  "id" SERIAL NOT NULL,
  "reference" VARCHAR(80) NOT NULL,
  "source_service" VARCHAR(80) NOT NULL DEFAULT 'order-service',
  "statut" VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
  "annee_budgetaire" INTEGER NOT NULL,
  "utilisateur_transmission" VARCHAR(120),
  "utilisateur_traitement" VARCHAR(120),
  "montant_total" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "nombre_ot" INTEGER NOT NULL DEFAULT 0,
  "nombre_ecritures" INTEGER NOT NULL DEFAULT 0,
  "date_reception" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "date_traitement" TIMESTAMPTZ,
  "remarques" TEXT,
  "date_mise_a_jour" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bordereau_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ecriture_budgetaire" (
  "id" SERIAL NOT NULL,
  "bordereau_id" INTEGER NOT NULL,
  "ordre_traitement_id" INTEGER,
  "code_ot" VARCHAR(40) NOT NULL,
  "transaction_id" BIGINT,
  "ref_tresor" VARCHAR(60),
  "produit_libelle_brut" VARCHAR(255) NOT NULL,
  "type_recette_id" INTEGER,
  "type_recette_libelle" VARCHAR(120),
  "antenne_id" INTEGER,
  "montant" DECIMAL(18, 2) NOT NULL,
  "date_flux" TIMESTAMPTZ NOT NULL,
  "matricule_etudiant" VARCHAR(80),
  "details_complementaires" JSONB,
  "statut" VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
  "date_creation" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "date_mise_a_jour" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ecriture_budgetaire_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lot_traitement" (
  "id" SERIAL NOT NULL,
  "bordereau_id" INTEGER NOT NULL,
  "reference" VARCHAR(80) NOT NULL,
  "statut" VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
  "date_debut_flux" TIMESTAMPTZ,
  "date_fin_flux" TIMESTAMPTZ,
  "type_recette_id" INTEGER,
  "antenne_id" INTEGER,
  "montant_total" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "nombre_ecritures" INTEGER NOT NULL DEFAULT 0,
  "date_creation" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "date_traitement" TIMESTAMPTZ,
  "date_transmission_budget" TIMESTAMPTZ,
  "date_mise_a_jour" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lot_traitement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lot_traitement_ecriture" (
  "lot_traitement_id" INTEGER NOT NULL,
  "ecriture_budgetaire_id" INTEGER NOT NULL,
  CONSTRAINT "lot_traitement_ecriture_pkey" PRIMARY KEY ("lot_traitement_id", "ecriture_budgetaire_id")
);

CREATE TABLE IF NOT EXISTS "imputation_budgetaire" (
  "id" SERIAL NOT NULL,
  "ecriture_budgetaire_id" INTEGER NOT NULL,
  "ligne_budgetaire_id" INTEGER NOT NULL,
  "montant_impute" DECIMAL(18, 2) NOT NULL,
  "utilisateur_imputation" VARCHAR(120),
  "remarques" TEXT,
  "date_imputation" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "date_creation" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "imputation_budgetaire_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "controle_op_ot" (
  "id" SERIAL NOT NULL,
  "ordre_paiement_id" VARCHAR(80) NOT NULL,
  "reference_op" VARCHAR(40) NOT NULL,
  "bordereau_id" INTEGER NOT NULL,
  "lot_traitement_id" INTEGER NOT NULL,
  "montant_ot" DECIMAL(18, 2) NOT NULL,
  "montant_op" DECIMAL(18, 2) NOT NULL,
  "nombre_lignes_ot" INTEGER NOT NULL,
  "nombre_lignes_op" INTEGER NOT NULL,
  "ecart" DECIMAL(18, 2) NOT NULL,
  "statut_controle" VARCHAR(30) NOT NULL DEFAULT 'A_CONTROLER',
  "date_controle" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "controle_op_ot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ligne_budgetaire_code_annee_budgetaire_key"
  ON "ligne_budgetaire"("code", "annee_budgetaire");
CREATE INDEX IF NOT EXISTS "ligne_budgetaire_annee_budgetaire_idx"
  ON "ligne_budgetaire"("annee_budgetaire");
CREATE UNIQUE INDEX IF NOT EXISTS "bordereau_reference_key" ON "bordereau"("reference");
CREATE INDEX IF NOT EXISTS "bordereau_statut_date_reception_idx" ON "bordereau"("statut", "date_reception");
CREATE INDEX IF NOT EXISTS "bordereau_annee_budgetaire_idx" ON "bordereau"("annee_budgetaire");
CREATE UNIQUE INDEX IF NOT EXISTS "ecriture_budgetaire_bordereau_id_transaction_id_key"
  ON "ecriture_budgetaire"("bordereau_id", "transaction_id");
CREATE INDEX IF NOT EXISTS "ecriture_budgetaire_bordereau_id_idx" ON "ecriture_budgetaire"("bordereau_id");
CREATE INDEX IF NOT EXISTS "ecriture_budgetaire_code_ot_idx" ON "ecriture_budgetaire"("code_ot");
CREATE INDEX IF NOT EXISTS "ecriture_budgetaire_transaction_id_idx" ON "ecriture_budgetaire"("transaction_id");
CREATE INDEX IF NOT EXISTS "ecriture_budgetaire_date_flux_idx" ON "ecriture_budgetaire"("date_flux");
CREATE INDEX IF NOT EXISTS "ecriture_budgetaire_statut_idx" ON "ecriture_budgetaire"("statut");
CREATE UNIQUE INDEX IF NOT EXISTS "lot_traitement_reference_key" ON "lot_traitement"("reference");
CREATE INDEX IF NOT EXISTS "lot_traitement_bordereau_id_idx" ON "lot_traitement"("bordereau_id");
CREATE INDEX IF NOT EXISTS "lot_traitement_statut_date_creation_idx" ON "lot_traitement"("statut", "date_creation");
CREATE INDEX IF NOT EXISTS "lot_traitement_ecriture_ecriture_budgetaire_id_idx"
  ON "lot_traitement_ecriture"("ecriture_budgetaire_id");
CREATE INDEX IF NOT EXISTS "imputation_budgetaire_ecriture_budgetaire_id_idx"
  ON "imputation_budgetaire"("ecriture_budgetaire_id");
CREATE INDEX IF NOT EXISTS "imputation_budgetaire_ligne_budgetaire_id_idx"
  ON "imputation_budgetaire"("ligne_budgetaire_id");
CREATE UNIQUE INDEX IF NOT EXISTS "controle_op_ot_ordre_paiement_id_lot_traitement_id_key"
  ON "controle_op_ot"("ordre_paiement_id", "lot_traitement_id");
CREATE INDEX IF NOT EXISTS "controle_op_ot_bordereau_id_idx" ON "controle_op_ot"("bordereau_id");
CREATE INDEX IF NOT EXISTS "controle_op_ot_lot_traitement_id_idx" ON "controle_op_ot"("lot_traitement_id");
CREATE INDEX IF NOT EXISTS "controle_op_ot_statut_controle_idx" ON "controle_op_ot"("statut_controle");

ALTER TABLE "ecriture_budgetaire" ADD CONSTRAINT "ecriture_budgetaire_bordereau_id_fkey"
  FOREIGN KEY ("bordereau_id") REFERENCES "bordereau"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lot_traitement" ADD CONSTRAINT "lot_traitement_bordereau_id_fkey"
  FOREIGN KEY ("bordereau_id") REFERENCES "bordereau"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lot_traitement_ecriture" ADD CONSTRAINT "lot_traitement_ecriture_lot_traitement_id_fkey"
  FOREIGN KEY ("lot_traitement_id") REFERENCES "lot_traitement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lot_traitement_ecriture" ADD CONSTRAINT "lot_traitement_ecriture_ecriture_budgetaire_id_fkey"
  FOREIGN KEY ("ecriture_budgetaire_id") REFERENCES "ecriture_budgetaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "imputation_budgetaire" ADD CONSTRAINT "imputation_budgetaire_ecriture_budgetaire_id_fkey"
  FOREIGN KEY ("ecriture_budgetaire_id") REFERENCES "ecriture_budgetaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "imputation_budgetaire" ADD CONSTRAINT "imputation_budgetaire_ligne_budgetaire_id_fkey"
  FOREIGN KEY ("ligne_budgetaire_id") REFERENCES "ligne_budgetaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "controle_op_ot" ADD CONSTRAINT "controle_op_ot_bordereau_id_fkey"
  FOREIGN KEY ("bordereau_id") REFERENCES "bordereau"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "controle_op_ot" ADD CONSTRAINT "controle_op_ot_lot_traitement_id_fkey"
  FOREIGN KEY ("lot_traitement_id") REFERENCES "lot_traitement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
