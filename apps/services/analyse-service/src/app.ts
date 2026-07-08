import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { extractUserFromHeaders, authorizePerimeter, validateInternalSecret } from './middlewares/authMiddleware';
import { errorHandler } from './middlewares/errorHandler';
import {
  generateSynthesis,
  validateSynthesis,
  getKpis,
  healthCheck,
  getMetrics,
  servePdf,
  handleSseConnection,
  previewPdf,
  generateAttestation,
} from './controllers/analyseController';
import { httpRequestDurationMs } from './utils/metrics';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.get('/uploads/pdfs/:filename', servePdf);
app.use('/uploads', express.static(process.env.PDF_UPLOAD_ROOT || path.join(process.cwd(), 'uploads')));
app.use(extractUserFromHeaders);

app.use((req: Request, res: Response, next: NextFunction) => {
  const end = httpRequestDurationMs.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route ? req.route.path : req.path, code: res.statusCode });
  });
  next();
});

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Analyse Service API',
      version: '1.0.0',
      description: 'Aggregation, synthesis and PDF generation API for ProgiTresor',
    },
  },
  apis: ['./src/controllers/*.ts', './dist/apps/services/analyse-service/src/controllers/*.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', healthCheck);
app.get('/metrics', getMetrics);

app.use(validateInternalSecret);

app.get('/kpis', authorizePerimeter('ANALYSE', 1, 'READ_KPIS'), getKpis);
app.get('/stream', authorizePerimeter('ANALYSE', 1, 'READ_KPIS'), handleSseConnection);
app.post('/generate-synthesis', authorizePerimeter('ANALYSE', 2, 'GENERATE_SYNTHESIS'), generateSynthesis);
app.post('/validate-synthesis', authorizePerimeter('ANALYSE', 2, 'VALIDATE_SYNTHESIS'), validateSynthesis);
app.post('/preview-pdf', authorizePerimeter('ANALYSE', 2, 'VALIDATE_SYNTHESIS'), previewPdf);
app.post('/generate-attestation', generateAttestation);

app.use(errorHandler);

export default app;
