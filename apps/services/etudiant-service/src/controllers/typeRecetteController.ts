import { Request, Response, NextFunction } from 'express';
import * as typeRecetteService from '../services/typeRecetteService';

const parsePositiveInt = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

/** @openapi
 * /types-recettes:
 *   get:
 *     summary: List all types de recette
 *     tags: [TypesRecettes]
 *     responses:
 *       200:
 *         description: List of types recette (with typeFlux)
 *   post:
 *     summary: Create a type de recette
 *     tags: [TypesRecettes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TypeRecetteCreate'
 *     responses:
 *       201:
 *         description: TypeRecette created
 */
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await typeRecetteService.getAll({
      typeFluxId: parsePositiveInt(req.query.typeFluxId),
    }));
  } catch (e) { next(e); }
};
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await typeRecetteService.getById(parseInt(req.params.id))); } catch (e) { next(e); }
};
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(await typeRecetteService.create(req.body)); } catch (e) { next(e); }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await typeRecetteService.update(parseInt(req.params.id), req.body)); } catch (e) { next(e); }
};
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await typeRecetteService.remove(parseInt(req.params.id))); } catch (e) { next(e); }
};
