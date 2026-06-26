"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateKpiCache = exports.setCachedKpis = exports.getCachedKpis = exports.buildKpiCacheKey = void 0;
const redis_1 = __importDefault(require("../utils/redis"));
const logger_1 = __importDefault(require("../utils/logger"));
const KPI_CACHE_PREFIX = 'kpis:';
const KPI_TTL_SECONDS = 5 * 60;
const stableStringify = (value) => {
    const sorted = Object.keys(value)
        .sort()
        .reduce((acc, key) => {
        const raw = value[key];
        if (raw !== undefined && raw !== null && raw !== '') {
            acc[key] = raw;
        }
        return acc;
    }, {});
    return JSON.stringify(sorted);
};
const buildKpiCacheKey = (query) => `${KPI_CACHE_PREFIX}${stableStringify(query)}`;
exports.buildKpiCacheKey = buildKpiCacheKey;
const getCachedKpis = async (key) => {
    try {
        const cached = await redis_1.default.get(key);
        return cached ? JSON.parse(cached) : null;
    }
    catch (err) {
        logger_1.default.warn({ err, key }, 'KPI cache read failed');
        return null;
    }
};
exports.getCachedKpis = getCachedKpis;
const setCachedKpis = async (key, payload) => {
    try {
        await redis_1.default.setEx(key, KPI_TTL_SECONDS, JSON.stringify(payload));
    }
    catch (err) {
        logger_1.default.warn({ err, key }, 'KPI cache write failed');
    }
};
exports.setCachedKpis = setCachedKpis;
const invalidateKpiCache = async () => {
    try {
        const batch = [];
        for await (const key of redis_1.default.scanIterator({ MATCH: `${KPI_CACHE_PREFIX}*`, COUNT: 100 })) {
            batch.push(String(key));
            if (batch.length >= 100) {
                await redis_1.default.del(batch.splice(0, batch.length));
            }
        }
        if (batch.length > 0) {
            await redis_1.default.del(batch);
        }
    }
    catch (err) {
        logger_1.default.warn({ err }, 'KPI cache invalidation failed');
    }
};
exports.invalidateKpiCache = invalidateKpiCache;
