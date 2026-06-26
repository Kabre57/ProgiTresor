"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionPaginationSchema = exports.UnlinkOpSchema = exports.LinkOpSchema = exports.OpStatusSchema = exports.ImportPayloadSchema = exports.TransactionItemSchema = void 0;
const zod_1 = require("zod");
// ============================================================
// Schémas de validation Zod – Transaction Service
// ============================================================
/**
 * Schéma d'un item de transaction pour l'import.
 */
const preprocessNumber = (val) => {
    if (val === null || val === undefined || val === '')
        return null;
    if (typeof val === 'string') {
        const cleaned = val.trim();
        if (cleaned === '' || cleaned === '0' || cleaned === 'null' || cleaned === 'undefined')
            return null;
        const num = Number(cleaned);
        return isNaN(num) ? val : num;
    }
    if (typeof val === 'number') {
        if (val === 0)
            return null;
        return val;
    }
    return val;
};
exports.TransactionItemSchema = zod_1.z.object({
    refTresor: zod_1.z.string().trim().min(1, 'Reference is required'),
    montant: zod_1.z.preprocess((val) => typeof val === 'string' ? Number(val) : val, zod_1.z.number().int().positive('Montant must be positive')),
    dateHeure: zod_1.z.coerce.date(),
    etudiantId: zod_1.z.preprocess(preprocessNumber, zod_1.z.number().int().positive().optional().nullable()),
    antenneId: zod_1.z.preprocess(preprocessNumber, zod_1.z.number().int().positive().optional().nullable()),
    nomenclatureId: zod_1.z.preprocess(preprocessNumber, zod_1.z.number().int().positive().optional().nullable()),
    typeFluxId: zod_1.z.preprocess(preprocessNumber, zod_1.z.number().int().positive().optional().nullable()),
    mois: zod_1.z.string().trim().min(1).optional().nullable(),
    nomPayeurBrut: zod_1.z.string().trim().min(1).optional().nullable(),
    libelleProduitBrut: zod_1.z.string().trim().min(1).optional().nullable(),
    ordrePaiementId: zod_1.z.preprocess(preprocessNumber, zod_1.z.number().int().positive().optional().nullable()),
    etudiantMatricule: zod_1.z.string().trim().optional().nullable(),
    matriculeTresorPay: zod_1.z.string().trim().optional().nullable(),
});
/**
 * Schéma du payload d'import (tableau de transactions).
 */
exports.ImportPayloadSchema = zod_1.z.object({
    nomFichier: zod_1.z.string().trim().min(1),
    typeFichier: zod_1.z.enum(['XLSX', 'CSV', 'PDF', 'JSON']),
    auteurId: zod_1.z.number().int().positive(),
    periodeDebut: zod_1.z.coerce.date().optional().nullable(),
    periodeFin: zod_1.z.coerce.date().optional().nullable(),
    items: zod_1.z.array(exports.TransactionItemSchema).min(1),
});
/**
 * Schéma pour la synchronisation du statut OP.
 */
exports.OpStatusSchema = zod_1.z.object({
    ordrePaiementId: zod_1.z.number().int().positive(),
    codeOp: zod_1.z.string().trim().min(1, 'Code OP is required'),
    statut: zod_1.z.enum(['Brouillon', 'Transmis', 'Validé', 'Approuvé', 'Rejeté', 'Payé']),
});
/**
 * Schéma pour lier des transactions à un OP.
 */
exports.LinkOpSchema = zod_1.z.object({
    ordrePaiementId: zod_1.z.number().int().positive(),
    codeOp: zod_1.z.string().min(1, 'Code OP is required'),
    transactionIds: zod_1.z.array(zod_1.z.number().int().positive()).min(1, 'At least one transaction ID is required'),
});
/**
 * Schéma pour délier des transactions d'un OP.
 */
exports.UnlinkOpSchema = zod_1.z.object({
    ordrePaiementId: zod_1.z.number().int().positive(),
});
/**
 * Schéma de pagination (limit/offset).
 */
exports.TransactionPaginationSchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().positive().max(200).default(50),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
