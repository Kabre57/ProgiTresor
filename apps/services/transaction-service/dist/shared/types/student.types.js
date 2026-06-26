"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NomenclatureProduitUpdateSchema = exports.NomenclatureProduitCreateSchema = exports.TypeRecetteUpdateSchema = exports.TypeRecetteCreateSchema = exports.TypeFluxUpdateSchema = exports.TypeFluxCreateSchema = exports.StatutEtudiantUpdateSchema = exports.StatutEtudiantCreateSchema = exports.FiliereUpdateSchema = exports.FiliereCreateSchema = exports.AntenneUpdateSchema = exports.AntenneCreateSchema = exports.PromotionUpdateSchema = exports.PromotionCreateSchema = exports.PaginationSchema = exports.BatchLookupSchema = exports.StudentUpdateSchema = exports.StudentCreateSchema = void 0;
const zod_1 = require("zod");
// ============================================================
// Schémas de validation Zod – Student Service
// ============================================================
const normalizeFilierePayload = (value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return value;
    }
    const record = value;
    if (record.filiereId === undefined && record.niveauId !== undefined) {
        return { ...record, filiereId: record.niveauId };
    }
    return value;
};
/**
 * Schéma de création d'un étudiant.
 */
exports.StudentCreateSchema = zod_1.z.preprocess(normalizeFilierePayload, zod_1.z.object({
    matricule: zod_1.z.string()
        .trim()
        .min(1, 'Matricule is required')
        .transform((val) => val.toUpperCase()),
    nom: zod_1.z.string().trim().min(1, 'Nom is required'),
    prenom: zod_1.z.string().trim().min(1, 'Prénom is required'),
    prefixeMatricule: zod_1.z.string().trim().min(1).optional().nullable(),
    antenneId: zod_1.z.number().int().positive('antenneId must be a positive integer'),
    filiereId: zod_1.z.number().int().positive('filiereId must be a positive integer'),
    statutId: zod_1.z.number().int().positive('statutId must be a positive integer'),
    matriculeTresorPay: zod_1.z.string().trim().min(1, 'Matricule Trésor Pay is required'),
    promotion: zod_1.z.string().trim().optional().nullable(),
    promotionId: zod_1.z.number().int().positive('Promotion is required'),
    photoUrl: zod_1.z.string().trim().optional().nullable(),
}));
/**
 * Schéma de mise à jour d'un étudiant (tous les champs optionnels).
 */
exports.StudentUpdateSchema = zod_1.z.preprocess(normalizeFilierePayload, zod_1.z.object({
    nom: zod_1.z.string().trim().min(1).optional(),
    prenom: zod_1.z.string().trim().min(1).optional(),
    prefixeMatricule: zod_1.z.string().trim().min(1).nullable().optional(),
    antenneId: zod_1.z.number().int().positive().optional(),
    filiereId: zod_1.z.number().int().positive().optional(),
    statutId: zod_1.z.number().int().positive().optional(),
    matriculeTresorPay: zod_1.z.string().trim().min(1).optional(),
    promotion: zod_1.z.string().trim().optional().nullable(),
    promotionId: zod_1.z.number().int().positive().optional(),
    photoUrl: zod_1.z.string().trim().optional().nullable(),
}));
/**
 * Schéma pour le lookup batch de matricules.
 */
exports.BatchLookupSchema = zod_1.z.object({
    matricules: zod_1.z.array(zod_1.z.string().trim().transform((val) => val.toUpperCase())).min(1, 'At least one matricule is required')
        .max(1000, 'Maximum 1000 matricules per batch'),
});
/**
 * Schéma de pagination.
 */
exports.PaginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
});
// ============================================================
// Schémas de validation – Référentiels
// ============================================================
// --- Promotion ---
exports.PromotionCreateSchema = zod_1.z.object({
    nom: zod_1.z.string().trim().min(1, 'Nom is required').max(50),
    ordre: zod_1.z.number().int().positive('Ordre must be positive'),
    actif: zod_1.z.boolean().optional().default(true),
});
exports.PromotionUpdateSchema = exports.PromotionCreateSchema.partial();
// --- Antenne ---
exports.AntenneCreateSchema = zod_1.z.object({
    code: zod_1.z.string().trim().min(1, 'Code is required').max(10),
    nom: zod_1.z.string().trim().min(1, 'Nom is required').max(80),
    ville: zod_1.z.string().trim().min(1, 'Ville is required').max(60),
    actif: zod_1.z.boolean().optional().default(true),
});
exports.AntenneUpdateSchema = exports.AntenneCreateSchema.partial();
// --- Filiere ---
exports.FiliereCreateSchema = zod_1.z.object({
    code: zod_1.z.string().trim().min(1, 'Code is required').max(10),
    libelle: zod_1.z.string().trim().min(1, 'Libellé is required').max(60),
    cycle: zod_1.z.string().trim().min(1, 'Cycle is required').max(30),
    anneeEtude: zod_1.z.number().int().positive('Année must be positive'),
});
exports.FiliereUpdateSchema = exports.FiliereCreateSchema.partial();
// --- StatutEtudiant ---
exports.StatutEtudiantCreateSchema = zod_1.z.object({
    code: zod_1.z.string().trim().min(1, 'Code is required').max(20),
    libelle: zod_1.z.string().trim().min(1, 'Libellé is required').max(60),
});
exports.StatutEtudiantUpdateSchema = exports.StatutEtudiantCreateSchema.partial();
// --- TypeFlux ---
exports.TypeFluxCreateSchema = zod_1.z.object({
    code: zod_1.z.string().trim().min(1, 'Code is required').max(20),
    libelle: zod_1.z.string().trim().min(1, 'Libellé is required').max(60),
});
exports.TypeFluxUpdateSchema = exports.TypeFluxCreateSchema.partial();
// --- TypeRecette ---
exports.TypeRecetteCreateSchema = zod_1.z.object({
    code: zod_1.z.string().trim().min(1, 'Code is required').max(30),
    libelle: zod_1.z.string().trim().min(1, 'Libellé is required').max(120),
    typeFluxId: zod_1.z.number().int().positive('typeFluxId must be positive'),
});
exports.TypeRecetteUpdateSchema = exports.TypeRecetteCreateSchema.partial();
// --- NomenclatureProduit ---
exports.NomenclatureProduitCreateSchema = zod_1.z.preprocess(normalizeFilierePayload, zod_1.z.object({
    libelleBrut: zod_1.z.string().trim().min(1, 'Libellé brut is required').max(200),
    codeProduit: zod_1.z.string().trim().min(1, 'Code produit is required').max(40),
    libelleStandard: zod_1.z.string().trim().min(1, 'Libellé standard is required').max(150),
    typeRecetteId: zod_1.z.number().int().positive('typeRecetteId must be positive'),
    filiereId: zod_1.z.number().int().positive().optional().nullable(),
    statutId: zod_1.z.number().int().positive().optional().nullable(),
    numVersement: zod_1.z.number().int().positive().optional().nullable(),
    actif: zod_1.z.boolean().optional().default(true),
}));
exports.NomenclatureProduitUpdateSchema = zod_1.z.preprocess(normalizeFilierePayload, zod_1.z.object({
    libelleBrut: zod_1.z.string().trim().min(1, 'Libellé brut is required').max(200).optional(),
    codeProduit: zod_1.z.string().trim().min(1, 'Code produit is required').max(40).optional(),
    libelleStandard: zod_1.z.string().trim().min(1, 'Libellé standard is required').max(150).optional(),
    typeRecetteId: zod_1.z.number().int().positive('typeRecetteId must be positive').optional(),
    filiereId: zod_1.z.number().int().positive().optional().nullable(),
    statutId: zod_1.z.number().int().positive().optional().nullable(),
    numVersement: zod_1.z.number().int().positive().optional().nullable(),
    actif: zod_1.z.boolean().optional(),
}));
