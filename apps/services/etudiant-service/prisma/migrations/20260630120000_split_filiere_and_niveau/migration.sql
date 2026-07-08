-- Rename old filiere to niveau and create new filiere table linked to niveau

-- 1. Rename old filiere table to niveau
ALTER TABLE "filiere" RENAME TO "niveau";
ALTER TABLE "niveau" RENAME CONSTRAINT "filiere_pkey" TO "niveau_pkey";
ALTER INDEX "filiere_code_key" RENAME TO "niveau_code_key";

-- 2. Rename columns in reference tables
ALTER TABLE "etudiant" RENAME COLUMN "filiere_id" TO "niveau_id";
ALTER TABLE "etudiant" RENAME CONSTRAINT "etudiant_filiere_id_fkey" TO "etudiant_niveau_id_fkey";
ALTER INDEX "etudiant_filiere_id_idx" RENAME TO "etudiant_niveau_id_idx";

ALTER TABLE "nomenclature_produit" RENAME COLUMN "filiere_id" TO "niveau_id";
ALTER TABLE "nomenclature_produit" RENAME CONSTRAINT "nomenclature_produit_filiere_id_fkey" TO "nomenclature_produit_niveau_id_fkey";
ALTER INDEX "nomenclature_produit_filiere_id_idx" RENAME TO "nomenclature_produit_niveau_id_idx";

-- 3. Create the new filiere table
CREATE TABLE "filiere" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "libelle" VARCHAR(60) NOT NULL,

    CONSTRAINT "filiere_pkey" PRIMARY KEY ("id")
);

-- 4. Create unique index for new filiere table
CREATE UNIQUE INDEX "filiere_code_key" ON "filiere"("code");

-- 5. Insert default filiere
INSERT INTO "filiere" ("code", "libelle") VALUES ('INFAS', 'Institut de Formation aux Agents de Santé');

-- 6. Add relation to niveau
ALTER TABLE "niveau" ADD COLUMN "filiere_id" INTEGER;
UPDATE "niveau" SET "filiere_id" = (SELECT "id" FROM "filiere" WHERE "code" = 'INFAS');

ALTER TABLE "niveau" ADD CONSTRAINT "niveau_filiere_id_fkey" FOREIGN KEY ("filiere_id") REFERENCES "filiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "niveau_filiere_id_idx" ON "niveau"("filiere_id");
