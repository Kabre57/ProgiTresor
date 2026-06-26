"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolePermissionAssignSchema = exports.PermissionUpdateSchema = exports.PermissionCreateSchema = exports.RoleUpdateSchema = exports.RoleCreateSchema = exports.PaginationSchema = exports.UserUpdateSchema = exports.UserCreateSchema = exports.RefreshTokenSchema = exports.LoginSchema = void 0;
const zod_1 = require("zod");
// Schémas d'authentification
exports.LoginSchema = zod_1.z.object({
    username: zod_1.z.string().trim().min(1, 'Username is required'),
    password: zod_1.z.string().trim().min(1, 'Password is required'),
});
exports.RefreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
exports.UserCreateSchema = zod_1.z.object({
    nom: zod_1.z.string().trim().min(1, 'Nom is required'),
    prenom: zod_1.z.string().trim().min(1, 'Prénom is required'),
    username: zod_1.z.string().trim().min(3, 'Username must be at least 3 characters'),
    email: zod_1.z.string().trim().email('Valid email is required'),
    password: zod_1.z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    roleCode: zod_1.z.string().trim().min(1, 'Role is required'),
    service: zod_1.z.string().trim().min(1).optional(),
    photoUrl: zod_1.z.string().trim().url().optional().nullable(),
});
exports.UserUpdateSchema = zod_1.z.object({
    nom: zod_1.z.string().trim().min(1).optional(),
    prenom: zod_1.z.string().trim().min(1).optional(),
    username: zod_1.z.string().trim().min(3).optional(),
    email: zod_1.z.string().trim().email().optional(),
    password: zod_1.z.string()
        .min(8)
        .regex(/[A-Z]/)
        .regex(/[a-z]/)
        .regex(/[0-9]/)
        .regex(/[^A-Za-z0-9]/)
        .optional(),
    roleCode: zod_1.z.string().trim().min(1).optional(),
    service: zod_1.z.string().trim().min(1).nullable().optional(),
    photoUrl: zod_1.z.string().trim().optional().nullable(),
    actif: zod_1.z.boolean().optional(),
});
exports.PaginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
});
// ============================================================
// Schémas de validation – Référentiels RBAC
// ============================================================
// --- Role ---
exports.RoleCreateSchema = zod_1.z.object({
    code: zod_1.z.string().trim().min(1, 'Code is required').max(30),
    libelle: zod_1.z.string().trim().min(1, 'Libellé is required').max(60),
    description: zod_1.z.string().trim().max(255).optional().nullable(),
});
exports.RoleUpdateSchema = exports.RoleCreateSchema.partial();
// --- Permission ---
exports.PermissionCreateSchema = zod_1.z.object({
    code: zod_1.z.string().trim().min(1, 'Code is required').max(40),
    libelle: zod_1.z.string().trim().min(1, 'Libellé is required').max(120),
    module: zod_1.z.string().trim().min(1, 'Module is required').max(40),
});
exports.PermissionUpdateSchema = exports.PermissionCreateSchema.partial();
// --- RolePermission ---
exports.RolePermissionAssignSchema = zod_1.z.object({
    permissionIds: zod_1.z.array(zod_1.z.number().int().positive()).min(1, 'At least one permission required'),
});
