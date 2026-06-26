import { Request, Response, NextFunction } from 'express';
import * as nomenclatureService from '../services/nomenclatureProduitService';

/** @openapi
 * /nomenclatures:
 *   get:
 *     summary: List all nomenclatures produit
 *     tags: [Nomenclatures]
 *     responses:
 *       200:
 *         description: List of nomenclatures (with typeRecette, filiere, statut)
 *   post:
 *     summary: Create a nomenclature produit
 *     tags: [Nomenclatures]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NomenclatureProduitCreate'
 *     responses:
 *       201:
 *         description: NomenclatureProduit created
 */
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await nomenclatureService.getAll()); } catch (e) { next(e); }
};
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await nomenclatureService.getById(parseInt(req.params.id))); } catch (e) { next(e); }
};
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(await nomenclatureService.create(req.body)); } catch (e) { next(e); }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await nomenclatureService.update(parseInt(req.params.id), req.body)); } catch (e) { next(e); }
};
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await nomenclatureService.remove(parseInt(req.params.id))); } catch (e) { next(e); }
};
