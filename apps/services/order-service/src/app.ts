import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middlewares/errorHandler';
import { extractUserFromHeaders, authorizeRoles, authorizePerimeter, validateInternalSecret } from './middlewares/authMiddleware';
import {
  generateOrders,
  createFromSynthesis,
  attachPdf,
  patchOrder,
  createCorrection,
  updateStatus,
  getOrders,
  healthCheck,
  getMetrics,
  validate,
  getOrderByCode,
  transmettreBudget,
  downloadPivotFile,
  validateAndTransmitMultiple
} from './controllers/orderController';
import {
  getSyntheses,
  getSyntheseById,
  getSyntheseByReference,
} from './controllers/syntheseController';
import { StatusUpdateSchema } from '../../../../shared/types/order.types';
import { httpRequestDurationMs } from './utils/metrics';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Extraction des headers d'authentification du Gateway
app.use(extractUserFromHeaders);

// Middleware de métriques HTTP
app.use((req: Request, res: Response, next: NextFunction) => {
  const end = httpRequestDurationMs.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route ? req.route.path : req.path, code: res.statusCode });
  });
  next();
});

// Swagger OpenAPI Configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Order Service API',
      version: '1.0.0',
      description: 'API for Payment Orders creation and workflow management on ProgiTrésor'
    },
    components: {
      schemas: {
        OrdreTraitement: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            codeOt: { type: 'string' },
            syntheseId: { type: 'integer' },
            antenneId: { type: 'integer' },
            niveauId: { type: 'integer' },
            typeRecetteId: { type: 'integer' },
            montantCumule: { type: 'string' },
            nombreFlux: { type: 'integer' },
            statut: { type: 'string', enum: ['Brouillon', 'EN_ATTENTE_BUDGET', 'Transmis', 'Validé', 'Approuvé', 'Rejeté', 'Payé'] },
            creeParId: { type: 'integer' },
            valideParId: { type: 'integer', nullable: true },
            dateCreation: { type: 'string', format: 'date-time' },
            dateEmission: { type: 'string', format: 'date-time', nullable: true },
            dateTransmissionBudget: { type: 'string', format: 'date-time', nullable: true },
            dateValidationChefComptable: { type: 'string', format: 'date-time', nullable: true },
            validateurChefComptableId: { type: 'integer', nullable: true },
            dateApprobationDirecteurFinancier: { type: 'string', format: 'date-time', nullable: true },
            approbateurDirecteurFinancierId: { type: 'integer', nullable: true },
            motifRejet: { type: 'string', nullable: true },
            dateRejet: { type: 'string', format: 'date-time', nullable: true },
            datePaiement: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        StatusUpdateRequest: {
          type: 'object',
          required: ['statut'],
          properties: {
            statut: {
              type: 'string',
              enum: ['Brouillon', 'EN_ATTENTE_BUDGET', 'Transmis', 'Validé', 'Approuvé', 'Rejeté', 'Payé']
            },
            motif: { type: 'string' }
          }
        },
        SyntheseOT: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            reference: { type: 'string' },
            periodeDebut: { type: 'string', format: 'date' },
            periodeFin: { type: 'string', format: 'date' },
            typeFluxId: { type: 'integer' },
            statut: { type: 'string' },
            auteurId: { type: 'integer' },
            transmisParId: { type: 'integer', nullable: true },
            montantTotal: { type: 'string' },
            nbTransactions: { type: 'integer' },
            dateGeneration: { type: 'string', format: 'date-time' },
            dateTransmission: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                statusCode: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/controllers/*.ts', './dist/apps/services/order-service/src/controllers/*.js']
};
const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ============================================================
// Routes
// ============================================================

// System endpoints
app.get('/health', healthCheck);

app.use(validateInternalSecret);

app.get('/metrics', getMetrics);

// Order endpoints
app.post('/generate', authorizeRoles('BUDGET'), authorizePerimeter('OT', 3, 'GENERATE'), generateOrders);
app.post('/from-synthesis', createFromSynthesis);
app.patch('/:code/attach-pdf', attachPdf);
app.post('/:code/corrections', createCorrection);
app.patch('/:code', patchOrder);
app.put('/:code/status', validate(StatusUpdateSchema), updateStatus);

// Ots transmission endpoints
app.post('/ots/:code/transmettre-budget', authorizeRoles('CHEF_COMPTABLE', 'DF', 'ADMIN'), transmettreBudget);
app.post('/validate-and-transmit', authorizeRoles('CHEF_COMPTABLE', 'DF', 'ADMIN'), validateAndTransmitMultiple);
app.get('/ots/download-pivot/:filename', downloadPivotFile);
app.get('/ots/:code', getOrderByCode);

app.get('/', getOrders);

// Synthese endpoints
app.get('/syntheses', getSyntheses);
app.get('/syntheses/ref/:reference', getSyntheseByReference);
app.get('/syntheses/:id', getSyntheseById);

// Global Error Handler
app.use(errorHandler);

export default app;
