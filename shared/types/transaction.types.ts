import { z } from 'zod';

// ============================================================
// Schémas de validation Zod – Transaction Service
// ============================================================

/**
 * Schéma d'un item de transaction pour l'import.
 */
const preprocessNumber = (val: any) => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'string') {
    const cleaned = val.trim();
    if (cleaned === '' || cleaned === '0' || cleaned === 'null' || cleaned === 'undefined') return null;
    const num = Number(cleaned);
    return isNaN(num) ? val : num;
  }
  if (typeof val === 'number') {
    if (val === 0) return null;
    return val;
  }
  return val;
};

export const TransactionItemSchema = z.object({
  refTresor: z.string().trim().min(1, 'Reference is required'),
  montant: z.preprocess((val) => typeof val === 'string' ? Number(val) : val, z.number().int().positive('Montant must be positive')),
  dateHeure: z.coerce.date(),
  etudiantId: z.preprocess(preprocessNumber, z.number().int().positive().optional().nullable()),
  antenneId: z.preprocess(preprocessNumber, z.number().int().positive().optional().nullable()),
  nomenclatureId: z.preprocess(preprocessNumber, z.number().int().positive().optional().nullable()),
  typeFluxId: z.preprocess(preprocessNumber, z.number().int().positive().optional().nullable()),
  mois: z.string().trim().min(1).optional().nullable(),
  nomPayeurBrut: z.string().trim().min(1).optional().nullable(),
  contactPayeur: z.string().trim().optional().nullable(),
  libelleProduitBrut: z.string().trim().min(1).optional().nullable(),
  filiere: z.string().trim().optional().nullable(),
  niveau: z.string().trim().optional().nullable(),
  versement: z.string().trim().min(1).optional().nullable(),
  typeFrais: z.string().trim().min(1).optional().nullable(),
  ordreTraitementId: z.preprocess(preprocessNumber, z.number().int().positive().optional().nullable()),
  etudiantMatricule: z.string().trim().optional().nullable(),
  matriculeTresorPay: z.string().trim().optional().nullable(),
  antenne: z.string().trim().optional().nullable(),
  typeRecette: z.string().trim().optional().nullable(),
  typeFlux: z.string().trim().optional().nullable(),
});

/**
 * Schéma du payload d'import (tableau de transactions).
 */
export const ImportPayloadSchema = z.object({
  nomFichier: z.string().trim().min(1),
  typeFichier: z.enum(['XLSX', 'PDF', 'JSON']),
  auteurId: z.number().int().nonnegative(),
  periodeDebut: z.coerce.date().optional().nullable(),
  periodeFin: z.coerce.date().optional().nullable(),
  items: z.array(TransactionItemSchema).min(1),
});

/**
 * Schéma pour la synchronisation du statut OT.
 */
export const OtStatusSchema = z.object({
  ordreTraitementId: z.number().int().positive(),
  codeOt: z.string().trim().min(1, 'Code OT is required'),
  statut: z.enum(['Brouillon', 'EN_ATTENTE_BUDGET', 'Transmis', 'Validé', 'Approuvé', 'Rejeté', 'Payé']),
});

/**
 * Schéma pour lier des transactions à un OT.
 */
export const LinkOtSchema = z.object({
  ordreTraitementId: z.number().int().positive(),
  codeOt: z.string().min(1, 'Code OT is required'),
  transactionIds: z.array(z.number().int().positive()).min(1, 'At least one transaction ID is required'),
});

/**
 * Schéma pour délier des transactions d'un OT.
 */
export const UnlinkOtSchema = z.object({
  ordreTraitementId: z.number().int().positive(),
});

export const LockTransactionsSchema = z.object({
  ordreTraitementId: z.number().int().positive().optional(),
  codeOt: z.string().trim().min(1).optional(),
  transactionIds: z.array(z.number().int().positive()).optional(),
  statut: z.string().trim().min(1).default('Transmis'),
}).refine(
  (value) => value.ordreTraitementId !== undefined || (value.transactionIds && value.transactionIds.length > 0),
  { message: 'ordreTraitementId or transactionIds is required' },
);

/**
 * Schéma de pagination (limit/offset).
 */
export const TransactionPaginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Types inférés
export type TransactionItemInput = z.infer<typeof TransactionItemSchema>;
export type ImportPayloadInput = z.infer<typeof ImportPayloadSchema>;
export type OtStatusInput = z.infer<typeof OtStatusSchema>;
export type LinkOtInput = z.infer<typeof LinkOtSchema>;
export type UnlinkOtInput = z.infer<typeof UnlinkOtSchema>;
export type LockTransactionsInput = z.infer<typeof LockTransactionsSchema>;
export type TransactionPaginationInput = z.infer<typeof TransactionPaginationSchema>;
