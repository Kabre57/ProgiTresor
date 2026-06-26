"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importCounter = exports.dbQueryDuration = exports.httpRequestDurationMs = void 0;
const prom_client_1 = __importDefault(require("prom-client"));
const collectDefaultMetrics = prom_client_1.default.collectDefaultMetrics;
collectDefaultMetrics({ register: prom_client_1.default.register });
exports.httpRequestDurationMs = new prom_client_1.default.Histogram({
    name: 'transaction_http_request_duration_ms',
    help: 'Duration of HTTP requests in transaction-service in ms',
    labelNames: ['method', 'route', 'code'],
    buckets: [0.1, 5, 15, 50, 100, 200, 300, 400, 500, 1000, 2000, 3000, 5000, 10000]
});
exports.dbQueryDuration = new prom_client_1.default.Histogram({
    name: 'transaction_db_query_duration_seconds',
    help: 'Duration of database queries in transaction-service in seconds',
    labelNames: ['operation']
});
exports.importCounter = new prom_client_1.default.Counter({
    name: 'transaction_imports_total',
    help: 'Total transactions imported',
    labelNames: ['status']
});
exports.default = prom_client_1.default;
