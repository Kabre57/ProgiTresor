import { createClient } from 'redis';
import logger from './logger';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => logger.error(err, 'Redis Client Error'));
redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));

// Connexion automatique au démarrage
redisClient.connect()
  .then(() => logger.info('Redis connected successfully'))
  .catch((err) => logger.error(err, 'Failed to connect to Redis'));

export default redisClient;
