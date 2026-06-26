"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderPaginationSchema = exports.StatusUpdateSchema = exports.OP_STATUSES = void 0;
const zod_1 = require("zod");
// ============================================================
// Schémas de validation Zod – Order Service
// ============================================================
/**
 * Enum des statuts d'un Ordre de Paiement.
 */
exports.OP_STATUSES = ['Brouillon', 'Transmis', 'Validé', 'Approuvé', 'Rejeté', 'Payé'];
/**
 * Schéma de mise à jour du statut d'un OP.
 */
exports.StatusUpdateSchema = zod_1.z.object({
    statut: zod_1.z.enum(exports.OP_STATUSES),
    motif: zod_1.z.string().trim().min(1).optional(),
});
/**
 * Schéma de pagination pour la liste des OPs.
 */
exports.OrderPaginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
});
