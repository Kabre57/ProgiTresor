"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
const errorHandler = (err, req, res, _next) => {
    const statusCode = err instanceof errors_1.AppError ? err.statusCode : 500;
    const message = err.message || 'Internal server error';
    logger_1.default.error({ err, path: req.path }, 'Global Error Handler caught error');
    res.status(statusCode).json({
        error: {
            message,
            statusCode
        }
    });
};
exports.errorHandler = errorHandler;
