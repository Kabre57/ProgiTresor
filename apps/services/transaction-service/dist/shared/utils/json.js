"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toJsonSafe = void 0;
const isRecord = (value) => (typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && !(value instanceof Date));
const toJsonSafe = (value) => {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (Array.isArray(value)) {
        return value.map((item) => (0, exports.toJsonSafe)(item));
    }
    if (isRecord(value)) {
        return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
            accumulator[key] = (0, exports.toJsonSafe)(nestedValue);
            return accumulator;
        }, {});
    }
    if (typeof value === 'string'
        || typeof value === 'number'
        || typeof value === 'boolean'
        || value === null) {
        return value;
    }
    return null;
};
exports.toJsonSafe = toJsonSafe;
