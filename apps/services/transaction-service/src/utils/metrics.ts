import client from 'prom-client';

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

export const httpRequestDurationMs = new client.Histogram({
  name: 'transaction_http_request_duration_ms',
  help: 'Duration of HTTP requests in transaction-service in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 5, 15, 50, 100, 200, 300, 400, 500, 1000, 2000, 3000, 5000, 10000]
});

export const dbQueryDuration = new client.Histogram({
  name: 'transaction_db_query_duration_seconds',
  help: 'Duration of database queries in transaction-service in seconds',
  labelNames: ['operation']
});

export const importCounter = new client.Counter({
  name: 'transaction_imports_total',
  help: 'Total transactions imported',
  labelNames: ['status']
});

export default client;
