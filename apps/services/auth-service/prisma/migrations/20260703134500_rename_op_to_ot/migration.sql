UPDATE "permission"
SET "code" = 'VALIDER_OT',
    "libelle" = 'Valider des ordres de traitement'
WHERE "code" = 'VALIDER_OP';

UPDATE "permission"
SET "code" = 'APPROUVER_OT',
    "libelle" = 'Approuver des ordres de traitement'
WHERE "code" = 'APPROUVER_OP';

UPDATE "permission"
SET "code" = 'EMETTRE_OT',
    "libelle" = 'Emettre des ordres de traitement'
WHERE "code" = 'EMETTRE_OP';

UPDATE "permission"
SET "libelle" = 'Generer des syntheses OT'
WHERE "code" = 'GENERER_SYNTHESE';

UPDATE "role"
SET "description" = REPLACE("description", 'OP', 'OT')
WHERE "description" LIKE '%OP%';

UPDATE "perimeter"
SET "id" = 'OT',
    "libelle" = 'Ordres de Traitement'
WHERE "id" = 'OP';

UPDATE "perimeter"
SET "libelle" = 'Ordres de Traitement'
WHERE "id" = 'OT';
