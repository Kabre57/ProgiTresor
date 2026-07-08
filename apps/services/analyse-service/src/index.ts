import app from './app';
import logger from './utils/logger';
import { prisma } from './utils/prisma';

const PORT = process.env.PORT || 5005;

const server = app.listen(PORT, () => {
  logger.info(`Analyse Service running on port ${PORT}`);
});

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down analyse-service...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('Prisma disconnected');
    } catch (err) {
      logger.error({ err }, 'Error while disconnecting Prisma');
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
