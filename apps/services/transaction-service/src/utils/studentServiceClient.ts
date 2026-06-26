import logger from './logger';

const STUDENT_SERVICE_URL = process.env.STUDENT_SERVICE_URL || 'http://student-service:5002';

type StudentServiceRequest<T> = {
  path: string;
  init?: RequestInit;
  fallbackValue: T;
};

type StudentServiceResult<T> = {
  ok: boolean;
  status: number;
  statusText: string;
  data: T;
  fromFallback?: boolean;
};

type BreakerState = 'closed' | 'open' | 'halfOpen';

const timeoutMs = Number(process.env.STUDENT_SERVICE_CB_TIMEOUT_MS ?? 5000);
const errorThresholdPercentage = Number(process.env.STUDENT_SERVICE_CB_ERROR_THRESHOLD ?? 50);
const resetTimeoutMs = Number(process.env.STUDENT_SERVICE_CB_RESET_TIMEOUT_MS ?? 15000);
const rollingWindowMs = Number(process.env.STUDENT_SERVICE_CB_ROLLING_TIMEOUT_MS ?? 10000);
const minSamples = Number(process.env.STUDENT_SERVICE_CB_MIN_SAMPLES ?? 5);

let state: BreakerState = 'closed';
let openedAt = 0;
const samples: Array<{ at: number; success: boolean }> = [];

const fallback = <T>(request: StudentServiceRequest<T>): StudentServiceResult<T> => ({
  ok: false,
  status: 503,
  statusText: 'student-service circuit breaker fallback',
  data: request.fallbackValue,
  fromFallback: true,
});

const recordSample = (success: boolean) => {
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
    logger.warn({ errorRate, samples: samples.length }, 'student-service circuit breaker opened');
  }
};

const closeBreaker = () => {
  if (state !== 'closed') {
    logger.info('student-service circuit breaker closed');
  }
  state = 'closed';
  samples.length = 0;
};

const openBreaker = () => {
  state = 'open';
  openedAt = Date.now();
  logger.warn('student-service circuit breaker opened');
};

const withTimeout = async <T>(promise: Promise<T>): Promise<T> => {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('student-service request timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const callStudentService = async <T>({
  path,
  init,
  fallbackValue,
}: StudentServiceRequest<T>): Promise<StudentServiceResult<T>> => {
  const response = await fetch(`${STUDENT_SERVICE_URL}${path}`, init);
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : fallbackValue;

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

export const fetchStudentResult = async <T>(
  path: string,
  init: RequestInit | undefined,
  fallbackValue: T,
): Promise<StudentServiceResult<T>> => {
  const request = { path, init, fallbackValue };
  const now = Date.now();

  if (state === 'open') {
    if (now - openedAt < resetTimeoutMs) {
      return fallback(request);
    }
    state = 'halfOpen';
    logger.warn('student-service circuit breaker half-open');
  }

  try {
    const result = await withTimeout(callStudentService(request));
    if (state === 'halfOpen') {
      closeBreaker();
    } else {
      recordSample(true);
    }
    return result;
  } catch (err) {
    logger.warn({ err, path }, 'student-service circuit breaker captured failure');
    if (state === 'halfOpen') {
      openBreaker();
    } else {
      recordSample(false);
    }
    return fallback(request);
  }
};

export const fetchStudentJson = async <T>(
  path: string,
  init: RequestInit | undefined,
  fallbackValue: T,
): Promise<T> => {
  const result = await fetchStudentResult(path, init, fallbackValue);
  if (!result.ok) {
    logger.warn({ path, status: result.status, fromFallback: result.fromFallback }, 'student-service fallback used');
  }
  return result.data;
};
