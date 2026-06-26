-- AlterTable
ALTER TABLE "etudiant" ADD COLUMN     "promotion" VARCHAR(10),
ADD COLUMN     "promotion_id" INTEGER;

-- CreateTable
CREATE TABLE "promotion" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(50) NOT NULL,
    "ordre" SMALLINT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "promotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promotion_nom_key" ON "promotion"("nom");

-- CreateIndex
CREATE INDEX "etudiant_promotion_idx" ON "etudiant"("promotion");

-- CreateIndex
CREATE INDEX "etudiant_promotion_id_idx" ON "etudiant"("promotion_id");

-- AddForeignKey
ALTER TABLE "etudiant" ADD CONSTRAINT "etudiant_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
