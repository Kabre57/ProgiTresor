import redisClient from '../utils/redis';
import logger from '../utils/logger';

const KPI_CACHE_PREFIX = 'kpis:';
const KPI_TTL_SECONDS = 5 * 60;

const stableStringify = (value: Record<string, unknown>) => {
  const sorted = Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      const raw = value[key];
      if (raw !== undefined && raw !== null && raw !== '') {
        acc[key] = raw;
      }
      return acc;
    }, {});

  return JSON.stringify(sorted);
};

export const buildKpiCacheKey = (query: Record<string, unknown>) =>
  `${KPI_CACHE_PREFIX}${stableStringify(query)}`;

export const getCachedKpis = async <T>(key: string): Promise<T | null> => {
  try {
    const cached = await redisClient.get(key);
    return cached ? (JSON.parse(cached) as T) : null;
  } catch (err) {
    logger.warn({ err, key }, 'KPI cache read failed');
    return null;
  }
};

export const setCachedKpis = async (key: string, payload: unknown) => {
  try {
    await redisClient.setEx(key, KPI_TTL_SECONDS, JSON.stringify(payload));
  } catch (err) {
    logger.warn({ err, key }, 'KPI cache write failed');
  }
};

export const invalidateKpiCache = async () => {
  try {
    const batch: string[] = [];
    for await (const key of redisClient.scanIterator({ MATCH: `${KPI_CACHE_PREFIX}*`, COUNT: 100 })) {
      batch.push(String(key));
      if (batch.length >= 100) {
        await redisClient.del(batch.splice(0, batch.length));
      }
    }
    if (batch.length > 0) {
      await redisClient.del(batch);
    }
  } catch (err) {
    logger.warn({ err }, 'KPI cache invalidation failed');
  }
};
