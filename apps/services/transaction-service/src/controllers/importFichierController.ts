import { Request, Response, NextFunction } from 'express';
import * as importFichierService from '../services/importFichierService';
import logger from '../utils/logger';

/**
 * @openapi
 * /imports:
 *   get:
 *     summary: Retrieve import fichiers list with pagination
 *     tags: [Imports]
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
 *         description: List of import fichiers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ImportFichier'
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 */
export const getImportFichiers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await importFichierService.getImportFichiers(limit, offset);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

/**
 * @openapi
 * /imports/{id}:
 *   get:
 *     summary: Retrieve a single import fichier by ID
 *     tags: [Imports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Import fichier ID
 *     responses:
 *       200:
 *         description: Import fichier details with transactions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImportFichier'
 *       404:
 *         description: Import fichier not found
 */
export const getImportFichierById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const result = await importFichierService.getImportFichierById(id);
    res.json(result);
  } catch (e) {
    next(e);
  }
};
