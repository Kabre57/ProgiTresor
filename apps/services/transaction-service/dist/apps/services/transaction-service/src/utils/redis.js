"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const logger_1 = __importDefault(require("./logger"));
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const redisClient = (0, redis_1.createClient)({ url: REDIS_URL });
redisClient.on('error', (err) => {
    logger_1.default.error({ err }, 'Redis client error');
});
redisClient.on('connect', () => {
    logger_1.default.info('Redis client connected');
});
if (!redisClient.isOpen) {
    redisClient.connect().catch((err) => {
        logger_1.default.error({ err }, 'Failed to connect Redis client');
    });
}
exports.default = redisClient;
