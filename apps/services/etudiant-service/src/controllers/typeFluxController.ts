import { Request, Response, NextFunction } from 'express';
import * as typeFluxService from '../services/typeFluxService';

/** @openapi
 * /types-flux:
 *   get:
 *     summary: List all types de flux
 *     tags: [TypesFlux]
 *     responses:
 *       200:
 *         description: List of types flux
 *   post:
 *     summary: Create a type de flux
 *     tags: [TypesFlux]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TypeFluxCreate'
 *     responses:
 *       201:
 *         description: TypeFlux created
 */
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await typeFluxService.getAll()); } catch (e) { next(e); }
};
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await typeFluxService.getById(parseInt(req.params.id))); } catch (e) { next(e); }
};
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(await typeFluxService.create(req.body)); } catch (e) { next(e); }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await typeFluxService.update(parseInt(req.params.id), req.body)); } catch (e) { next(e); }
};
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await typeFluxService.remove(parseInt(req.params.id))); } catch (e) { next(e); }
};
