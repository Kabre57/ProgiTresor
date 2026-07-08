import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middlewares/errorHandler';
import { extractUserFromHeaders, authorizePerimeter, validateInternalSecret } from './middlewares/authMiddleware';
import {
  createFromLot,
  getMetrics,
  getOrdrePaiement,
  healthCheck,
  listOrdresPaiement,
  transmettreCompta,
} from './controllers/ordrePaiementController';
import { httpRequestDurationMs } from './utils/metrics';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
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
      title: 'Budget Service API',
      version: '1.0.0',
      description: 'Transformation des lots de traitement hors-budget en ordres de paiement.',
    },
  },
  apis: ['./src/controllers/*.ts', './dist/apps/services/budget-service/src/controllers/*.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', healthCheck);
app.get('/metrics', getMetrics);

app.use(validateInternalSecret);

app.post('/ordres-paiement/from-lot', authorizePerimeter('BUDGET', 3, 'CREATE_OP'), createFromLot);
app.get('/ordres-paiement', authorizePerimeter('BUDGET', 1, 'READ_OP'), listOrdresPaiement);
app.get('/ordres-paiement/:id', authorizePerimeter('BUDGET', 1, 'READ_OP'), getOrdrePaiement);
app.post('/ordres-paiement/:id/transmettre-compta', authorizePerimeter('BUDGET', 3, 'TRANSMIT_OP'), transmettreCompta);

app.use(errorHandler);

export default app;
