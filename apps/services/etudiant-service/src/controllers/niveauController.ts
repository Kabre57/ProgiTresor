import { Request, Response, NextFunction } from 'express';
import * as niveauService from '../services/niveauService';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await niveauService.getAll()); } catch (e) { next(e); }
};
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await niveauService.getById(parseInt(req.params.id))); } catch (e) { next(e); }
};
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(await niveauService.create(req.body)); } catch (e) { next(e); }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await niveauService.update(parseInt(req.params.id), req.body)); } catch (e) { next(e); }
};
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await niveauService.remove(parseInt(req.params.id))); } catch (e) { next(e); }
};
