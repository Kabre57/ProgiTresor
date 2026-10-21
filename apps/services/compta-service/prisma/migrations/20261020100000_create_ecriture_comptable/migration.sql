-- Cette table existait dans le schéma Prisma mais manquait dans l'historique
-- des migrations. CREATE TABLE IF NOT EXISTS préserve les installations
-- historiques auxquelles la migration précédente a déjà appliqué le renommage.
CREATE TABLE IF NOT EXISTS "ecriture_comptable" (
  "id" TEXT NOT NULL,
  "code_ot" VARCHAR(50) NOT NULL,
  "date_ecriture" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "compte_debit" VARCHAR(10) NOT NULL,
  "compte_credit" VARCHAR(10) NOT NULL,
  "montant" DECIMAL(15, 2) NOT NULL,
  "libelle" VARCHAR(200) NOT NULL,
  "statut" VARCHAR(20) NOT NULL DEFAULT 'BROUILLON',
  "justification" TEXT,
  "date_creation" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "date_validation" TIMESTAMPTZ,
  CONSTRAINT "ecriture_comptable_pkey" PRIMARY KEY ("id")
);
