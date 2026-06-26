import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import multer from 'multer';
import { errorHandler } from './middlewares/errorHandler';
import { extractUserFromHeaders, authorizeRoles } from './middlewares/authMiddleware';
import { importEtudiants } from './controllers/importController';
import {
  getEtudiantByMatricule,
  createEtudiant,
  updateEtudiant,
  batchLookup,
  healthCheck,
  getMetrics,
  validate,
  getEtudiants,
  batchLookupIds,
  getEtudiantByTresorPay,
  mapEtudiantTresorPay,
  upsertTemporaryEtudiant,
  getMe,
  getTemporaryEtudiantNotifications,
  markTemporaryEtudiantNotificationTreated,
  getDistinctPromotions
} from './controllers/etudiantController';
import { uploadEtudiantPhoto, deleteEtudiantPhoto } from './controllers/photoController';
import * as antenneCtrl from './controllers/antenneController';
import * as filiereCtrl from './controllers/filiereController';
import * as statutCtrl from './controllers/statutEtudiantController';
import * as typeFluxCtrl from './controllers/typeFluxController';
import * as typeRecetteCtrl from './controllers/typeRecetteController';
import * as nomenclatureCtrl from './controllers/nomenclatureProduitController';
import * as promotionCtrl from './controllers/promotionController';
import {
  EtudiantCreateSchema,
  EtudiantUpdateSchema,
  BatchLookupSchema,
  AntenneCreateSchema,
  AntenneUpdateSchema,
  FiliereCreateSchema,
  FiliereUpdateSchema,
  StatutEtudiantCreateSchema,
  StatutEtudiantUpdateSchema,
  TypeFluxCreateSchema,
  TypeFluxUpdateSchema,
  TypeRecetteCreateSchema,
  TypeRecetteUpdateSchema,
  NomenclatureProduitCreateSchema,
  NomenclatureProduitUpdateSchema,
  PromotionCreateSchema,
  PromotionUpdateSchema,
} from '../../../../shared/types/etudiant.types';
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

// ============================================================
// RBAC helpers
// ============================================================
const READ_ROLES = ['ADMIN', 'CHEF_COMPTABLE', 'COMPTABLE', 'DIR_FINANCIER', 'CONSULTANT'];
const WRITE_ROLES = ['ADMIN'];

// ============================================================
// Swagger OpenAPI Configuration
// ============================================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Etudiant Service API',
      version: '2.0.0',
      description: 'API for Etudiant Master Data, Referentials and Antennas on ProgiTrésor'
    },
    components: {
      schemas: {
        Etudiant: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            matricule: { type: 'string' },
            nom: { type: 'string' },
            prenom: { type: 'string' },
            prefixeMatricule: { type: 'string', nullable: true },
            antenneId: { type: 'integer' },
            antenne: { $ref: '#/components/schemas/Antenne' },
            filiereId: { type: 'integer' },
            filiere: { $ref: '#/components/schemas/Filiere' },
            statutId: { type: 'integer' },
            statut: { $ref: '#/components/schemas/StatutEtudiant' },
            dateCreation: { type: 'string', format: 'date-time' }
          }
        },
        Antenne: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            code: { type: 'string' },
            nom: { type: 'string' },
            ville: { type: 'string' },
            actif: { type: 'boolean' }
          }
        },
        AntenneCreate: {
          type: 'object',
          required: ['code', 'nom', 'ville'],
          properties: {
            code: { type: 'string', maxLength: 10 },
            nom: { type: 'string', maxLength: 80 },
            ville: { type: 'string', maxLength: 60 },
            actif: { type: 'boolean', default: true }
          }
        },
        AntenneUpdate: { type: 'object', properties: { code: { type: 'string' }, nom: { type: 'string' }, ville: { type: 'string' }, actif: { type: 'boolean' } } },
        Filiere: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            code: { type: 'string' },
            libelle: { type: 'string' },
            cycle: { type: 'string' },
            anneeEtude: { type: 'integer' }
          }
        },
        FiliereCreate: { type: 'object', required: ['code', 'libelle', 'cycle', 'anneeEtude'], properties: { code: { type: 'string' }, libelle: { type: 'string' }, cycle: { type: 'string' }, anneeEtude: { type: 'integer' } } },
        StatutEtudiant: {
          type: 'object',
          properties: { id: { type: 'integer' }, code: { type: 'string' }, libelle: { type: 'string' } }
        },
        StatutEtudiantCreate: { type: 'object', required: ['code', 'libelle'], properties: { code: { type: 'string' }, libelle: { type: 'string' } } },
        TypeFlux: {
          type: 'object',
          properties: { id: { type: 'integer' }, code: { type: 'string' }, libelle: { type: 'string' } }
        },
        TypeFluxCreate: { type: 'object', required: ['code', 'libelle'], properties: { code: { type: 'string' }, libelle: { type: 'string' } } },
        TypeRecette: {
          type: 'object',
          properties: { id: { type: 'integer' }, code: { type: 'string' }, libelle: { type: 'string' }, typeFluxId: { type: 'integer' }, typeFlux: { $ref: '#/components/schemas/TypeFlux' } }
        },
        TypeRecetteCreate: { type: 'object', required: ['code', 'libelle', 'typeFluxId'], properties: { code: { type: 'string' }, libelle: { type: 'string' }, typeFluxId: { type: 'integer' } } },
        NomenclatureProduit: {
          type: 'object',
          properties: { id: { type: 'integer' }, libelleBrut: { type: 'string' }, codeProduit: { type: 'string' }, libelleStandard: { type: 'string' }, typeRecetteId: { type: 'integer' }, filiereId: { type: 'integer', nullable: true }, statutId: { type: 'integer', nullable: true }, numVersement: { type: 'integer', nullable: true }, actif: { type: 'boolean' } }
        },
        NomenclatureProduitCreate: { type: 'object', required: ['libelleBrut', 'codeProduit', 'libelleStandard', 'typeRecetteId'], properties: { libelleBrut: { type: 'string' }, codeProduit: { type: 'string' }, libelleStandard: { type: 'string' }, typeRecetteId: { type: 'integer' }, filiereId: { type: 'integer', nullable: true }, statutId: { type: 'integer', nullable: true }, numVersement: { type: 'integer', nullable: true }, actif: { type: 'boolean' } } },
        ErrorResponse: {
          type: 'object',
          properties: { error: { type: 'object', properties: { message: { type: 'string' }, statusCode: { type: 'integer' } } } }
        }
      }
    }
  },
  apis: ['./src/controllers/*.ts', './dist/src/controllers/*.js']
};
const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ============================================================
// Routes – System
// ============================================================
app.get('/health', healthCheck);
app.get('/metrics', getMetrics);

// ============================================================
// Routes – System
// ============================================================

// ============================================================
// Routes – Antennes CRUD
// ============================================================
app.get('/antennes', antenneCtrl.getAll);
app.get('/antennes/:id', antenneCtrl.getById);
app.post('/antennes', authorizeRoles(...WRITE_ROLES), validate(AntenneCreateSchema), antenneCtrl.create);
app.put('/antennes/:id', authorizeRoles(...WRITE_ROLES), validate(AntenneUpdateSchema), antenneCtrl.update);
app.delete('/antennes/:id', authorizeRoles(...WRITE_ROLES), antenneCtrl.remove);

// ============================================================
// Routes – Filieres CRUD
// ============================================================
app.get('/filieres', filiereCtrl.getAll);
app.get('/filieres/:id', filiereCtrl.getById);
app.post('/filieres', authorizeRoles(...WRITE_ROLES), validate(FiliereCreateSchema), filiereCtrl.create);
app.put('/filieres/:id', authorizeRoles(...WRITE_ROLES), validate(FiliereUpdateSchema), filiereCtrl.update);
app.delete('/filieres/:id', authorizeRoles(...WRITE_ROLES), filiereCtrl.remove);

// Legacy aliases kept temporarily for integrations still calling /niveaux.
app.get('/niveaux', filiereCtrl.getAll);
app.get('/niveaux/:id', filiereCtrl.getById);
app.post('/niveaux', authorizeRoles(...WRITE_ROLES), validate(FiliereCreateSchema), filiereCtrl.create);
app.put('/niveaux/:id', authorizeRoles(...WRITE_ROLES), validate(FiliereUpdateSchema), filiereCtrl.update);
app.delete('/niveaux/:id', authorizeRoles(...WRITE_ROLES), filiereCtrl.remove);

// ============================================================
// Routes – Statuts Étudiants CRUD
// ============================================================
app.get('/statuts-etudiant', statutCtrl.getAll);
app.get('/statuts-etudiant/:id', statutCtrl.getById);
app.post('/statuts-etudiant', authorizeRoles(...WRITE_ROLES), validate(StatutEtudiantCreateSchema), statutCtrl.create);
app.put('/statuts-etudiant/:id', authorizeRoles(...WRITE_ROLES), validate(StatutEtudiantUpdateSchema), statutCtrl.update);
app.delete('/statuts-etudiant/:id', authorizeRoles(...WRITE_ROLES), statutCtrl.remove);

// ============================================================
// Routes – Types Flux CRUD
// ============================================================
app.get('/types-flux', typeFluxCtrl.getAll);
app.get('/types-flux/:id', typeFluxCtrl.getById);
app.post('/types-flux', authorizeRoles(...WRITE_ROLES), validate(TypeFluxCreateSchema), typeFluxCtrl.create);
app.put('/types-flux/:id', authorizeRoles(...WRITE_ROLES), validate(TypeFluxUpdateSchema), typeFluxCtrl.update);
app.delete('/types-flux/:id', authorizeRoles(...WRITE_ROLES), typeFluxCtrl.remove);

// ============================================================
// Routes – Types Recettes CRUD
// ============================================================
app.get('/types-recettes', typeRecetteCtrl.getAll);
app.get('/types-recettes/:id', typeRecetteCtrl.getById);
app.post('/types-recettes', authorizeRoles(...WRITE_ROLES), validate(TypeRecetteCreateSchema), typeRecetteCtrl.create);
app.put('/types-recettes/:id', authorizeRoles(...WRITE_ROLES), validate(TypeRecetteUpdateSchema), typeRecetteCtrl.update);
app.delete('/types-recettes/:id', authorizeRoles(...WRITE_ROLES), typeRecetteCtrl.remove);

// ============================================================
// Routes – Nomenclatures Produit CRUD
// ============================================================
app.get('/nomenclatures', nomenclatureCtrl.getAll);
app.get('/nomenclatures/:id', nomenclatureCtrl.getById);
app.post('/nomenclatures', authorizeRoles(...WRITE_ROLES), validate(NomenclatureProduitCreateSchema), nomenclatureCtrl.create);
app.put('/nomenclatures/:id', authorizeRoles(...WRITE_ROLES), validate(NomenclatureProduitUpdateSchema), nomenclatureCtrl.update);
app.delete('/nomenclatures/:id', authorizeRoles(...WRITE_ROLES), nomenclatureCtrl.remove);

// ============================================================
// Routes – Etudiants
// ============================================================
const upload = multer({ storage: multer.memoryStorage() });

app.post('/import', authorizeRoles('ADMIN'), upload.single('file'), importEtudiants);
// ============================================================
// Routes – Promotions CRUD
// ============================================================
app.get('/promotions', promotionCtrl.getAll);
app.get('/promotions/:id', promotionCtrl.getById);
app.post('/promotions', authorizeRoles(...WRITE_ROLES), validate(PromotionCreateSchema), promotionCtrl.create);
app.put('/promotions/:id', authorizeRoles(...WRITE_ROLES), validate(PromotionUpdateSchema), promotionCtrl.update);
app.delete('/promotions/:id', authorizeRoles(...WRITE_ROLES), promotionCtrl.remove);
app.post('/batch', validate(BatchLookupSchema), batchLookup);
app.post('/batch-ids', batchLookupIds);
app.get('/me', getMe);
app.get('/tresor-pay/:matricule', getEtudiantByTresorPay);
app.post('/tresor-pay/map', mapEtudiantTresorPay);
app.post('/tresor-pay/temporary', upsertTemporaryEtudiant);
app.get('/notifications/etudiant-temporaire', getTemporaryEtudiantNotifications);
app.post('/notifications/etudiant-temporaire/:id/traiter', markTemporaryEtudiantNotificationTreated);
app.get('/', getEtudiants);
app.post('/', validate(EtudiantCreateSchema), createEtudiant);
app.put('/:matricule', validate(EtudiantUpdateSchema), updateEtudiant);
app.get('/distinct-promotions', getDistinctPromotions);
// Photo upload routes
app.post('/:matricule/photo', authorizeRoles('ADMIN', 'CHEF_COMPTABLE'), upload.single('photo'), uploadEtudiantPhoto);
app.delete('/:matricule/photo', authorizeRoles('ADMIN'), deleteEtudiantPhoto);
app.get('/:matricule', getEtudiantByMatricule);

// Global Error Handler
app.use(errorHandler);

export default app;
