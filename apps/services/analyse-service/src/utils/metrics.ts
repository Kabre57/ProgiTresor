import client from 'prom-client';

client.collectDefaultMetrics();

export const httpRequestDurationMs = new client.Histogram({
  name: 'analyse_service_http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [50, 100, 250, 500, 1000, 2000, 5000],
});

export const pdfGenerationCounter = new client.Counter({
  name: 'analyse_service_pdf_generation_total',
  help: 'Number of synthesis PDFs generated',
  labelNames: ['status'],
});

export default client;
