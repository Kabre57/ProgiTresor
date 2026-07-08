import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { message: err.message, statusCode: err.statusCode } });
    return;
  }

  logger.error({ err }, 'Unhandled analyse-service error');
  res.status(500).json({ error: { message: 'Internal Server Error', statusCode: 500 } });
};
