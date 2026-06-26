"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompteComptableUpdateSchema = exports.CompteComptableCreateSchema = exports.ComptaPaginationSchema = exports.EcritureFromOrderSchema = exports.EcritureCreateSchema = void 0;
const zod_1 = require("zod");
exports.EcritureCreateSchema = zod_1.z.object({
    ordre_paiement_id: zod_1.z.number().int().positive(),
    compte_debit: zod_1.z.string().trim().min(1),
    compte_credit: zod_1.z.string().trim().min(1),
    montant: zod_1.z.number().int().positive(),
    libelle: zod_1.z.string().trim().min(1),
    date_ecriture: zod_1.z.coerce.date().optional(),
});
exports.EcritureFromOrderSchema = zod_1.z.object({
    codeOp: zod_1.z.string().trim().min(1),
    ordrePaiementId: zod_1.z.number().int().positive(),
    montant: zod_1.z.number().int().positive(),
    typeRecette: zod_1.z.string().trim().min(1),
    libelle: zod_1.z.string().trim().min(1).optional(),
});
exports.ComptaPaginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(10000).default(20),
});
// ============================================================
// Schémas de validation – CompteComptable CRUD
// ============================================================
exports.CompteComptableCreateSchema = zod_1.z.object({
    numero: zod_1.z.string().trim().min(1, 'Numéro is required').max(10),
    libelle: zod_1.z.string().trim().min(1, 'Libellé is required').max(120),
    classe: zod_1.z.number().int().min(1).max(9, 'Classe must be between 1 and 9'),
});
exports.CompteComptableUpdateSchema = zod_1.z.object({
    libelle: zod_1.z.string().trim().min(1).max(120).optional(),
    classe: zod_1.z.number().int().min(1).max(9).optional(),
});
