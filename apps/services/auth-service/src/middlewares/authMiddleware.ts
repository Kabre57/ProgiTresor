import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set as an environment variable.');
}

interface AuthTokenPayload extends JwtPayload {
  userId: number;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userRole?: string;
    }
  }
}

const isAuthTokenPayload = (payload: string | JwtPayload): payload is AuthTokenPayload => {
  return typeof payload !== 'string'
    && typeof payload.userId === 'number'
    && typeof payload.role === 'string';
};

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return next(new UnauthorizedError('Authentication token required'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!isAuthTokenPayload(decoded)) {
      return next(new ForbiddenError('Invalid or expired token'));
    }
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch {
    next(new ForbiddenError('Invalid or expired token'));
  }
};

export const authorizeRoles = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.userRole || !roles.includes(req.userRole)) {
    return next(new ForbiddenError('Insufficient permissions'));
  }
  next();
};
