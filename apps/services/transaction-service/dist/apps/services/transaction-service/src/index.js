"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const logger_1 = __importDefault(require("./utils/logger"));
const prisma_1 = require("./utils/prisma");
const redis_1 = __importDefault(require("./utils/redis"));
const PORT = process.env.PORT || 5003;
const server = app_1.default.listen(PORT, () => {
    logger_1.default.info(`Transaction Service with Swagger/OpenAPI running on port ${PORT}`);
});
// Graceful shutdown
const shutdown = async (signal) => {
    logger_1.default.info(`📴 Réception de ${signal}, arrêt en cours...`);
    server.close(async () => {
        try {
            await prisma_1.prisma.$disconnect();
            logger_1.default.info('✅ Client Prisma déconnecté');
        }
        catch (err) {
            logger_1.default.error({ err }, 'Erreur lors de la déconnexion de Prisma');
        }
        try {
            await redis_1.default.disconnect();
            logger_1.default.info('✅ Client Redis déconnecté');
        }
        catch (err) {
            logger_1.default.error({ err }, 'Erreur lors de la déconnexion de Redis');
        }
        logger_1.default.info('✅ Serveur arrêté');
        process.exit(0);
    });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
