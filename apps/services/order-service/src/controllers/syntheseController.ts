import { Request, Response, NextFunction } from 'express';
import * as syntheseService from '../services/syntheseService';
import { toJsonSafe } from '../../../../../shared/utils/json';
import logger from '../utils/logger';

/**
 * @openapi
 * /syntheses:
 *   get:
 *     summary: Retrieve syntheses list with pagination
 *     tags: [Syntheses]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 200
 *         description: Number of items to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of items to skip
 *     responses:
 *       200:
 *         description: List of syntheses with associated OPs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SyntheseOP'
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 */
export const getSyntheses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await syntheseService.getSyntheses(limit, offset);
    res.json(toJsonSafe(result));
  } catch (e) {
    next(e);
  }
};

/**
 * @openapi
 * /syntheses/{id}:
 *   get:
 *     summary: Retrieve a single synthese by ID
 *     tags: [Syntheses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Synthese ID
 *     responses:
 *       200:
 *         description: Synthese details with ordres de paiement
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SyntheseOP'
 *       404:
 *         description: Synthese not found
 */
export const getSyntheseById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const result = await syntheseService.getSyntheseById(id);
    res.json(toJsonSafe(result));
  } catch (e) {
    next(e);
  }
};

/**
 * @openapi
 * /syntheses/ref/{reference}:
 *   get:
 *     summary: Retrieve a synthese by reference
 *     tags: [Syntheses]
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: Synthese reference (e.g. SYN-2024-JAN-001)
 *     responses:
 *       200:
 *         description: Synthese details with ordres de paiement
 *       404:
 *         description: Synthese not found
 */
export const getSyntheseByReference = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await syntheseService.getSyntheseByReference(req.params.reference);
    res.json(toJsonSafe(result));
  } catch (e) {
    next(e);
  }
};
