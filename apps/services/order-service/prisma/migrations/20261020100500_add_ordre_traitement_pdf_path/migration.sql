-- pdf_path est encore référencé par le schéma Prisma et le service. La colonne
-- est ajoutée séparément afin que les nouvelles bases comme les bases existantes
-- soient cohérentes avec le schéma applicatif.
ALTER TABLE "ordre_traitement"
  ADD COLUMN IF NOT EXISTS "pdf_path" VARCHAR(255);
