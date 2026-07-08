import { z } from 'zod';

export const EcritureCreateSchema = z.object({
  ordre_traitement_id: z.number().int().positive(),
  compte_debit: z.string().trim().min(1),
  compte_credit: z.string().trim().min(1),
  montant: z.number().int().positive(),
  libelle: z.string().trim().min(1),
  date_ecriture: z.coerce.date().optional(),
});

export const EcritureFromOrderSchema = z.object({
  codeOt: z.string().trim().min(1),
  ordreTraitementId: z.number().int().positive(),
  montant: z.number().int().positive(),
  typeRecette: z.string().trim().min(1),
  libelle: z.string().trim().min(1).optional(),
});

export const ComptaPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(10000).default(20),
});

export const BordereauFromOtsSchema = z.object({
  codesOt: z.array(z.string().trim().min(1)).min(1),
  sourceService: z.string().trim().min(1).default('order-service'),
  utilisateurTransmission: z.string().trim().optional(),
});

export const BordereauListQuerySchema = z.object({
  statut: z.string().trim().optional(),
  dateDebut: z.string().trim().optional(),
  dateFin: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});

export const LotTraitementCreateSchema = z.object({
  bordereauId: z.coerce.number().int().positive(),
  reference: z.string().trim().min(1).optional(),
  dateDebutFlux: z.string().trim().optional(),
  dateFinFlux: z.string().trim().optional(),
  typeRecetteId: z.coerce.number().int().positive().optional(),
  antenneId: z.coerce.number().int().positive().optional(),
});

export const LotTraitementProcessSchema = z.object({
  ligneBudgetaireId: z.coerce.number().int().positive(),
  utilisateurTraitement: z.string().trim().min(1).optional(),
  remarques: z.string().trim().optional(),
});

export const LotTraitementTransmitSchema = z.object({
  utilisateurTransmission: z.string().trim().min(1).optional(),
});

export const ControleOpSchema = z.object({
  ordrePaiementId: z.string().trim().min(1),
  referenceOp: z.string().trim().min(1),
  bordereauId: z.coerce.number().int().positive(),
  lotTraitementId: z.coerce.number().int().positive(),
  montantOp: z.coerce.number().nonnegative(),
  nombreLignesOp: z.coerce.number().int().nonnegative(),
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
export type BordereauFromOtsInput = z.infer<typeof BordereauFromOtsSchema>;
export type BordereauListQueryInput = z.infer<typeof BordereauListQuerySchema>;
export type LotTraitementCreateInput = z.infer<typeof LotTraitementCreateSchema>;
export type LotTraitementProcessInput = z.infer<typeof LotTraitementProcessSchema>;
export type LotTraitementTransmitInput = z.infer<typeof LotTraitementTransmitSchema>;
export type ControleOpInput = z.infer<typeof ControleOpSchema>;
export type CompteComptableCreateInput = z.infer<typeof CompteComptableCreateSchema>;
export type CompteComptableUpdateInput = z.infer<typeof CompteComptableUpdateSchema>;
