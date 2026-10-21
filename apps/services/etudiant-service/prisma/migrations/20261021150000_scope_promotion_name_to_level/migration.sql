-- Un même nom de promotion peut être utilisé pour plusieurs niveaux.
-- Le schéma Prisma déclare déjà @@unique([nom, niveau]).
CREATE UNIQUE INDEX IF NOT EXISTS "promotion_nom_niveau_key" ON "promotion"("nom", "niveau");
DROP INDEX IF EXISTS "promotion_nom_key";
