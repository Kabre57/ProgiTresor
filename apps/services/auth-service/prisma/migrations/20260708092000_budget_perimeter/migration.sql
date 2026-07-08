INSERT INTO "permission" ("code", "libelle", "module")
VALUES ('GERER_BUDGET', 'Gerer les bordereaux et ordres de paiement', 'BUDGET')
ON CONFLICT ("code") DO UPDATE SET
  "libelle" = EXCLUDED."libelle",
  "module" = EXCLUDED."module";

INSERT INTO "perimeter" ("id", "libelle")
VALUES ('BUDGET', 'Traitement budgetaire')
ON CONFLICT ("id") DO UPDATE SET "libelle" = EXCLUDED."libelle";

INSERT INTO "perimeter_level" ("perimeter_id", "level", "libelle")
SELECT 'BUDGET', levels.level, levels.libelle
FROM (VALUES
  (1, 'Lecture'),
  (2, 'Écriture'),
  (3, 'Validation'),
  (4, 'Approbation')
) AS levels(level, libelle)
ON CONFLICT ("perimeter_id", "level") DO UPDATE SET "libelle" = EXCLUDED."libelle";

WITH matrix(role_code, level) AS (
  VALUES
    ('ADMIN', 4),
    ('COMPTABLE', 1),
    ('BUDGET', 3),
    ('CHEF_COMPTABLE', 2),
    ('DF', 4),
    ('CONSULTANT', 1)
)
INSERT INTO "user_perimeter_level" ("user_id", "perimeter_level_id")
SELECT u."id", pl."id"
FROM "utilisateur" u
JOIN "role" r ON r."id" = u."role_id"
JOIN matrix m ON m.role_code = r."code"
JOIN "perimeter_level" pl ON pl."perimeter_id" = 'BUDGET' AND pl."level" = m.level
ON CONFLICT DO NOTHING;
