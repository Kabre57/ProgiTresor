import client from 'prom-client';

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

export const httpRequestDurationMs = new client.Histogram({
  name: 'etudiant_http_request_duration_ms',
  help: 'Duration of HTTP requests in etudiant-service in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 5, 15, 50, 100, 200, 300, 400, 500, 1000, 2000, 3000, 5000, 10000]
});

export const dbQueryDuration = new client.Histogram({
  name: 'etudiant_db_query_duration_seconds',
  help: 'Duration of database queries in etudiant-service in seconds',
  labelNames: ['operation']
});

export const redisCacheHits = new client.Counter({
  name: 'etudiant_redis_cache_hits_total',
  help: 'Total number of Redis cache hits in etudiant-service'
});

export const redisCacheMisses = new client.Counter({
  name: 'etudiant_redis_cache_misses_total',
  help: 'Total number of Redis cache misses in etudiant-service'
});

export default client;
