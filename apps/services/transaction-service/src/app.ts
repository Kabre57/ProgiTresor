// BigInt JSON serialization polyfill — Transaction uses BigInt for id and montant
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import multer from 'multer';
import { errorHandler } from './middlewares/errorHandler';
import { extractUserFromHeaders, authorizeRoles, authorizePerimeter, validateInternalSecret } from './middlewares/authMiddleware';
import {
  importTransactions,
  importFile,
  getTransactions,
  getUnassigned,
  linkOt,
  unlinkOt,
  syncOtStatus,
  lockTransactions,
  healthCheck,
  getMetrics,
  validate,
  fetchFromTresor,
  updateTransaction,
  deleteTransaction,
  mergeTransactionsEtudiantId,
  getTransactionsByIds,
  getTransactionsByOtCode,
  transmitOtTransactions
} from './controllers/transactionController';
import {
  getImportFichiers,
  getImportFichierById,
} from './controllers/importFichierController';
import { getKpis, exportTransactions, getGroupedByRecette, exportSynthese } from './controllers/dashboardController';
import {
  ImportPayloadSchema,
  OtStatusSchema,
  LockTransactionsSchema,
  LinkOtSchema,
  UnlinkOtSchema
} from '../../../../shared/types/transaction.types';
import { httpRequestDurationMs } from './utils/metrics';

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB limits
  }
});

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
            code_ot: { type: 'string', nullable: true }
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
            code_ot: { type: 'string', nullable: true }
          }
        },
        LinkOtRequest: {
          type: 'object',
          required: ['code_ot', 'transaction_ids'],
          properties: {
            code_ot: { type: 'string' },
            transaction_ids: { type: 'array', items: { type: 'integer' } }
          }
        },
        UnlinkOtRequest: {
          type: 'object',
          required: ['code_ot'],
          properties: {
            code_ot: { type: 'string' }
          }
        },
        OtStatusRequest: {
          type: 'object',
          required: ['code_ot', 'statut_ot'],
          properties: {
            code_ot: { type: 'string' },
            statut_ot: { type: 'string', enum: ['Brouillon', 'EN_ATTENTE_BUDGET', 'Transmis au Budget', 'Validé', 'Approuvé', 'Rejeté', 'Payé'] }
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
        OrdreTraitement: {
          type: 'object',
          properties: {
            code_ot: { type: 'string' },
            statut_ot: { type: 'string' },
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

app.use(validateInternalSecret);

// Transaction endpoints
app.post('/import', validate(ImportPayloadSchema), importTransactions);
app.post('/import-file', upload.single('file'), importFile);
app.post('/merge-etudiant', mergeTransactionsEtudiantId);
app.post('/link-ot', validate(LinkOtSchema), linkOt);
app.post('/unlink-ot', validate(UnlinkOtSchema), unlinkOt);
app.put('/ot-status', validate(OtStatusSchema), syncOtStatus);
app.patch('/lock', validate(LockTransactionsSchema), lockTransactions);
app.get('/ot/:code/transactions', getTransactionsByOtCode);
app.post('/ot/:code/transmettre', transmitOtTransactions);
app.get('/unassigned', getUnassigned);
app.get('/kpis', authorizeRoles('ADMIN', 'COMPTABLE', 'CHEF_COMPTABLE', 'DF', 'CONSULTANT', 'BUDGET'), getKpis);
app.get('/export', authorizeRoles('ADMIN', 'COMPTABLE', 'CHEF_COMPTABLE', 'DF'), exportTransactions);
app.get('/grouped-by-recette', authorizeRoles('ADMIN', 'COMPTABLE', 'CHEF_COMPTABLE', 'DF', 'CONSULTANT', 'BUDGET'), getGroupedByRecette);
app.get('/export-synthese', authorizeRoles('ADMIN', 'COMPTABLE', 'CHEF_COMPTABLE', 'DF'), exportSynthese);
app.post('/fetch-from-tresor', authorizeRoles('ADMIN'), fetchFromTresor);
app.get('/', authorizePerimeter('IMPORT', 1, 'READ'), getTransactions);
app.post('/by-ids', authorizePerimeter('IMPORT', 1, 'READ'), getTransactionsByIds);
// Import Fichier endpoints
app.get('/imports', getImportFichiers);
app.get('/imports/:id', getImportFichierById);
// NOTE: wildcard /:id routes MUST be last to avoid shadowing specific paths above
app.put('/:id', authorizeRoles('ADMIN', 'COMPTABLE'), updateTransaction);
app.delete('/:id', authorizeRoles('ADMIN', 'COMPTABLE'), deleteTransaction);

// Global Error Handler
app.use(errorHandler);

export default app;
