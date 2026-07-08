ALTER TABLE "ordre_paiement"
  ADD COLUMN IF NOT EXISTS "pdf_url" VARCHAR(500);

ALTER TABLE "ordre_paiement"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'ordre_paiement'
      AND column_name = 'pdf_path'
  ) THEN
    UPDATE "ordre_paiement"
    SET "pdf_url" = "pdf_path"
    WHERE "pdf_url" IS NULL
      AND "pdf_path" IS NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "outbox_message" (
  "id" SERIAL NOT NULL,
  "type" VARCHAR(80) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_attempt_at" TIMESTAMPTZ,
  CONSTRAINT "outbox_message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "outbox_message_status_created_at_idx"
  ON "outbox_message"("status", "created_at");
