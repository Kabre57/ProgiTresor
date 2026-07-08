ALTER TABLE "utilisateur"
  ADD COLUMN IF NOT EXISTS "token_version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS "perimeter" (
  "id" VARCHAR(30) NOT NULL,
  "libelle" VARCHAR(60) NOT NULL,
  CONSTRAINT "perimeter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "perimeter_level" (
  "id" SERIAL NOT NULL,
  "perimeter_id" VARCHAR(30) NOT NULL,
  "level" INTEGER NOT NULL,
  "libelle" VARCHAR(60) NOT NULL,
  CONSTRAINT "perimeter_level_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_perimeter_level" (
  "user_id" INTEGER NOT NULL,
  "perimeter_level_id" INTEGER NOT NULL,
  CONSTRAINT "user_perimeter_level_pkey" PRIMARY KEY ("user_id", "perimeter_level_id")
);

CREATE TABLE IF NOT EXISTS "permission_exclusion" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "perimeter_id" VARCHAR(30) NOT NULL,
  "action" VARCHAR(100) NOT NULL,
  CONSTRAINT "permission_exclusion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "perimeter_level_perimeter_id_level_key"
  ON "perimeter_level"("perimeter_id", "level");

CREATE UNIQUE INDEX IF NOT EXISTS "permission_exclusion_user_id_perimeter_id_action_key"
  ON "permission_exclusion"("user_id", "perimeter_id", "action");

CREATE INDEX IF NOT EXISTS "permission_exclusion_user_id_idx"
  ON "permission_exclusion"("user_id");

CREATE INDEX IF NOT EXISTS "permission_exclusion_perimeter_id_idx"
  ON "permission_exclusion"("perimeter_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'perimeter_level_perimeter_id_fkey') THEN
    ALTER TABLE "perimeter_level"
      ADD CONSTRAINT "perimeter_level_perimeter_id_fkey"
      FOREIGN KEY ("perimeter_id") REFERENCES "perimeter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_perimeter_level_user_id_fkey') THEN
    ALTER TABLE "user_perimeter_level"
      ADD CONSTRAINT "user_perimeter_level_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_perimeter_level_perimeter_level_id_fkey') THEN
    ALTER TABLE "user_perimeter_level"
      ADD CONSTRAINT "user_perimeter_level_perimeter_level_id_fkey"
      FOREIGN KEY ("perimeter_level_id") REFERENCES "perimeter_level"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'permission_exclusion_user_id_fkey') THEN
    ALTER TABLE "permission_exclusion"
      ADD CONSTRAINT "permission_exclusion_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'permission_exclusion_perimeter_id_fkey') THEN
    ALTER TABLE "permission_exclusion"
      ADD CONSTRAINT "permission_exclusion_perimeter_id_fkey"
      FOREIGN KEY ("perimeter_id") REFERENCES "perimeter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "perimeter" ("id", "libelle") VALUES
  ('IMPORT', 'Importation'),
  ('ANALYSE', 'Analyse et syntheses'),
  ('OP', 'Ordres de Paiement'),
  ('DASHBOARD', 'Tableau de Bord'),
  ('ADMIN', 'Administration')
ON CONFLICT ("id") DO UPDATE SET "libelle" = EXCLUDED."libelle";

INSERT INTO "perimeter_level" ("perimeter_id", "level", "libelle")
SELECT p."id", l."level", l."libelle"
FROM "perimeter" p
CROSS JOIN (
  VALUES
    (0, 'Aucun acces'),
    (1, 'Lecture'),
    (2, 'Ecriture/Creation'),
    (3, 'Validation'),
    (4, 'Approbation/Suppression')
) AS l("level", "libelle")
WHERE p."id" IN ('IMPORT', 'ANALYSE', 'OP', 'DASHBOARD', 'ADMIN')
ON CONFLICT ("perimeter_id", "level") DO UPDATE SET "libelle" = EXCLUDED."libelle";

DELETE FROM "user_perimeter_level" upl
USING "utilisateur" u, "role" r, "perimeter_level" pl
WHERE upl."user_id" = u."id"
  AND u."role_id" = r."id"
  AND upl."perimeter_level_id" = pl."id"
  AND r."code" IN ('ADMIN', 'COMPTABLE', 'BUDGET', 'CHEF_COMPTABLE', 'DF', 'CONSULTANT')
  AND pl."perimeter_id" IN ('IMPORT', 'ANALYSE', 'OP', 'DASHBOARD', 'ADMIN');

WITH matrix(role_code, perimeter_id, level) AS (
  VALUES
    ('ADMIN', 'IMPORT', 4),
    ('ADMIN', 'ANALYSE', 4),
    ('ADMIN', 'OP', 4),
    ('ADMIN', 'DASHBOARD', 4),
    ('ADMIN', 'ADMIN', 4),
    ('COMPTABLE', 'IMPORT', 3),
    ('COMPTABLE', 'ANALYSE', 2),
    ('COMPTABLE', 'OP', 0),
    ('COMPTABLE', 'DASHBOARD', 2),
    ('BUDGET', 'IMPORT', 1),
    ('BUDGET', 'ANALYSE', 1),
    ('BUDGET', 'OP', 3),
    ('BUDGET', 'DASHBOARD', 3),
    ('CHEF_COMPTABLE', 'IMPORT', 2),
    ('CHEF_COMPTABLE', 'ANALYSE', 3),
    ('CHEF_COMPTABLE', 'OP', 2),
    ('CHEF_COMPTABLE', 'DASHBOARD', 3),
    ('DF', 'IMPORT', 1),
    ('DF', 'ANALYSE', 4),
    ('DF', 'OP', 4),
    ('DF', 'DASHBOARD', 4),
    ('DF', 'ADMIN', 1),
    ('CONSULTANT', 'IMPORT', 1),
    ('CONSULTANT', 'ANALYSE', 1),
    ('CONSULTANT', 'OP', 0),
    ('CONSULTANT', 'DASHBOARD', 1)
)
INSERT INTO "user_perimeter_level" ("user_id", "perimeter_level_id")
SELECT u."id", pl."id"
FROM "utilisateur" u
JOIN "role" r ON r."id" = u."role_id"
JOIN matrix m ON m.role_code = r."code"
JOIN "perimeter_level" pl ON pl."perimeter_id" = m.perimeter_id AND pl."level" = m.level
ON CONFLICT DO NOTHING;

UPDATE "utilisateur" u
SET "token_version" = "token_version" + 1
FROM "role" r
WHERE r."id" = u."role_id"
  AND r."code" IN ('ADMIN', 'COMPTABLE', 'BUDGET', 'CHEF_COMPTABLE', 'DF', 'CONSULTANT');

DELETE FROM "role_permission" rp
USING "role" r, "permission" p
WHERE rp."role_id" = r."id"
  AND rp."permission_id" = p."id"
  AND r."code" = 'COMPTABLE'
  AND p."code" = 'EMETTRE_OP';
