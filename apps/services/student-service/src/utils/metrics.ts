import client from 'prom-client';

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

export const httpRequestDurationMs = new client.Histogram({
  name: 'student_http_request_duration_ms',
  help: 'Duration of HTTP requests in student-service in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 5, 15, 50, 100, 200, 300, 400, 500, 1000, 2000, 3000, 5000, 10000]
});

export const dbQueryDuration = new client.Histogram({
  name: 'student_db_query_duration_seconds',
  help: 'Duration of database queries in student-service in seconds',
  labelNames: ['operation']
});

export const redisCacheHits = new client.Counter({
  name: 'student_redis_cache_hits_total',
  help: 'Total number of Redis cache hits in student-service'
});

export const redisCacheMisses = new client.Counter({
  name: 'student_redis_cache_misses_total',
  help: 'Total number of Redis cache misses in student-service'
});

export default client;
