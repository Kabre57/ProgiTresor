import redisClient from '../utils/redis';
import logger from '../utils/logger';

const REFERENTIAL_TTL_SECONDS = 60 * 60;

export const getCachedReferential = async <T>(key: string, loader: () => Promise<T>): Promise<T> => {
  try {
    const cached = await redisClient.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    logger.warn({ err, key }, 'Referential cache read failed');
  }

  const data = await loader();

  try {
    await redisClient.setEx(key, REFERENTIAL_TTL_SECONDS, JSON.stringify(data));
  } catch (err) {
    logger.warn({ err, key }, 'Referential cache write failed');
  }

  return data;
};

export const invalidateReferential = async (key: string) => {
  try {
    await redisClient.del(key);
  } catch (err) {
    logger.warn({ err, key }, 'Referential cache invalidation failed');
  }
};
