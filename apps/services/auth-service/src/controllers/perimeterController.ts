import { Request, Response, NextFunction } from 'express';
import * as perimeterService from '../services/perimeterService';

export const getAllPerimeters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await perimeterService.listAllPerimeters();
    res.json(list);
  } catch (e) {
    next(e);
  }
};

export const getUserPerimeterLevels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    const levels = await perimeterService.getUserPerimeters(userId);
    res.json(levels);
  } catch (e) {
    next(e);
  }
};

export const setUserPerimeterLevel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    const { perimeterId, level } = req.body;
    const updated = await perimeterService.setUserPerimeterLevel(userId, perimeterId, Number(level));
    res.json(updated);
  } catch (e) {
    next(e);
  }
};

export const checkAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, perimeterId, requiredLevel } = req.body;
    const allowed = await perimeterService.checkUserPerimeterAccess(
      Number(userId),
      perimeterId,
      Number(requiredLevel)
    );
    res.json({ allowed });
  } catch (e) {
    next(e);
  }
};
