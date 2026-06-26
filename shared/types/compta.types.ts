import { z } from 'zod';

export const EcritureCreateSchema = z.object({
  ordre_paiement_id: z.number().int().positive(),
  compte_debit: z.string().trim().min(1),
  compte_credit: z.string().trim().min(1),
  montant: z.number().int().positive(),
  libelle: z.string().trim().min(1),
  date_ecriture: z.coerce.date().optional(),
});

export const EcritureFromOrderSchema = z.object({
  codeOp: z.string().trim().min(1),
  ordrePaiementId: z.number().int().positive(),
  montant: z.number().int().positive(),
  typeRecette: z.string().trim().min(1),
  libelle: z.string().trim().min(1).optional(),
});

export const ComptaPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(10000).default(20),
});

// ============================================================
// Schémas de validation – CompteComptable CRUD
// ============================================================

export const CompteComptableCreateSchema = z.object({
  numero: z.string().trim().min(1, 'Numéro is required').max(10),
  libelle: z.string().trim().min(1, 'Libellé is required').max(120),
  classe: z.number().int().min(1).max(9, 'Classe must be between 1 and 9'),
});
export const CompteComptableUpdateSchema = z.object({
  libelle: z.string().trim().min(1).max(120).optional(),
  classe: z.number().int().min(1).max(9).optional(),
});

export type EcritureCreateInput = z.infer<typeof EcritureCreateSchema>;
export type EcritureFromOrderInput = z.infer<typeof EcritureFromOrderSchema>;
export type ComptaPaginationInput = z.infer<typeof ComptaPaginationSchema>;
export type CompteComptableCreateInput = z.infer<typeof CompteComptableCreateSchema>;
export type CompteComptableUpdateInput = z.infer<typeof CompteComptableUpdateSchema>;
