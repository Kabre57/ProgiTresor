-- Rename physical OT reference while preserving existing accounting entries.
ALTER TABLE IF EXISTS "ecriture_comptable" RENAME COLUMN "code_op" TO "code_ot";
