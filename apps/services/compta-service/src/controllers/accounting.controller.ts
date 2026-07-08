import { Request, Response, NextFunction } from 'express';
import * as accountingService from '../services/accounting.service';
import { ValidationError, AppError } from '../utils/errors';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

const CreateEntrySchema = z.object({
  codeOt: z.string().trim().min(1),
  montant: z.number().positive(),
});

export const createEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(JSON.stringify(parsed.error.format()));
    }
    const { codeOt, montant } = parsed.data;
    const result = await accountingService.createAccountingEntry(codeOt, montant);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

export const listEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await accountingService.getEntries();
    res.json(list);
  } catch (e) {
    next(e);
  }
};

export const getEntryById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entry = await accountingService.getEntryById(req.params.id);
    if (!entry) {
      throw new AppError(404, 'Écriture comptable introuvable');
    }
    res.json(entry);
  } catch (e) {
    next(e);
  }
};

export const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'compta-service' });
  } catch (e) {
    next(new AppError(503, `Database connection failed: ${String(e)}`));
  }
};

export const getMetrics = async (req: Request, res: Response) => {
  const promClient = require('../utils/metrics').default;
  res.setHeader('Content-Type', promClient.register.contentType);
  res.send(await promClient.register.metrics());
};
