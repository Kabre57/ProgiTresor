import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { extractUserFromHeaders, authorizePerimeter, validateInternalSecret } from './middlewares/authMiddleware';
import { errorHandler } from './middlewares/errorHandler';
import {
  createEntry,
  listEntries,
  getEntryById,
  healthCheck,
  getMetrics,
} from './controllers/accounting.controller';
import {
  controlerOp,
  createBordereauFromOts,
  createLot,
  getBordereau,
  getLot,
  listBordereaux,
  listControles,
  listEcritures,
  listPendingEcritures,
  listLignesBudgetaires,
  listLots,
  traiterLot,
  transmettreLotBudget,
  upsertLigneBudgetaire,
} from './controllers/budgetWorkflow.controller';
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
      title: 'Compta Service API',
      version: '1.0.0',
      description: 'SYSCOHADA accounting entry aggregation and ledger integration for ProgiTresor',
    },
  },
  apis: ['./src/controllers/*.ts', './dist/apps/services/compta-service/src/controllers/*.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', healthCheck);
app.get('/metrics', getMetrics);

app.use(validateInternalSecret);

// Endpoint de création d'écriture (utilisé par le worker outbox de l'order-service)
app.post('/entries', createEntry);
app.get('/entries', authorizePerimeter('ANALYSE', 1, 'READ_KPIS'), listEntries);
app.get('/entries/:id', authorizePerimeter('ANALYSE', 1, 'READ_KPIS'), getEntryById);

// Réception et traitement des OT hors-budget par bordereaux et lots.
app.post('/bordereaux/from-ots', createBordereauFromOts);
app.get('/bordereaux', authorizePerimeter('BUDGET', 1, 'READ_BORDEREAU'), listBordereaux);
app.get('/bordereaux/:id', authorizePerimeter('BUDGET', 1, 'READ_BORDEREAU'), getBordereau);
app.get('/bordereaux/:id/ecritures', authorizePerimeter('BUDGET', 1, 'READ_ECRITURES'), listEcritures);
app.get('/ecritures/pending', authorizePerimeter('BUDGET', 1, 'READ_ECRITURES'), listPendingEcritures);

app.get('/lignes-budgetaires', authorizePerimeter('BUDGET', 1, 'READ_LIGNE'), listLignesBudgetaires);
app.post('/lignes-budgetaires', authorizePerimeter('BUDGET', 2, 'UPSERT_LIGNE'), upsertLigneBudgetaire);

app.post('/lots', authorizePerimeter('BUDGET', 2, 'CREATE_LOT'), createLot);
app.get('/lots', authorizePerimeter('BUDGET', 1, 'READ_LOT'), listLots);
app.get('/lots/:id', authorizePerimeter('BUDGET', 1, 'READ_LOT'), getLot);
app.post('/lots/:id/traiter', authorizePerimeter('BUDGET', 3, 'PROCESS_LOT'), traiterLot);
app.post('/lots/:id/transmettre-budget', authorizePerimeter('BUDGET', 3, 'TRANSMIT_BUDGET'), transmettreLotBudget);

app.post('/controles/op', controlerOp);
app.get('/controles/op', authorizePerimeter('BUDGET', 1, 'READ_CONTROL'), listControles);

app.use(errorHandler);

export default app;
