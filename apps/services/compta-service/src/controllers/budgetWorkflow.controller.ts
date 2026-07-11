import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  BordereauFromOtsSchema,
  BordereauListQuerySchema,
  ControleOpSchema,
  LotTraitementCreateSchema,
  LotTraitementListQuerySchema,
  LotTraitementProcessSchema,
  LotTraitementTransmitSchema,
} from '../../../../../shared/types/compta.types';
import * as bordereauService from '../services/bordereau.service';
import * as lotService from '../services/lotTraitement.service';
import * as controleService from '../services/controle.service';
import * as ligneService from '../services/ligneBudgetaire.service';
import { ValidationError } from '../utils/errors';
import { toJsonSafe } from '../utils/json';

const LigneBudgetaireSchema = z.object({
  code: z.string().trim().min(1),
  libelle: z.string().trim().min(1),
  anneeBudgetaire: z.coerce.number().int().min(2000).max(2200),
  montantAlloue: z.coerce.number().nonnegative(),
});

const parsePositiveId = (value: string) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError('Identifiant invalide.');
  }
  return id;
};

export const createBordereauFromOts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = BordereauFromOtsSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(JSON.stringify(parsed.error.format()));
    res.status(201).json(toJsonSafe(await bordereauService.createBordereauFromOts(parsed.data)));
  } catch (err) {
    next(err);
  }
};

export const listBordereaux = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = BordereauListQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new ValidationError(JSON.stringify(parsed.error.format()));
    res.json(toJsonSafe(await bordereauService.listBordereaux(parsed.data)));
  } catch (err) {
    next(err);
  }
};

export const getBordereau = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(toJsonSafe(await bordereauService.getBordereau(parsePositiveId(req.params.id))));
  } catch (err) {
    next(err);
  }
};

export const listEcritures = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(toJsonSafe(await bordereauService.listEcritures(parsePositiveId(req.params.id))));
  } catch (err) {
    next(err);
  }
};

export const listPendingEcritures = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = {
      antenneId: req.query.antenneId ? Number(req.query.antenneId) : undefined,
      typeRecetteId: req.query.typeRecetteId ? Number(req.query.typeRecetteId) : undefined,
      dateDebut: req.query.dateDebut ? String(req.query.dateDebut) : undefined,
      dateFin: req.query.dateFin ? String(req.query.dateFin) : undefined,
    };
    res.json(toJsonSafe(await bordereauService.listPendingEcritures(query)));
  } catch (err) {
    next(err);
  }
};

export const createLot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = LotTraitementCreateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(JSON.stringify(parsed.error.format()));
    res.status(201).json(toJsonSafe(await lotService.createLot(parsed.data)));
  } catch (err) {
    next(err);
  }
};

export const listLots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = LotTraitementListQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new ValidationError(JSON.stringify(parsed.error.format()));
    res.json(toJsonSafe(await lotService.listLots(parsed.data)));
  } catch (err) {
    next(err);
  }
};

export const getLot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(toJsonSafe(await lotService.getLot(parsePositiveId(req.params.id))));
  } catch (err) {
    next(err);
  }
};

export const traiterLot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = LotTraitementProcessSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(JSON.stringify(parsed.error.format()));
    res.json(toJsonSafe(await lotService.traiterLot(parsePositiveId(req.params.id), parsed.data)));
  } catch (err) {
    next(err);
  }
};

export const transmettreLotBudget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = LotTraitementTransmitSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw new ValidationError(JSON.stringify(parsed.error.format()));
    res.json(toJsonSafe(await lotService.transmettreBudget(parsePositiveId(req.params.id), parsed.data)));
  } catch (err) {
    next(err);
  }
};

export const controlerOp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ControleOpSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(JSON.stringify(parsed.error.format()));
    res.status(201).json(toJsonSafe(await controleService.controlerOp(parsed.data)));
  } catch (err) {
    next(err);
  }
};

export const listControles = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(toJsonSafe(await controleService.listControles()));
  } catch (err) {
    next(err);
  }
};

export const listLignesBudgetaires = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(toJsonSafe(await ligneService.listLignes()));
  } catch (err) {
    next(err);
  }
};

export const upsertLigneBudgetaire = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = LigneBudgetaireSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(JSON.stringify(parsed.error.format()));
    res.status(201).json(toJsonSafe(await ligneService.upsertLigne(parsed.data)));
  } catch (err) {
    next(err);
  }
};
