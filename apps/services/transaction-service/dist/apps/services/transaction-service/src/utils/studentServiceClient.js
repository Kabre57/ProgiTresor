"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchStudentJson = exports.fetchStudentResult = void 0;
const logger_1 = __importDefault(require("./logger"));
const STUDENT_SERVICE_URL = process.env.STUDENT_SERVICE_URL || 'http://student-service:5002';
const timeoutMs = Number(process.env.STUDENT_SERVICE_CB_TIMEOUT_MS ?? 5000);
const errorThresholdPercentage = Number(process.env.STUDENT_SERVICE_CB_ERROR_THRESHOLD ?? 50);
const resetTimeoutMs = Number(process.env.STUDENT_SERVICE_CB_RESET_TIMEOUT_MS ?? 15000);
const rollingWindowMs = Number(process.env.STUDENT_SERVICE_CB_ROLLING_TIMEOUT_MS ?? 10000);
const minSamples = Number(process.env.STUDENT_SERVICE_CB_MIN_SAMPLES ?? 5);
let state = 'closed';
let openedAt = 0;
const samples = [];
const fallback = (request) => ({
    ok: false,
    status: 503,
    statusText: 'student-service circuit breaker fallback',
    data: request.fallbackValue,
    fromFallback: true,
});
const recordSample = (success) => {
    const now = Date.now();
    samples.push({ at: now, success });
    while (samples.length > 0 && samples[0].at < now - rollingWindowMs) {
        samples.shift();
    }
    const failures = samples.filter((sample) => !sample.success).length;
    const errorRate = samples.length > 0 ? (failures / samples.length) * 100 : 0;
    if (state === 'closed' && samples.length >= minSamples && errorRate >= errorThresholdPercentage) {
        state = 'open';
        openedAt = now;
        logger_1.default.warn({ errorRate, samples: samples.length }, 'student-service circuit breaker opened');
    }
};
const closeBreaker = () => {
    if (state !== 'closed') {
        logger_1.default.info('student-service circuit breaker closed');
    }
    state = 'closed';
    samples.length = 0;
};
const openBreaker = () => {
    state = 'open';
    openedAt = Date.now();
    logger_1.default.warn('student-service circuit breaker opened');
};
const withTimeout = async (promise) => {
    let timeout;
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timeout = setTimeout(() => reject(new Error('student-service request timeout')), timeoutMs);
            }),
        ]);
    }
    finally {
        if (timeout)
            clearTimeout(timeout);
    }
};
const callStudentService = async ({ path, init, fallbackValue, }) => {
    const response = await fetch(`${STUDENT_SERVICE_URL}${path}`, init);
    const text = await response.text();
    const data = text ? JSON.parse(text) : fallbackValue;
    if (!response.ok && response.status >= 500) {
        throw new Error(`student-service ${response.status}: ${response.statusText}`);
    }
    return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        data,
    };
};
const fetchStudentResult = async (path, init, fallbackValue) => {
    const request = { path, init, fallbackValue };
    const now = Date.now();
    if (state === 'open') {
        if (now - openedAt < resetTimeoutMs) {
            return fallback(request);
        }
        state = 'halfOpen';
        logger_1.default.warn('student-service circuit breaker half-open');
    }
    try {
        const result = await withTimeout(callStudentService(request));
        if (state === 'halfOpen') {
            closeBreaker();
        }
        else {
            recordSample(true);
        }
        return result;
    }
    catch (err) {
        logger_1.default.warn({ err, path }, 'student-service circuit breaker captured failure');
        if (state === 'halfOpen') {
            openBreaker();
        }
        else {
            recordSample(false);
        }
        return fallback(request);
    }
};
exports.fetchStudentResult = fetchStudentResult;
const fetchStudentJson = async (path, init, fallbackValue) => {
    const result = await (0, exports.fetchStudentResult)(path, init, fallbackValue);
    if (!result.ok) {
        logger_1.default.warn({ path, status: result.status, fromFallback: result.fromFallback }, 'student-service fallback used');
    }
    return result.data;
};
exports.fetchStudentJson = fetchStudentJson;
