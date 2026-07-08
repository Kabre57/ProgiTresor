import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';

// Connexion au cache Redis partagé pour la blacklist des JTIs révoqués
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_jwt_tres_long_et_aleatoire';

export interface AuthenticatedRequest extends Request {
  userPerms?: Record<string, number>;
  userDenies?: string[];
  userRole?: string;
  userId?: number;
  user?: any;
}

/**
 * Middleware Express du Gateway chargé de la validation des jetons d'accès JWT,
 * de la vérification de leur état de révocation dans Redis (Blacklist JTI)
 * et de la transmission des permissions structurées en en-têtes HTTP.
 */
export const permissionMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // 0. Extraction du token JWT — Authorization header OU cookie HttpOnly
  let token: string | undefined;
  const authHeader = req.headers['authorization'];
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    // Fallback: lire le cookie HttpOnly "pt_access_token"
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.split(';').find(c => c.trim().startsWith('pt_access_token='));
      if (match) {
        token = decodeURIComponent(match.split('=').slice(1).join('=').trim());
      }
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Accès refusé. Token absent ou malformé.' });
  }

  try {
    // 1. Décodage et vérification de la signature du jeton
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const jti = decoded.jti;
    const userId = decoded.sub;
    const userRole = decoded.role;
    const username = decoded.username || decoded.userName || '';
    const perms = decoded.perms || {};
    const denies = decoded.denies || [];

    // 2. Vérification d'invalidation (Blacklist) dans Redis par ID unique de jeton (JTI)
    if (jti) {
      const isRevoked = await redis.exists(`banned:${jti}`);
      if (isRevoked === 1) {
        return res.status(401).json({
          code: 'TOKEN_REVOKED',
          error: 'Cette session a été révoquée suite à un changement de droits.',
        });
      }
    }

    // 3. Stockage local des permissions pour les traitements internes éventuels du Gateway
    req.userId = Number(userId);
    req.userRole = userRole;
    req.userPerms = perms;
    req.userDenies = denies;
    req.user = {
      userId: Number(userId),
      role: userRole,
      username,
    };

    // 4. Transmission des permissions et exclusions sérialisées aux services métiers en aval
    req.headers['authorization'] = `Bearer ${token}`;
    req.headers['x-user-id'] = String(userId);
    req.headers['x-user-role'] = String(userRole);
    req.headers['x-user-name'] = String(username);
    req.headers['x-user-permissions'] = JSON.stringify(perms);
    req.headers['x-user-denies'] = JSON.stringify(denies);

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 'TOKEN_REVOKED',
        error: 'Votre session a expiré. Veuillez renouveler le jeton.',
      });
    }
    return res.status(401).json({ error: 'Session non autorisée ou jeton invalide.' });
  }
};
