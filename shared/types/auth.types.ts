import { z } from 'zod';

// Schémas d'authentification
export const LoginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().trim().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const UserCreateSchema = z.object({
  nom: z.string().trim().min(1, 'Nom is required'),
  prenom: z.string().trim().min(1, 'Prénom is required'),
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  email: z.string().trim().email('Valid email is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  roleCode: z.string().trim().min(1, 'Role is required'),
  service: z.string().trim().min(1).optional(),
  photoUrl: z.string().trim().url().optional().nullable(),
});

export const UserUpdateSchema = z.object({
  nom: z.string().trim().min(1).optional(),
  prenom: z.string().trim().min(1).optional(),
  username: z.string().trim().min(3).optional(),
  email: z.string().trim().email().optional(),
  password: z.string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/)
    .optional(),
  roleCode: z.string().trim().min(1).optional(),
  service: z.string().trim().min(1).nullable().optional(),
  photoUrl: z.string().trim().optional().nullable(),
  actif: z.boolean().optional(),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================================
// Schémas de validation – Référentiels RBAC
// ============================================================

// --- Role ---
export const RoleCreateSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(30),
  libelle: z.string().trim().min(1, 'Libellé is required').max(60),
  description: z.string().trim().max(255).optional().nullable(),
});
export const RoleUpdateSchema = RoleCreateSchema.partial();

// --- Permission ---
export const PermissionCreateSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(40),
  libelle: z.string().trim().min(1, 'Libellé is required').max(120),
  module: z.string().trim().min(1, 'Module is required').max(40),
});
export const PermissionUpdateSchema = PermissionCreateSchema.partial();

// --- RolePermission ---
export const RolePermissionAssignSchema = z.object({
  permissionIds: z.array(z.number().int().positive()).min(1, 'At least one permission required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type UserCreateInput = z.infer<typeof UserCreateSchema>;
export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;

// Types inférés – Référentiels RBAC
export type RoleCreateInput = z.infer<typeof RoleCreateSchema>;
export type RoleUpdateInput = z.infer<typeof RoleUpdateSchema>;
export type PermissionCreateInput = z.infer<typeof PermissionCreateSchema>;
export type PermissionUpdateInput = z.infer<typeof PermissionUpdateSchema>;
export type RolePermissionAssignInput = z.infer<typeof RolePermissionAssignSchema>;
