import client from 'prom-client';

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

export const httpRequestDurationMs = new client.Histogram({
  name: 'order_http_request_duration_ms',
  help: 'Duration of HTTP requests in order-service in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 5, 15, 50, 100, 200, 300, 400, 500, 1000, 2000, 3000, 5000, 10000]
});

export const dbQueryDuration = new client.Histogram({
  name: 'order_db_query_duration_seconds',
  help: 'Duration of database queries in order-service in seconds',
  labelNames: ['operation']
});

export const sagaSuccessCounter = new client.Counter({
  name: 'order_saga_success_total',
  help: 'Total number of successfully executed payment order sagas'
});

export const sagaRollbackCounter = new client.Counter({
  name: 'order_saga_rollback_total',
  help: 'Total number of rolled back payment order sagas'
});

export const outboxPendingGauge = new client.Gauge({
  name: 'outbox_messages_pending_total',
  help: 'Total number of pending outbox messages'
});

export const outboxProcessedGauge = new client.Gauge({
  name: 'outbox_messages_processed_total',
  help: 'Total number of processed outbox messages'
});

export const outboxFailedGauge = new client.Gauge({
  name: 'outbox_messages_failed_total',
  help: 'Total number of failed outbox messages'
});

export const outboxMessageAgeGauge = new client.Gauge({
  name: 'outbox_message_age_seconds',
  help: 'Age of the oldest pending outbox message in seconds'
});

export default client;
