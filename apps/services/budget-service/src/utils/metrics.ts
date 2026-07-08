import client from 'prom-client';

client.collectDefaultMetrics();

export const httpRequestDurationMs = new client.Histogram({
  name: 'budget_service_http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [50, 100, 250, 500, 1000, 2000, 5000],
});

export const dbQueryDuration = new client.Histogram({
  name: 'budget_service_db_query_duration_ms',
  help: 'Duration of Database queries in ms',
  labelNames: ['operation'],
  buckets: [10, 50, 100, 250, 500, 1000],
});

export default client;
