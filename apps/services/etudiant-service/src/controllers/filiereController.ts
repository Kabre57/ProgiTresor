import { Request, Response, NextFunction } from 'express';
import * as filiereService from '../services/filiereService';

/** @openapi
 * /filieres:
 *   get:
 *     summary: List all filieres
 *     tags: [Filieres]
 *     responses:
 *       200:
 *         description: List of filieres
 *   post:
 *     summary: Create a filiere
 *     tags: [Filieres]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FiliereCreate'
 *     responses:
 *       201:
 *         description: Filiere created
 */
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await filiereService.getAll()); } catch (e) { next(e); }
};
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await filiereService.getById(parseInt(req.params.id))); } catch (e) { next(e); }
};
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(await filiereService.create(req.body)); } catch (e) { next(e); }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await filiereService.update(parseInt(req.params.id), req.body)); } catch (e) { next(e); }
};
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await filiereService.remove(parseInt(req.params.id))); } catch (e) { next(e); }
};
