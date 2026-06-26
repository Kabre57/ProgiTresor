import app from './app';
import logger from './utils/logger';
import { prisma } from './utils/prisma';

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  logger.info(`Auth Service with Swagger/OpenAPI running on port ${PORT}`);
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
    logger.info('✅ Serveur arrêté');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
