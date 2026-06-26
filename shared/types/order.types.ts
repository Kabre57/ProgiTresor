import { z } from 'zod';

// ============================================================
// Schémas de validation Zod – Order Service
// ============================================================

/**
 * Enum des statuts d'un Ordre de Paiement.
 */
export const OP_STATUSES = ['Brouillon', 'Transmis', 'Validé', 'Approuvé', 'Rejeté', 'Payé'] as const;

/**
 * Schéma de mise à jour du statut d'un OP.
 */
export const StatusUpdateSchema = z.object({
  statut: z.enum(OP_STATUSES),
  motif: z.string().trim().min(1).optional(),
});

/**
 * Schéma de pagination pour la liste des OPs.
 */
export const OrderPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Types inférés
export type StatusUpdateInput = z.infer<typeof StatusUpdateSchema>;
export type OrderPaginationInput = z.infer<typeof OrderPaginationSchema>;
export type OpStatus = typeof OP_STATUSES[number];
