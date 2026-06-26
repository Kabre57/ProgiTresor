import { Request, Response, NextFunction } from 'express';
import * as statutService from '../services/statutEtudiantService';

/** @openapi
 * /statuts-etudiants:
 *   get:
 *     summary: List all statuts étudiants
 *     tags: [StatutsEtudiants]
 *     responses:
 *       200:
 *         description: List of student statuses
 *   post:
 *     summary: Create a statut étudiant
 *     tags: [StatutsEtudiants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StatutEtudiantCreate'
 *     responses:
 *       201:
 *         description: StatutEtudiant created
 */
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await statutService.getAll()); } catch (e) { next(e); }
};
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await statutService.getById(parseInt(req.params.id))); } catch (e) { next(e); }
};
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(await statutService.create(req.body)); } catch (e) { next(e); }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await statutService.update(parseInt(req.params.id), req.body)); } catch (e) { next(e); }
};
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await statutService.remove(parseInt(req.params.id))); } catch (e) { next(e); }
};
