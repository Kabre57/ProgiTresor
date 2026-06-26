import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middlewares/errorHandler';
import { extractUserFromHeaders, authorizeRoles } from './middlewares/authMiddleware';
import {
  generateOrders,
  updateStatus,
  getOrders,
  healthCheck,
  getMetrics,
  validate
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
app.use(express.json());

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
        OrdrePaiement: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            codeOp: { type: 'string' },
            syntheseId: { type: 'integer' },
            antenneId: { type: 'integer' },
            filiereId: { type: 'integer' },
            typeRecetteId: { type: 'integer' },
            montantCumule: { type: 'string' },
            nombreFlux: { type: 'integer' },
            statut: { type: 'string', enum: ['Brouillon', 'Transmis', 'Validé', 'Approuvé', 'Rejeté', 'Payé'] },
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
              enum: ['Brouillon', 'Transmis', 'Validé', 'Approuvé', 'Rejeté', 'Payé']
            },
            motif: { type: 'string' }
          }
        },
        SyntheseOP: {
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
app.get('/metrics', getMetrics);

// Order endpoints
app.post('/generate', authorizeRoles('COMPTABLE', 'ADMIN'), generateOrders);
app.put('/:code/status', validate(StatusUpdateSchema), updateStatus);
app.get('/', getOrders);

// Synthese endpoints
app.get('/syntheses', getSyntheses);
app.get('/syntheses/ref/:reference', getSyntheseByReference);
app.get('/syntheses/:id', getSyntheseById);

// Global Error Handler
app.use(errorHandler);

export default app;
