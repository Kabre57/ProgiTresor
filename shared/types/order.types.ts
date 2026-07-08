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
  motif: z.string().trim().min(1).optional(),
});

/**
 * Schéma de pagination pour la liste des OTs.
 */
export const OrderPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Types inférés
export type StatusUpdateInput = z.infer<typeof StatusUpdateSchema>;
export type OrderPaginationInput = z.infer<typeof OrderPaginationSchema>;
export type OtStatus = typeof OT_STATUSES[number];
