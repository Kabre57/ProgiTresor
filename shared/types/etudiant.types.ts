import { z } from 'zod';

// ============================================================
// Schémas de validation Zod – Etudiant Service
// ============================================================

const normalizeFilierePayload = (value: unknown) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;
  if (record.niveauId === undefined && record.filiereId !== undefined) {
    return { ...record, niveauId: record.filiereId };
  }

  return value;
};

/**
 * Schéma de création d'un étudiant.
 */
export const EtudiantCreateSchema = z.preprocess(normalizeFilierePayload, z.object({
  matricule: z.string()
    .trim()
    .min(1, 'Matricule is required')
    .transform((val: string) => val.toUpperCase()),
  nom: z.string().trim().min(1, 'Nom is required'),
  prenom: z.string().trim().min(1, 'Prénom is required'),
  prefixeMatricule: z.string().trim().min(1).optional().nullable(),
  antenneId: z.number().int().positive('antenneId must be a positive integer'),
  filiereId: z.number().int().positive('filiereId must be a positive integer'),
  statutId: z.number().int().positive('statutId must be a positive integer'),
  matriculeTresorPay: z.string().trim().min(1, 'Matricule Trésor Pay is required'),
  promotion: z.string().trim().optional().nullable(),
  promotionId: z.number().int().positive('Promotion is required'),
  photoUrl: z.string().trim().optional().nullable(),
  nomenclatureIds: z.array(z.number().int().positive()).optional(),
}));

/**
 * Schéma de mise à jour d'un étudiant (tous les champs optionnels).
 */
export const EtudiantUpdateSchema = z.preprocess(normalizeFilierePayload, z.object({
  nom: z.string().trim().min(1).optional(),
  prenom: z.string().trim().min(1).optional(),
  prefixeMatricule: z.string().trim().min(1).nullable().optional(),
  antenneId: z.number().int().positive().optional(),
  filiereId: z.number().int().positive().optional(),
  statutId: z.number().int().positive().optional(),
  matriculeTresorPay: z.string().trim().min(1).optional(),
  promotion: z.string().trim().optional().nullable(),
  promotionId: z.number().int().positive().optional(),
  photoUrl: z.string().trim().optional().nullable(),
  nomenclatureIds: z.array(z.number().int().positive()).optional(),
}));

/**
 * Schéma pour le lookup batch de matricules.
 */
export const BatchLookupSchema = z.object({
  matricules: z.array(
    z.string().trim().transform((val: string) => val.toUpperCase())
  ).min(1, 'At least one matricule is required')
   .max(1000, 'Maximum 1000 matricules per batch'),
});

/**
 * Schéma de pagination.
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================================
// Schémas de validation – Référentiels
// ============================================================

// --- Promotion ---
export const PromotionCreateSchema = z.object({
  nom: z.string().trim().min(1, 'Nom is required').max(50),
  ordre: z.number().int().positive('Ordre must be positive'),
  actif: z.boolean().optional().default(true),
  niveau: z.string().trim().optional().default(''),
});
export const PromotionUpdateSchema = PromotionCreateSchema.partial();

// --- Antenne ---
export const AntenneCreateSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(10),
  nom: z.string().trim().min(1, 'Nom is required').max(80),
  ville: z.string().trim().min(1, 'Ville is required').max(60),
  actif: z.boolean().optional().default(true),
});
export const AntenneUpdateSchema = AntenneCreateSchema.partial();


// --- Filiere ---
export const FiliereCreateSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(10),
  libelle: z.string().trim().min(1, 'Libellé is required').max(60),
  abreviation: z.string().trim().min(1, 'Abréviation is required').max(30),
});
export const FiliereUpdateSchema = FiliereCreateSchema.partial();

// --- StatutEtudiant ---
export const StatutEtudiantCreateSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(20),
  libelle: z.string().trim().min(1, 'Libellé is required').max(60),
});
export const StatutEtudiantUpdateSchema = StatutEtudiantCreateSchema.partial();

// --- TypeFlux ---
export const TypeFluxCreateSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(20),
  libelle: z.string().trim().min(1, 'Libellé is required').max(60),
});
export const TypeFluxUpdateSchema = TypeFluxCreateSchema.partial();

// --- TypeRecette ---
export const TypeRecetteCreateSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(30),
  libelle: z.string().trim().min(1, 'Libellé is required').max(120),
  typeFluxId: z.number().int().positive('typeFluxId must be positive'),
});
export const TypeRecetteUpdateSchema = TypeRecetteCreateSchema.partial();

// --- NomenclatureProduit ---
export const NomenclatureProduitCreateSchema = z.preprocess(normalizeFilierePayload, z.object({
  codeProduit: z.string().trim().min(1, 'Code produit is required').max(40),
  libelle: z.string().trim().min(1, 'Libellé is required').max(150),
  typeRecetteId: z.number().int().positive('typeRecetteId must be positive'),
  montant: z.number().int().nonnegative().optional().default(0),
  actif: z.boolean().optional().default(true),
  regexPattern: z.string().trim().min(1).max(500).optional().nullable(),
}));
export const NomenclatureProduitUpdateSchema = z.preprocess(
  normalizeFilierePayload,
  z.object({
    codeProduit: z.string().trim().min(1, 'Code produit is required').max(40).optional(),
    libelle: z.string().trim().min(1, 'Libellé is required').max(150).optional(),
    typeRecetteId: z.number().int().positive('typeRecetteId must be positive').optional(),
    montant: z.number().int().nonnegative().optional(),
    actif: z.boolean().optional(),
    regexPattern: z.string().trim().min(1).max(500).optional().nullable(),
  }),
);

// Types inférés – Étudiants
export type EtudiantCreateInput = z.infer<typeof EtudiantCreateSchema>;
export type EtudiantUpdateInput = z.infer<typeof EtudiantUpdateSchema>;
export type BatchLookupInput = z.infer<typeof BatchLookupSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;

// Types inférés – Référentiels
export type PromotionCreateInput = z.infer<typeof PromotionCreateSchema>;
export type PromotionUpdateInput = z.infer<typeof PromotionUpdateSchema>;
export type AntenneCreateInput = z.infer<typeof AntenneCreateSchema>;
export type AntenneUpdateInput = z.infer<typeof AntenneUpdateSchema>;
export type FiliereCreateInput = z.infer<typeof FiliereCreateSchema>;
export type FiliereUpdateInput = z.infer<typeof FiliereUpdateSchema>;
export type StatutEtudiantCreateInput = z.infer<typeof StatutEtudiantCreateSchema>;
export type StatutEtudiantUpdateInput = z.infer<typeof StatutEtudiantUpdateSchema>;
export type TypeFluxCreateInput = z.infer<typeof TypeFluxCreateSchema>;
export type TypeFluxUpdateInput = z.infer<typeof TypeFluxUpdateSchema>;
export type TypeRecetteCreateInput = z.infer<typeof TypeRecetteCreateSchema>;
export type TypeRecetteUpdateInput = z.infer<typeof TypeRecetteUpdateSchema>;
export type NomenclatureProduitCreateInput = z.infer<typeof NomenclatureProduitCreateSchema>;
export type NomenclatureProduitUpdateInput = z.infer<typeof NomenclatureProduitUpdateSchema>;

