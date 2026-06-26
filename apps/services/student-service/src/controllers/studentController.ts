import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';
import * as studentService from '../services/studentService';
import { ValidationError } from '../utils/errors';
import logger from '../utils/logger';
import {
  StudentCreateSchema,
  StudentUpdateSchema,
  BatchLookupSchema
} from '../../../../../shared/types/student.types';

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
// Handlers
// ============================================================

/**
 * @openapi
 * /{matricule}:
 *   get:
 *     summary: Get student by matricule
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: matricule
 *         required: true
 *         schema:
 *           type: string
 *         description: Student matricule (case-insensitive)
 *     responses:
 *       200:
 *         description: Student profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       404:
 *         description: Student not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getStudentByMatricule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matricule = req.params.matricule.trim().toUpperCase();
    const student = await studentService.getStudentByMatricule(matricule);
    res.json(student);
  } catch (e) {
    next(e);
  }
};

/**
 * @openapi
 * /:
 *   post:
 *     summary: Create a new student
 *     tags: [Students]
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
 *         description: Student created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Student with this matricule already exists
 */
export const createStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const student = await studentService.createStudent(req.body);
    res.status(201).json(student);
  } catch (e) {
    next(e);
  }
};

/**
 * @openapi
 * /{matricule}:
 *   put:
 *     summary: Update a student
 *     tags: [Students]
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
 *         description: Student updated successfully
 *       404:
 *         description: Student not found
 */
export const updateStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matricule = req.params.matricule.trim().toUpperCase();
    const updated = await studentService.updateStudent(matricule, req.body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
};

/**
 * @openapi
 * /batch:
 *   post:
 *     summary: Batch lookup student profiles
 *     tags: [Students]
 *     description: Retrieve multiple student profiles by matricules. Uses Redis cache for performance.
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
 *         description: List of resolved student profiles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Student'
 *       400:
 *         description: Validation error
 */
export const batchLookup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matricules } = req.body;
    const results = await studentService.batchLookupStudents(matricules);
    res.json(results);
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
    const prisma = require('../repositories/studentRepository').getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;

    const redisClient = require('../utils/redis').default;
    const redisPing = await redisClient.ping();

    res.json({ status: 'ok', service: 'student-service', redis: redisPing });
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

export const getStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const antenneId = parseIdOrIds(req.query.antenneId);
    const filiereId = parseIdOrIds(req.query.filiereId ?? req.query.niveauId);
    const statutId = parseIdOrIds(req.query.statutId);
    const promotion = req.query.promotion as string | string[] | undefined;
    const promotionId = parseIdOrIds(req.query.promotionId);
    const result = await studentService.searchStudents(search, antenneId, filiereId, statutId, promotion, promotionId);
    res.json(result);
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
    const result = await studentService.batchLookupStudentsByIds(ids);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

export const getStudentByTresorPay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matricule = req.params.matricule.trim();
    const student = await studentService.getStudentByTresorPay(matricule);
    res.json(student);
  } catch (e) {
    next(e);
  }
};

export const mapStudentTresorPay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matricule, matriculeTresorPay } = req.body;
    
    // If called by student role, map their own profile
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

    // Resolve internal student ID first
    const student = await studentService.getStudentByMatricule(targetMatricule);
    const updated = await studentService.mapStudentTresorPay(student.id, matriculeTresorPay);
    res.json(updated);
  } catch (e) {
    next(e);
  }
};

export const upsertTemporaryStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matriculeTresorPay, nomPayeur } = req.body;
    if (!matriculeTresorPay || !nomPayeur) {
      return res.status(400).json({ error: 'matriculeTresorPay et nomPayeur requis' });
    }
    const student = await studentService.upsertTemporaryStudent({ matriculeTresorPay, nomPayeur });
    res.status(201).json(student);
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
    const student = await studentService.getStudentByMatricule(username);
    res.json(student);
  } catch (e) {
    next(e);
  }
};

export const getTemporaryStudentNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await studentService.getTemporaryStudentNotifications();
    res.json(notifications);
  } catch (e) {
    next(e);
  }
};

export const markTemporaryStudentNotificationTreated = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID de notification invalide' });
    }
    const updated = await studentService.markTemporaryStudentNotificationTreated(id);
    res.json(updated);
  } catch (e) {
    next(e);
  }
};

export const getDistinctPromotions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await studentService.getDistinctPromotions();
    res.json(result);
  } catch (e) {
    next(e);
  }
};
