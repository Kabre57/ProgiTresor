import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal server error';

  logger.error({ err, path: req.path }, 'Global Error Handler caught error');

  res.status(statusCode).json({
    error: {
      message,
      statusCode
    }
  });
};
