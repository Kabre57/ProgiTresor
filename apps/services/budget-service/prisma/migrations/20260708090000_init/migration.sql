CREATE TABLE IF NOT EXISTS "ordre_paiement" (
  "id" TEXT NOT NULL,
  "reference_op" VARCHAR(40) NOT NULL,
  "source_bordereau_id" INTEGER NOT NULL,
  "source_lot_traitement_id" INTEGER NOT NULL,
  "reference_lot" VARCHAR(60) NOT NULL,
  "montant_total" DECIMAL(18, 2) NOT NULL,
  "nombre_lignes" INTEGER NOT NULL,
  "statut" VARCHAR(30) NOT NULL DEFAULT 'BROUILLON',
  "utilisateur_creation" VARCHAR(120),
  "utilisateur_transmission" VARCHAR(120),
  "date_creation" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "date_transmission_compta" TIMESTAMPTZ,
  "date_mise_a_jour" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "ordre_paiement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ordre_paiement_ligne" (
  "id" SERIAL NOT NULL,
  "ordre_paiement_id" TEXT NOT NULL,
  "source_ecriture_id" INTEGER NOT NULL,
  "code_ot" VARCHAR(40) NOT NULL,
  "ref_tresor" VARCHAR(60),
  "produit_libelle_brut" VARCHAR(255) NOT NULL,
  "type_recette_id" INTEGER,
  "type_recette_libelle" VARCHAR(120),
  "montant" DECIMAL(18, 2) NOT NULL,
  "matricule_etudiant" VARCHAR(80),
  "date_flux" TIMESTAMPTZ NOT NULL,
  "date_creation" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ordre_paiement_ligne_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "historique_ordre_paiement" (
  "id" SERIAL NOT NULL,
  "ordre_paiement_id" TEXT NOT NULL,
  "statut" VARCHAR(30) NOT NULL,
  "commentaire" TEXT,
  "utilisateur" VARCHAR(120),
  "date_creation" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "historique_ordre_paiement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ordre_paiement_reference_op_key"
  ON "ordre_paiement"("reference_op");
CREATE UNIQUE INDEX IF NOT EXISTS "ordre_paiement_source_lot_traitement_id_key"
  ON "ordre_paiement"("source_lot_traitement_id");
CREATE INDEX IF NOT EXISTS "ordre_paiement_statut_date_creation_idx"
  ON "ordre_paiement"("statut", "date_creation");
CREATE INDEX IF NOT EXISTS "ordre_paiement_source_bordereau_id_idx"
  ON "ordre_paiement"("source_bordereau_id");

CREATE UNIQUE INDEX IF NOT EXISTS "ordre_paiement_ligne_ordre_paiement_id_source_ecriture_id_key"
  ON "ordre_paiement_ligne"("ordre_paiement_id", "source_ecriture_id");
CREATE INDEX IF NOT EXISTS "ordre_paiement_ligne_code_ot_idx"
  ON "ordre_paiement_ligne"("code_ot");
CREATE INDEX IF NOT EXISTS "ordre_paiement_ligne_source_ecriture_id_idx"
  ON "ordre_paiement_ligne"("source_ecriture_id");

CREATE INDEX IF NOT EXISTS "historique_ordre_paiement_ordre_paiement_id_date_creation_idx"
  ON "historique_ordre_paiement"("ordre_paiement_id", "date_creation");

ALTER TABLE "ordre_paiement_ligne"
  ADD CONSTRAINT "ordre_paiement_ligne_ordre_paiement_id_fkey"
  FOREIGN KEY ("ordre_paiement_id") REFERENCES "ordre_paiement"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "historique_ordre_paiement"
  ADD CONSTRAINT "historique_ordre_paiement_ordre_paiement_id_fkey"
  FOREIGN KEY ("ordre_paiement_id") REFERENCES "ordre_paiement"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
