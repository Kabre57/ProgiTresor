"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    redact: {
        paths: [
            'password',
            'token',
            'authorization',
            'cookie',
            'jwt',
            'req.headers.authorization',
            'req.body.password',
            'req.body.token'
        ],
        censor: '***'
    },
    transport: process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: { colorize: true }
        }
        : undefined,
});
exports.default = logger;
