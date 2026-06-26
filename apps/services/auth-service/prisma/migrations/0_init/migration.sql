-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "role" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "libelle" VARCHAR(60) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "libelle" VARCHAR(120) NOT NULL,
    "module" VARCHAR(40) NOT NULL,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "utilisateur" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "nom" VARCHAR(60) NOT NULL,
    "prenom" VARCHAR(60) NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "mot_de_passe_hash" VARCHAR(255) NOT NULL,
    "role_id" INTEGER NOT NULL,
    "service" VARCHAR(60),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "date_creation" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "derniere_connexion" TIMESTAMPTZ,

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_audit" (
    "id" BIGSERIAL NOT NULL,
    "utilisateur_id" INTEGER,
    "action" VARCHAR(40) NOT NULL,
    "entite" VARCHAR(100),
    "entite_id" VARCHAR(100),
    "date_heure" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adresse_ip" VARCHAR(45),
    "details" TEXT,

    CONSTRAINT "journal_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "utilisateur_id" INTEGER NOT NULL,
    "expire_at" TIMESTAMPTZ NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_code_key" ON "role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permission_code_key" ON "permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_username_key" ON "utilisateur"("username");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_email_key" ON "utilisateur"("email");

-- CreateIndex
CREATE INDEX "utilisateur_role_id_idx" ON "utilisateur"("role_id");

-- CreateIndex
CREATE INDEX "journal_audit_utilisateur_id_idx" ON "journal_audit"("utilisateur_id");

-- CreateIndex
CREATE INDEX "journal_audit_date_heure_idx" ON "journal_audit"("date_heure");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_key" ON "refresh_token"("token");

-- CreateIndex
CREATE INDEX "refresh_token_utilisateur_id_idx" ON "refresh_token"("utilisateur_id");

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilisateur" ADD CONSTRAINT "utilisateur_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_audit" ADD CONSTRAINT "journal_audit_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

