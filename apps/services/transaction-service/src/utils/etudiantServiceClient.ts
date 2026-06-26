import logger from './logger';

const ETUDIANT_SERVICE_URL = process.env.ETUDIANT_SERVICE_URL || 'http://etudiant-service:5002';

type EtudiantServiceRequest<T> = {
  path: string;
  init?: RequestInit;
  fallbackValue: T;
};

type EtudiantServiceResult<T> = {
  ok: boolean;
  status: number;
  statusText: string;
  data: T;
  fromFallback?: boolean;
};

type BreakerState = 'closed' | 'open' | 'halfOpen';

const timeoutMs = Number(process.env.ETUDIANT_SERVICE_CB_TIMEOUT_MS ?? 5000);
const errorThresholdPercentage = Number(process.env.ETUDIANT_SERVICE_CB_ERROR_THRESHOLD ?? 50);
const resetTimeoutMs = Number(process.env.ETUDIANT_SERVICE_CB_RESET_TIMEOUT_MS ?? 15000);
const rollingWindowMs = Number(process.env.ETUDIANT_SERVICE_CB_ROLLING_TIMEOUT_MS ?? 10000);
const minSamples = Number(process.env.ETUDIANT_SERVICE_CB_MIN_SAMPLES ?? 5);

let state: BreakerState = 'closed';
let openedAt = 0;
const samples: Array<{ at: number; success: boolean }> = [];

const fallback = <T>(request: EtudiantServiceRequest<T>): EtudiantServiceResult<T> => ({
  ok: false,
  status: 503,
  statusText: 'etudiant-service circuit breaker fallback',
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
    logger.warn({ errorRate, samples: samples.length }, 'etudiant-service circuit breaker opened');
  }
};

const closeBreaker = () => {
  if (state !== 'closed') {
    logger.info('etudiant-service circuit breaker closed');
  }
  state = 'closed';
  samples.length = 0;
};

const openBreaker = () => {
  state = 'open';
  openedAt = Date.now();
  logger.warn('etudiant-service circuit breaker opened');
};

const withTimeout = async <T>(promise: Promise<T>): Promise<T> => {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('etudiant-service request timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const callEtudiantService = async <T>({
  path,
  init,
  fallbackValue,
}: EtudiantServiceRequest<T>): Promise<EtudiantServiceResult<T>> => {
  const response = await fetch(`${ETUDIANT_SERVICE_URL}${path}`, init);
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : fallbackValue;

  if (!response.ok && response.status >= 500) {
    throw new Error(`etudiant-service ${response.status}: ${response.statusText}`);
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    data,
  };
};

export const fetchEtudiantResult = async <T>(
  path: string,
  init: RequestInit | undefined,
  fallbackValue: T,
): Promise<EtudiantServiceResult<T>> => {
  const request = { path, init, fallbackValue };
  const now = Date.now();

  if (state === 'open') {
    if (now - openedAt < resetTimeoutMs) {
      return fallback(request);
    }
    state = 'halfOpen';
    logger.warn('etudiant-service circuit breaker half-open');
  }

  try {
    const result = await withTimeout(callEtudiantService(request));
    if (state === 'halfOpen') {
      closeBreaker();
    } else {
      recordSample(true);
    }
    return result;
  } catch (err) {
    logger.warn({ err, path }, 'etudiant-service circuit breaker captured failure');
    if (state === 'halfOpen') {
      openBreaker();
    } else {
      recordSample(false);
    }
    return fallback(request);
  }
};

export const fetchEtudiantJson = async <T>(
  path: string,
  init: RequestInit | undefined,
  fallbackValue: T,
): Promise<T> => {
  const result = await fetchEtudiantResult(path, init, fallbackValue);
  if (!result.ok) {
    logger.warn({ path, status: result.status, fromFallback: result.fromFallback }, 'etudiant-service fallback used');
  }
  return result.data;
};
