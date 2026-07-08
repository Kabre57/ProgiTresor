import { Request, Response, NextFunction } from 'express';
import * as configService from '../services/configurationFraisNiveauService';

const parsePositiveInt = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await configService.getAll({
      niveauId: parsePositiveInt(req.query.niveauId),
      statutEtudiantId: parsePositiveInt(req.query.statutEtudiantId ?? req.query.statutId),
      nomenclatureProduitId: parsePositiveInt(req.query.nomenclatureProduitId),
    }));
  } catch (e) {
    next(e);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await configService.getById(parseInt(req.params.id)));
  } catch (e) {
    next(e);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await configService.create(req.body));
  } catch (e) {
    next(e);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await configService.update(parseInt(req.params.id), req.body));
  } catch (e) {
    next(e);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await configService.remove(parseInt(req.params.id)));
  } catch (e) {
    next(e);
  }
};
