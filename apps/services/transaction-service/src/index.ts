import app from './app';
import logger from './utils/logger';
import { prisma } from './utils/prisma';
import redisClient from './utils/redis';

const PORT = process.env.PORT || 5003;

const server = app.listen(PORT, () => {
  logger.info(`Transaction Service with Swagger/OpenAPI running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`📴 Réception de ${signal}, arrêt en cours...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('✅ Client Prisma déconnecté');
    } catch (err) {
      logger.error({ err }, 'Erreur lors de la déconnexion de Prisma');
    }
    try {
      await redisClient.disconnect();
      logger.info('✅ Client Redis déconnecté');
    } catch (err) {
      logger.error({ err }, 'Erreur lors de la déconnexion de Redis');
    }
    logger.info('✅ Serveur arrêté');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
