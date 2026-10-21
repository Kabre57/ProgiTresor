import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';
import * as etudiantService from '../services/etudiantService';
import { ValidationError } from '../utils/errors';
import logger from '../utils/logger';
import {
  EtudiantCreateSchema,
  EtudiantUpdateSchema,
  BatchLookupSchema
} from '../../../../../shared/types/etudiant.types';

// ============================================================
// Middleware de validation Zod
// ============================================================

export const validate = (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.format()));
  }
  req.body = result.data;
  next();
};

// ============================================================
// Helper formatting for backward compatibility with Niveau
// ============================================================

const formatEtudiant = (etudiant: any): any => {
  if (!etudiant) return etudiant;
  if (Array.isArray(etudiant)) {
    return etudiant.map(formatEtudiant);
  }
  return {
    ...etudiant,
    niveauId: etudiant.promotionId ?? 0,
    niveau: etudiant.promotion ? {
      id: etudiant.promotion.id,
      code: etudiant.promotion.nom,
      libelle: etudiant.promotion.nom,
      anneeEtude: etudiant.promotion.ordre || 1,
    } : null,
  };
};

// ============================================================
// Handlers
// ============================================================

/**
 * @openapi
 * /{matricule}:
 *   get:
 *     summary: Get etudiant by matricule
 *     tags: [Etudiants]
 *     parameters:
 *       - in: path
 *         name: matricule
 *         required: true
 *         schema:
 *           type: string
 *         description: Etudiant matricule (case-insensitive)
 *     responses:
 *       200:
 *         description: Etudiant profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Etudiant'
 *       404:
 *         description: Etudiant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getEtudiantByMatricule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matricule = req.params.matricule.trim().toUpperCase();
    const etudiant = await etudiantService.getEtudiantByMatricule(matricule);
    res.json(formatEtudiant(etudiant));
  } catch (e) {
    next(e);
  }
};

/**
 * @openapi
 * /:
 *   post:
 *     summary: Create a new etudiant
 *     tags: [Etudiants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - matricule_etudiant
 *               - nom_complet
 *             properties:
 *               matricule_etudiant:
 *                 type: string
 *                 example: "ETU-2024-001"
 *               nom:
 *                 type: string
 *                 example: "KOUASSI"
 *               prenom:
 *                 type: string
 *                 example: "Jean-Pierre"
 *               nom_complet:
 *                 type: string
 *                 example: "KOUASSI Jean-Pierre"
 *               id_antenne:
 *                 type: integer
 *                 example: 1
 *               id_filiere:
 *                 type: integer
 *                 example: 1
 *               id_statut:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Etudiant created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Etudiant'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Etudiant with this matricule already exists
 */
export const createEtudiant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etudiant = await etudiantService.createEtudiant(req.body);
    res.status(201).json(formatEtudiant(etudiant));
  } catch (e) {
    next(e);
  }
};

/**
 * @openapi
 * /{matricule}:
 *   put:
 *     summary: Update a etudiant
 *     tags: [Etudiants]
 *     parameters:
 *       - in: path
 *         name: matricule
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               nom_complet:
 *                 type: string
 *               id_antenne:
 *                 type: integer
 *               id_filiere:
 *                 type: integer
 *               id_statut:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Etudiant updated successfully
 *       404:
 *         description: Etudiant not found
 */
export const updateEtudiant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matricule = req.params.matricule.trim().toUpperCase();
    const updated = await etudiantService.updateEtudiant(matricule, req.body);
    res.json(formatEtudiant(updated));
  } catch (e) {
    next(e);
  }
};

/**
 * @openapi
 * /batch:
 *   post:
 *     summary: Batch lookup etudiant profiles
 *     tags: [Etudiants]
 *     description: Retrieve multiple etudiant profiles by matricules. Uses Redis cache for performance.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - matricules
 *             properties:
 *               matricules:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["ETU-2024-001", "ETU-2024-002"]
 *     responses:
 *       200:
 *         description: List of resolved etudiant profiles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Etudiant'
 *       400:
 *         description: Validation error
 */
export const batchLookup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matricules } = req.body;
    const results = await etudiantService.batchLookupEtudiants(matricules);
    res.json(formatEtudiant(results));
  } catch (e) {
    next(e);
  }
};

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is healthy
 *       503:
 *         description: Service is unhealthy
 */
export const healthCheck = async (req: Request, res: Response) => {
  try {
    const prisma = require('../repositories/etudiantRepository').getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;

    const redisClient = require('../utils/redis').default;
    const redisPing = await redisClient.ping();

    res.json({ status: 'ok', service: 'etudiant-service', redis: redisPing });
  } catch (e) {
    res.status(503).json({ status: 'down', error: String(e) });
  }
};

/**
 * @openapi
 * /metrics:
 *   get:
 *     summary: Prometheus metrics endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Prometheus metrics in exposition format
 */
export const getMetrics = async (req: Request, res: Response) => {
  const promClient = require('../utils/metrics').default;
  res.setHeader('Content-Type', promClient.register.contentType);
  res.send(await promClient.register.metrics());
};

const parseIdOrIds = (val: any): number | number[] | undefined => {
  if (!val) return undefined;
  if (Array.isArray(val)) {
    const parsed = val.map(v => parseInt(v as string, 10)).filter(n => !isNaN(n));
    return parsed.length > 0 ? parsed : undefined;
  }
  if (typeof val === 'string') {
    if (val.trim() === '' || val.trim() === '0') return undefined;
    const parsed = val.split(',').map(v => parseInt(v.trim(), 10)).filter(n => !isNaN(n));
    if (parsed.length === 1) return parsed[0];
    return parsed.length > 0 ? parsed : undefined;
  }
  return undefined;
};

export const getEtudiants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const antenneId = parseIdOrIds(req.query.antenneId);
    const filiereId = parseIdOrIds(req.query.filiereId);
    const statutId = parseIdOrIds(req.query.statutId);
    const promotion = req.query.promotion as string | string[] | undefined;
    const promotionId = parseIdOrIds(req.query.promotionId);
    const result = await etudiantService.searchEtudiants(
      search,
      antenneId,
      filiereId,
      statutId,
      promotion,
      promotionId
    );
    res.json(formatEtudiant(result));
  } catch (e) {
    next(e);
  }
};

export const batchLookupIds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs list is required' });
    }
    const result = await etudiantService.batchLookupEtudiantsByIds(ids);
    res.json(formatEtudiant(result));
  } catch (e) {
    next(e);
  }
};

export const getEtudiantByTresorPay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matricule = req.params.matricule.trim();
    const etudiant = await etudiantService.getEtudiantByTresorPay(matricule);
    res.json(formatEtudiant(etudiant));
  } catch (e) {
    next(e);
  }
};

export const mapEtudiantTresorPay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matricule, matriculeTresorPay } = req.body;
    
    // If called by etudiant role, map their own profile
    let targetMatricule = matricule;
    if (req.headers['x-user-role'] === 'ETUDIANT' || req.headers['x-user-role'] === 'Etudiant') {
      targetMatricule = req.headers['x-user-name'] as string;
    }

    if (!targetMatricule) {
      return res.status(400).json({ error: 'Matricule interne requis' });
    }
    if (!matriculeTresorPay) {
      return res.status(400).json({ error: 'Matricule Trésor Pay requis' });
    }

    // Resolve internal etudiant ID first
    const etudiant = await etudiantService.getEtudiantByMatricule(targetMatricule);
    const updated = await etudiantService.mapEtudiantTresorPay(etudiant.id, matriculeTresorPay);
    res.json(formatEtudiant(updated));
  } catch (e) {
    next(e);
  }
};

export const upsertTemporaryEtudiant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matriculeTresorPay, nomPayeur } = req.body;
    if (!matriculeTresorPay || !nomPayeur) {
      return res.status(400).json({ error: 'matriculeTresorPay et nomPayeur requis' });
    }
    const etudiant = await etudiantService.upsertTemporaryEtudiant({ matriculeTresorPay, nomPayeur });
    res.status(201).json(formatEtudiant(etudiant));
  } catch (e) {
    next(e);
  }
};

export const upsertTemporaryEtudiantsBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items doit être un tableau' });
    }
    const etudiants = await etudiantService.upsertTemporaryEtudiantsBatch(items);
    res.status(201).json(formatEtudiant(etudiants));
  } catch (e) {
    next(e);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const username = req.headers['x-user-name'] as string;
    if (!username) {
      return res.status(401).json({ error: 'Non autorisé : aucun identifiant utilisateur transmis' });
    }
    const etudiant = await etudiantService.getEtudiantByMatricule(username);
    res.json(formatEtudiant(etudiant));
  } catch (e) {
    next(e);
  }
};

export const getTemporaryEtudiantNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await etudiantService.getTemporaryEtudiantNotifications();
    res.json(notifications);
  } catch (e) {
    next(e);
  }
};

export const markTemporaryEtudiantNotificationTreated = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID de notification invalide' });
    }
    const updated = await etudiantService.markTemporaryEtudiantNotificationTreated(id);
    res.json(updated);
  } catch (e) {
    next(e);
  }
};

export const getDistinctPromotions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await etudiantService.getDistinctPromotions();
    res.json(result);
  } catch (e) {
    next(e);
  }
};

export const getEtudiantStatsGroups = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await etudiantService.getEtudiantStatsGroups();
    res.json(stats);
  } catch (e) {
    next(e);
  }
};

export const getStudentFinancialSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const identifier = req.params.identifier.trim().toUpperCase();
    const matriculeOnly = String(req.headers['x-user-role']).toUpperCase() === 'ETUDIANT';
    const result = await etudiantService.getStudentFinancialSummary(identifier, matriculeOnly);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

export const generateStudentAttestation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const identifier = req.params.identifier.trim().toUpperCase();
    const matriculeOnly = String(req.headers['x-user-role']).toUpperCase() === 'ETUDIANT';
    const pdfBuffer = await etudiantService.generateStudentAttestation(identifier, matriculeOnly);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="attestation_${identifier}.pdf"`);
    res.send(pdfBuffer);
  } catch (e) {
    next(e);
  }
};

