"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// BigInt JSON serialization polyfill — Transaction uses BigInt for id and montant
BigInt.prototype.toJSON = function () {
    return this.toString();
};
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const errorHandler_1 = require("./middlewares/errorHandler");
const authMiddleware_1 = require("./middlewares/authMiddleware");
const transactionController_1 = require("./controllers/transactionController");
const importFichierController_1 = require("./controllers/importFichierController");
const dashboardController_1 = require("./controllers/dashboardController");
const transaction_types_1 = require("../../../../shared/types/transaction.types");
const metrics_1 = require("./utils/metrics");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
// Extraction des headers d'authentification du Gateway
app.use(authMiddleware_1.extractUserFromHeaders);
// Middleware de métriques HTTP
app.use((req, res, next) => {
    const end = metrics_1.httpRequestDurationMs.startTimer();
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
const swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
// ============================================================
// Routes
// ============================================================
// System endpoints
app.get('/health', transactionController_1.healthCheck);
app.get('/metrics', transactionController_1.getMetrics);
// Transaction endpoints
app.post('/import', (0, transactionController_1.validate)(transaction_types_1.ImportPayloadSchema), transactionController_1.importTransactions);
app.post('/merge-etudiant', transactionController_1.mergeTransactionsEtudiantId);
app.post('/link-op', (0, transactionController_1.validate)(transaction_types_1.LinkOpSchema), transactionController_1.linkOp);
app.post('/unlink-op', (0, transactionController_1.validate)(transaction_types_1.UnlinkOpSchema), transactionController_1.unlinkOp);
app.put('/op-status', (0, transactionController_1.validate)(transaction_types_1.OpStatusSchema), transactionController_1.syncOpStatus);
app.get('/unassigned', transactionController_1.getUnassigned);
app.get('/kpis', (0, authMiddleware_1.authorizeRoles)('ADMIN', 'COMPTABLE', 'CHEF_COMPTABLE', 'DF', 'CONSULTANT'), dashboardController_1.getKpis);
app.get('/export', (0, authMiddleware_1.authorizeRoles)('ADMIN', 'COMPTABLE', 'CHEF_COMPTABLE', 'DF'), dashboardController_1.exportTransactions);
app.get('/grouped-by-recette', (0, authMiddleware_1.authorizeRoles)('ADMIN', 'COMPTABLE', 'CHEF_COMPTABLE', 'DF', 'CONSULTANT'), dashboardController_1.getGroupedByRecette);
app.get('/export-synthese', (0, authMiddleware_1.authorizeRoles)('ADMIN', 'COMPTABLE', 'CHEF_COMPTABLE', 'DF'), dashboardController_1.exportSynthese);
app.post('/fetch-from-tresor', (0, authMiddleware_1.authorizeRoles)('ADMIN'), transactionController_1.fetchFromTresor);
app.get('/', transactionController_1.getTransactions);
// NOTE: wildcard /:id routes MUST be last to avoid shadowing specific paths above
app.put('/:id', (0, authMiddleware_1.authorizeRoles)('ADMIN', 'COMPTABLE'), transactionController_1.updateTransaction);
app.delete('/:id', (0, authMiddleware_1.authorizeRoles)('ADMIN', 'COMPTABLE'), transactionController_1.deleteTransaction);
// Import Fichier endpoints
app.get('/imports', importFichierController_1.getImportFichiers);
app.get('/imports/:id', importFichierController_1.getImportFichierById);
// Global Error Handler
app.use(errorHandler_1.errorHandler);
exports.default = app;
