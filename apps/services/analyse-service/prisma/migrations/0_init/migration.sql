CREATE TABLE IF NOT EXISTS "analyse_archive" (
  "id" SERIAL NOT NULL,
  "reference" VARCHAR(60) NOT NULL,
  "pdf_url" VARCHAR(500),
  "created_by_id" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "analyse_archive_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "analyse_archive_reference_key"
  ON "analyse_archive"("reference");
