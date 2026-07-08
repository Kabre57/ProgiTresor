import { Request, Response, NextFunction } from 'express';
import {
  OrdrePaiementFromLotSchema,
  OrdrePaiementListQuerySchema,
  TransmettreOpComptaSchema,
} from '../../../../../shared/types/budget.types';
import * as service from '../services/ordrePaiementService';
import { ValidationError, AppError } from '../utils/errors';
import { prisma } from '../utils/prisma';
import metrics from '../utils/metrics';

export const createFromLot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = OrdrePaiementFromLotSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(JSON.stringify(parsed.error.format()));
    }
    const result = await service.createFromLot(parsed.data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const listOrdresPaiement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = OrdrePaiementListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError(JSON.stringify(parsed.error.format()));
    }
    res.json(await service.listOrdresPaiement(parsed.data));
  } catch (err) {
    next(err);
  }
};

export const getOrdrePaiement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await service.getOrdrePaiement(req.params.id));
  } catch (err) {
    next(err);
  }
};

export const transmettreCompta = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = TransmettreOpComptaSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError(JSON.stringify(parsed.error.format()));
    }
    res.json(await service.transmettreCompta(req.params.id, parsed.data));
  } catch (err) {
    next(err);
  }
};

export const healthCheck = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'budget-service' });
  } catch (err) {
    next(new AppError(503, `Database connection failed: ${String(err)}`));
  }
};

export const getMetrics = async (_req: Request, res: Response) => {
  res.setHeader('Content-Type', metrics.register.contentType);
  res.send(await metrics.register.metrics());
};
