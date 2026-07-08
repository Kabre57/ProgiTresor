import { z } from 'zod';

export const OP_STATUSES = [
  'BROUILLON',
  'TRANSMIS_COMPTA',
  'CONTROLE',
  'A_PAYER',
  'PAYE',
  'REJETE',
] as const;

export const OrdrePaiementLineSchema = z.object({
  sourceEcritureId: z.coerce.number().int().positive(),
  codeOt: z.string().trim().min(1),
  refTresor: z.string().trim().optional(),
  produitLibelleBrut: z.string().trim().min(1),
  typeRecetteId: z.coerce.number().int().positive().optional(),
  typeRecetteLibelle: z.string().trim().optional(),
  montant: z.coerce.number().positive(),
  matriculeEtudiant: z.string().trim().optional(),
  dateFlux: z.string().trim().min(1),
});

export const OrdrePaiementFromLotSchema = z.object({
  bordereauId: z.coerce.number().int().positive(),
  lotTraitementId: z.coerce.number().int().positive(),
  referenceLot: z.string().trim().min(1),
  montantTotal: z.coerce.number().positive(),
  nombreEcritures: z.coerce.number().int().positive(),
  utilisateurCreation: z.string().trim().optional(),
  lignes: z.array(OrdrePaiementLineSchema).min(1),
});

export const OrdrePaiementListQuerySchema = z.object({
  statut: z.enum(OP_STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});

export const TransmettreOpComptaSchema = z.object({
  utilisateurTransmission: z.string().trim().min(1).optional(),
});

export type OpStatus = typeof OP_STATUSES[number];
export type OrdrePaiementLineInput = z.infer<typeof OrdrePaiementLineSchema>;
export type OrdrePaiementFromLotInput = z.infer<typeof OrdrePaiementFromLotSchema>;
export type OrdrePaiementListQueryInput = z.infer<typeof OrdrePaiementListQuerySchema>;
export type TransmettreOpComptaInput = z.infer<typeof TransmettreOpComptaSchema>;
