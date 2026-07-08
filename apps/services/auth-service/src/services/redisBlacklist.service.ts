import Redis from 'ioredis';
import { prisma } from '../utils/prisma';
import logger from '../utils/logger';

export class RedisBlacklistService {
  private redis: Redis;
  private ttl: number;

  constructor() {
    // Connexion au cache Redis partagé
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
    this.ttl = parseInt(process.env.REDIS_BLACKLIST_TTL || '900', 10); // Par défaut 15 minutes
  }

  /**
   * Récupère le JTI (ID unique du token d'accès) actif d'un utilisateur depuis Redis.
   */
  async getActiveJti(userId: number): Promise<string | null> {
    const key = `user:${userId}:active_jti`;
    return await this.redis.get(key);
  }

  /**
   * Invalide immédiatement tous les tokens d'accès et refresh tokens d'un utilisateur.
   */
  async invalidateUserTokens(userId: number, currentJti?: string) {
    try {
      // 1. Incrémenter la version du token de l'utilisateur pour casser les futurs refresh tokens
      await prisma.utilisateur.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      });

      // 2. Récupérer le JTI actif traqué dans Redis
      const activeJti = currentJti || (await this.getActiveJti(userId));

      if (activeJti) {
        // Enregistrer le JTI actif dans la blacklist Redis pour rejet immédiat par le Gateway
        const redisKey = `banned:${activeJti}`;
        await this.redis.set(redisKey, 'true', 'EX', this.ttl);
        
        // Supprimer le suivi du JTI actif
        await this.redis.del(`user:${userId}:active_jti`);
        
        logger.info(
          { userId, jti: activeJti, ttl: this.ttl },
          'Jeton actif invalidé et mis en blacklist Redis.'
        );
      }

      // 3. Révoquer tous les refresh tokens de l'utilisateur en base de données
      await prisma.refreshToken.updateMany({
        where: { utilisateurId: userId },
        data: { revoked: true },
      });

      logger.info({ userId }, 'Tous les refresh tokens ont été révoqués en BDD.');
    } catch (error) {
      logger.error(error, `Échec de l'invalidation globale des jetons pour l'utilisateur ${userId}`);
      throw error;
    }
  }

  /**
   * Vérifie si un JTI spécifique a été mis en liste noire dans Redis.
   */
  async isTokenRevoked(jti: string): Promise<boolean> {
    if (!jti) return false;
    const exists = await this.redis.exists(`banned:${jti}`);
    return exists === 1;
  }
}

export const redisBlacklistService = new RedisBlacklistService();
