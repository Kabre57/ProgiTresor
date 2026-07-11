import { z } from 'zod';

// ============================================================
// Schémas de validation Zod – Order Service
// ============================================================

/**
 * Enum des statuts d'un Ordre de Traitement.
 */
export const OT_STATUSES = ['Brouillon', 'EN_ATTENTE_BUDGET', 'Transmis', 'Validé', 'TRANSMIS_AU_BUDGET', 'Approuvé', 'Rejeté', 'Payé'] as const;

/**
 * Schéma de mise à jour du statut d'un OT.
 */
export const StatusUpdateSchema = z.object({
  statut: z.enum(OT_STATUSES),
  motif: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  if (data.statut === 'Rejeté') {
    if (!data.motif) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['motif'],
        message: 'Le motif de rejet est obligatoire.',
      });
    } else if (data.motif.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['motif'],
        message: 'Le motif de rejet doit faire au moins 10 caractères.',
      });
    }
  }
});

/**
 * Schéma de pagination pour la liste des OTs.
 */
export const OrderPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});


export const SynthesisOrderLineSchema = z.object({
  codeOt: z.string().trim().min(1),
  antenneId: z.coerce.number().int().positive(),
  niveauId: z.coerce.number().int().positive(),
  statutId: z.coerce.number().int().positive().optional(),
  typeRecetteId: z.coerce.number().int().positive(),
  montantCumule: z.union([z.coerce.number().nonnegative(), z.string().trim().min(1)]),
  nombreFlux: z.coerce.number().int().nonnegative(),
  transactionIds: z.array(z.coerce.number().int().positive()).default([]),
});

export const CreateOrdersFromSynthesisSchema = z.object({
  reference: z.string().trim().min(1).optional(),
  titre: z.string().trim().min(1).max(180).optional(),
  description: z.string().trim().max(1000).optional(),
  referenceVague: z.string().trim().min(1).max(80).optional(),
  periodeDebut: z.union([z.string().trim().min(1), z.coerce.date()]),
  periodeFin: z.union([z.string().trim().min(1), z.coerce.date()]),
  typeFluxId: z.coerce.number().int().positive().optional(),
  auteurId: z.coerce.number().int().positive(),
  pdfUrl: z.string().trim().min(1),
  lines: z.array(SynthesisOrderLineSchema).min(1),
});

// Types inférés
export type SynthesisOrderLineInput = z.infer<typeof SynthesisOrderLineSchema>;
export type CreateOrdersFromSynthesisInput = z.infer<typeof CreateOrdersFromSynthesisSchema>;
export type StatusUpdateInput = z.infer<typeof StatusUpdateSchema>;
export type OrderPaginationInput = z.infer<typeof OrderPaginationSchema>;
export type OtStatus = typeof OT_STATUSES[number];
