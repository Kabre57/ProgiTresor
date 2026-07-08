import { Request, Response, NextFunction } from 'express';
import * as nomenclatureService from '../services/nomenclatureProduitService';

const parsePositiveInt = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'oui'].includes(normalized)) return true;
  if (['false', '0', 'no', 'non'].includes(normalized)) return false;
  return undefined;
};

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
  try {
    res.json(await nomenclatureService.getAll({
      typeRecetteId: parsePositiveInt(req.query.typeRecetteId),
      typeFluxId: parsePositiveInt(req.query.typeFluxId),
      niveauId: parsePositiveInt(req.query.niveauId ?? req.query.filiereId),
      statutId: parsePositiveInt(req.query.statutId),
      actif: parseBoolean(req.query.actif),
    }));
  } catch (e) { next(e); }
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
