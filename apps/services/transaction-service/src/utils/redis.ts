import { createClient } from 'redis';
import logger from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

const redisClient = createClient({ url: REDIS_URL });

redisClient.on('error', (err) => {
  logger.error({ err }, 'Redis client error');
});

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

if (!redisClient.isOpen) {
  redisClient.connect().catch((err) => {
    logger.error({ err }, 'Failed to connect Redis client');
  });
}

export default redisClient;
