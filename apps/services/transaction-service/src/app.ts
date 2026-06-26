// BigInt JSON serialization polyfill — Transaction uses BigInt for id and montant
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middlewares/errorHandler';
import { extractUserFromHeaders, authorizeRoles } from './middlewares/authMiddleware';
import {
  importTransactions,
  getTransactions,
  getUnassigned,
  linkOp,
  unlinkOp,
  syncOpStatus,
  healthCheck,
  getMetrics,
  validate,
  fetchFromTresor,
  updateTransaction,
  deleteTransaction,
  mergeTransactionsEtudiantId
} from './controllers/transactionController';
import {
  getImportFichiers,
  getImportFichierById,
} from './controllers/importFichierController';
import { getKpis, exportTransactions, getGroupedByRecette, exportSynthese } from './controllers/dashboardController';
import {
  ImportPayloadSchema,
  OpStatusSchema,
  LinkOpSchema,
  UnlinkOpSchema
} from '../../../../shared/types/transaction.types';
import { httpRequestDurationMs } from './utils/metrics';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
      title: 'Transaction Service API',
      version: '1.0.0',
      description: 'API for Transaction imports, cleanups, and queries on ProgiTrésor'
    },
    components: {
      schemas: {
        TransactionItem: {
          type: 'object',
          required: ['reference_tresor', 'montant', 'date_heure', 'produit'],
          properties: {
            reference_tresor: { type: 'string' },
            montant: { type: 'number', minimum: 0 },
            nom_payeur: { type: 'string', nullable: true },
            matricule_etudiant: { type: 'string', nullable: true },
            date_heure: { type: 'string', format: 'date-time' },
            produit: { type: 'string' },
            reference_source: { type: 'string', nullable: true },
            code_op: { type: 'string', nullable: true }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            id_transaction: { type: 'integer' },
            reference_tresor: { type: 'string' },
            date_heure: { type: 'string', format: 'date-time' },
            montant: { type: 'number' },
            nom_payeur: { type: 'string', nullable: true },
            matricule_etudiant: { type: 'string', nullable: true },
            code_produit: { type: 'string', nullable: true },
            produit: {
              type: 'object', nullable: true,
              properties: {
                code_produit: { type: 'string' },
                libelle_standard: { type: 'string' },
                type_flux: { type: 'string' },
                hors_budget: { type: 'boolean' }
              }
            },
            reference_source: { type: 'string', nullable: true },
            date_import: { type: 'string', format: 'date-time' },
            code_op: { type: 'string', nullable: true }
          }
        },
        LinkOpRequest: {
          type: 'object',
          required: ['code_op', 'transaction_ids'],
          properties: {
            code_op: { type: 'string' },
            transaction_ids: { type: 'array', items: { type: 'integer' } }
          }
        },
        UnlinkOpRequest: {
          type: 'object',
          required: ['code_op'],
          properties: {
            code_op: { type: 'string' }
          }
        },
        OpStatusRequest: {
          type: 'object',
          required: ['code_op', 'statut_op'],
          properties: {
            code_op: { type: 'string' },
            statut_op: { type: 'string', enum: ['Brouillon', 'Transmis au Budget', 'Validé', 'Approuvé', 'Rejeté', 'Payé'] }
          }
        },
        ImportFichier: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            nomFichier: { type: 'string' },
            typeFichier: { type: 'string' },
            auteurId: { type: 'integer' },
            dateImport: { type: 'string', format: 'date-time' },
            periodeDebut: { type: 'string', format: 'date', nullable: true },
            periodeFin: { type: 'string', format: 'date', nullable: true },
            nbLignesLues: { type: 'integer', nullable: true },
            nbLignesTraitees: { type: 'integer', nullable: true },
            nbErreurs: { type: 'integer', nullable: true },
            statut: { type: 'string' },
            logsErreurs: { type: 'string', nullable: true }
          }
        },
        OrdrePaiement: {
          type: 'object',
          properties: {
            code_op: { type: 'string' },
            statut_op: { type: 'string' },
            date_synchronisation: { type: 'string', format: 'date-time' }
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
  apis: ['./src/controllers/*.ts', './dist/src/controllers/*.js']
};
const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ============================================================
// Routes
// ============================================================

// System endpoints
app.get('/health', healthCheck);
app.get('/metrics', getMetrics);

// Transaction endpoints
app.post('/import', validate(ImportPayloadSchema), importTransactions);
app.post('/merge-etudiant', mergeTransactionsEtudiantId);
app.post('/link-op', validate(LinkOpSchema), linkOp);
app.post('/unlink-op', validate(UnlinkOpSchema), unlinkOp);
app.put('/op-status', validate(OpStatusSchema), syncOpStatus);
app.get('/unassigned', getUnassigned);
app.get('/kpis', authorizeRoles('ADMIN', 'COMPTABLE', 'CHEF_COMPTABLE', 'DF', 'CONSULTANT'), getKpis);
app.get('/export', authorizeRoles('ADMIN', 'COMPTABLE', 'CHEF_COMPTABLE', 'DF'), exportTransactions);
app.get('/grouped-by-recette', authorizeRoles('ADMIN', 'COMPTABLE', 'CHEF_COMPTABLE', 'DF', 'CONSULTANT'), getGroupedByRecette);
app.get('/export-synthese', authorizeRoles('ADMIN', 'COMPTABLE', 'CHEF_COMPTABLE', 'DF'), exportSynthese);
app.post('/fetch-from-tresor', authorizeRoles('ADMIN'), fetchFromTresor);
app.get('/', getTransactions);
// NOTE: wildcard /:id routes MUST be last to avoid shadowing specific paths above
app.put('/:id', authorizeRoles('ADMIN', 'COMPTABLE'), updateTransaction);
app.delete('/:id', authorizeRoles('ADMIN', 'COMPTABLE'), deleteTransaction);

// Import Fichier endpoints
app.get('/imports', getImportFichiers);
app.get('/imports/:id', getImportFichierById);

// Global Error Handler
app.use(errorHandler);

export default app;
