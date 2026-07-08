import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import multer from 'multer';
import { errorHandler } from './middlewares/errorHandler';
import { extractUserFromHeaders, authorizeRoles, validateInternalSecret } from './middlewares/authMiddleware';
import { importEtudiants, importReferential } from './controllers/importController';
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
  upsertTemporaryEtudiantsBatch,
  getMe,
  getTemporaryEtudiantNotifications,
  markTemporaryEtudiantNotificationTreated,
  getDistinctPromotions,
  getEtudiantStatsGroups,
  getStudentFinancialSummary,
  generateStudentAttestation
} from './controllers/etudiantController';
import { uploadEtudiantPhoto, deleteEtudiantPhoto } from './controllers/photoController';
import * as antenneCtrl from './controllers/antenneController';
import * as filiereCtrl from './controllers/filiereController';
import * as niveauCtrl from './controllers/niveauController';
import * as statutCtrl from './controllers/statutEtudiantController';
import * as typeFluxCtrl from './controllers/typeFluxController';
import * as typeRecetteCtrl from './controllers/typeRecetteController';
import * as nomenclatureCtrl from './controllers/nomenclatureProduitController';
import * as promotionCtrl from './controllers/promotionController';
import * as configFraisNiveauCtrl from './controllers/configurationFraisNiveauController';
import {
  EtudiantCreateSchema,
  EtudiantUpdateSchema,
  BatchLookupSchema,
  AntenneCreateSchema,
  AntenneUpdateSchema,
  FiliereCreateSchema,
  FiliereUpdateSchema,
  NiveauCreateSchema,
  NiveauUpdateSchema,
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
  ConfigurationFraisNiveauCreateSchema,
  ConfigurationFraisNiveauUpdateSchema,
} from '../../../../shared/types/etudiant.types';
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
          properties: { id: { type: 'integer' }, libelleBrut: { type: 'string' }, codeProduit: { type: 'string' }, libelleStandard: { type: 'string' }, regexPattern: { type: 'string', nullable: true }, typeRecetteId: { type: 'integer' }, niveauId: { type: 'integer', nullable: true }, filiereId: { type: 'integer', nullable: true, deprecated: true }, statutId: { type: 'integer', nullable: true }, numVersement: { type: 'integer', nullable: true }, montant: { type: 'integer', minimum: 0, default: 0 }, actif: { type: 'boolean' } }
        },
        NomenclatureProduitCreate: { type: 'object', required: ['libelleBrut', 'codeProduit', 'libelleStandard', 'typeRecetteId'], properties: { libelleBrut: { type: 'string' }, codeProduit: { type: 'string' }, libelleStandard: { type: 'string' }, regexPattern: { type: 'string', nullable: true }, typeRecetteId: { type: 'integer' }, niveauId: { type: 'integer', nullable: true }, filiereId: { type: 'integer', nullable: true, deprecated: true }, statutId: { type: 'integer', nullable: true }, numVersement: { type: 'integer', nullable: true }, montant: { type: 'integer', minimum: 0, default: 0 }, actif: { type: 'boolean' } } },
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

app.use(validateInternalSecret);

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

// Routes – Niveaux CRUD
app.get('/niveaux', niveauCtrl.getAll);
app.get('/niveaux/:id', niveauCtrl.getById);
app.post('/niveaux', authorizeRoles(...WRITE_ROLES), validate(NiveauCreateSchema), niveauCtrl.create);
app.put('/niveaux/:id', authorizeRoles(...WRITE_ROLES), validate(NiveauUpdateSchema), niveauCtrl.update);
app.delete('/niveaux/:id', authorizeRoles(...WRITE_ROLES), niveauCtrl.remove);

// ============================================================
// Routes – Statuts Étudiants CRUD
// ============================================================
app.get('/statuts-etudiant', statutCtrl.getAll);
app.get('/statuts-etudiant/:id', statutCtrl.getById);
app.post('/statuts-etudiant', authorizeRoles(...WRITE_ROLES), validate(StatutEtudiantCreateSchema), statutCtrl.create);
app.put('/statuts-etudiant/:id', authorizeRoles(...WRITE_ROLES), validate(StatutEtudiantUpdateSchema), statutCtrl.update);
app.delete('/statuts-etudiant/:id', authorizeRoles(...WRITE_ROLES), statutCtrl.remove);

app.get('/statuts-etudiants', statutCtrl.getAll);
app.get('/statuts-etudiants/:id', statutCtrl.getById);
app.post('/statuts-etudiants', authorizeRoles(...WRITE_ROLES), validate(StatutEtudiantCreateSchema), statutCtrl.create);
app.put('/statuts-etudiants/:id', authorizeRoles(...WRITE_ROLES), validate(StatutEtudiantUpdateSchema), statutCtrl.update);
app.delete('/statuts-etudiants/:id', authorizeRoles(...WRITE_ROLES), statutCtrl.remove);

// ============================================================
// Routes – Types Flux CRUD
// ============================================================
app.get('/types-flux', typeFluxCtrl.getAll);
app.get('/types-flux/:id', typeFluxCtrl.getById);
app.post('/types-flux', authorizeRoles(...WRITE_ROLES), validate(TypeFluxCreateSchema), typeFluxCtrl.create);
app.put('/types-flux/:id', authorizeRoles(...WRITE_ROLES), validate(TypeFluxUpdateSchema), typeFluxCtrl.update);
app.delete('/types-flux/:id', authorizeRoles(...WRITE_ROLES), typeFluxCtrl.remove);
app.get('/type-flux', typeFluxCtrl.getAll);
app.get('/type-flux/:id', typeFluxCtrl.getById);
app.post('/type-flux', authorizeRoles(...WRITE_ROLES), validate(TypeFluxCreateSchema), typeFluxCtrl.create);
app.put('/type-flux/:id', authorizeRoles(...WRITE_ROLES), validate(TypeFluxUpdateSchema), typeFluxCtrl.update);
app.delete('/type-flux/:id', authorizeRoles(...WRITE_ROLES), typeFluxCtrl.remove);

// ============================================================
// Routes – Types Recettes CRUD
// ============================================================
app.get('/types-recettes', typeRecetteCtrl.getAll);
app.get('/types-recettes/:id', typeRecetteCtrl.getById);
app.post('/types-recettes', authorizeRoles(...WRITE_ROLES), validate(TypeRecetteCreateSchema), typeRecetteCtrl.create);
app.put('/types-recettes/:id', authorizeRoles(...WRITE_ROLES), validate(TypeRecetteUpdateSchema), typeRecetteCtrl.update);
app.delete('/types-recettes/:id', authorizeRoles(...WRITE_ROLES), typeRecetteCtrl.remove);
app.get('/type-recette', typeRecetteCtrl.getAll);
app.get('/type-recette/:id', typeRecetteCtrl.getById);
app.post('/type-recette', authorizeRoles(...WRITE_ROLES), validate(TypeRecetteCreateSchema), typeRecetteCtrl.create);
app.put('/type-recette/:id', authorizeRoles(...WRITE_ROLES), validate(TypeRecetteUpdateSchema), typeRecetteCtrl.update);
app.delete('/type-recette/:id', authorizeRoles(...WRITE_ROLES), typeRecetteCtrl.remove);

// ============================================================
// Routes – Nomenclatures Produit CRUD
// ============================================================
app.get('/nomenclatures', nomenclatureCtrl.getAll);
app.get('/nomenclatures/:id', nomenclatureCtrl.getById);
app.post('/nomenclatures', authorizeRoles(...WRITE_ROLES), validate(NomenclatureProduitCreateSchema), nomenclatureCtrl.create);
app.put('/nomenclatures/:id', authorizeRoles(...WRITE_ROLES), validate(NomenclatureProduitUpdateSchema), nomenclatureCtrl.update);
app.delete('/nomenclatures/:id', authorizeRoles(...WRITE_ROLES), nomenclatureCtrl.remove);
app.get('/nomenclature-produit', nomenclatureCtrl.getAll);
app.get('/nomenclature-produit/:id', nomenclatureCtrl.getById);
app.post('/nomenclature-produit', authorizeRoles(...WRITE_ROLES), validate(NomenclatureProduitCreateSchema), nomenclatureCtrl.create);
app.put('/nomenclature-produit/:id', authorizeRoles(...WRITE_ROLES), validate(NomenclatureProduitUpdateSchema), nomenclatureCtrl.update);
app.delete('/nomenclature-produit/:id', authorizeRoles(...WRITE_ROLES), nomenclatureCtrl.remove);

// ============================================================
// Routes – Configuration Frais Niveau CRUD
// ============================================================
app.get('/configuration-frais-niveau', configFraisNiveauCtrl.getAll);
app.get('/configuration-frais-niveau/:id', configFraisNiveauCtrl.getById);
app.post('/configuration-frais-niveau', authorizeRoles(...WRITE_ROLES), validate(ConfigurationFraisNiveauCreateSchema), configFraisNiveauCtrl.create);
app.put('/configuration-frais-niveau/:id', authorizeRoles(...WRITE_ROLES), validate(ConfigurationFraisNiveauUpdateSchema), configFraisNiveauCtrl.update);
app.delete('/configuration-frais-niveau/:id', authorizeRoles(...WRITE_ROLES), configFraisNiveauCtrl.remove);

// ============================================================
// Routes – Etudiants
// ============================================================
const upload = multer({ storage: multer.memoryStorage() });

app.post('/import', authorizeRoles('ADMIN'), upload.single('file'), importEtudiants);
app.post('/import-referential/:entity', authorizeRoles('ADMIN'), upload.single('file'), importReferential);
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
app.post('/tresor-pay/batch-temporary', upsertTemporaryEtudiantsBatch);
app.get('/notifications/etudiant-temporaire', getTemporaryEtudiantNotifications);
app.post('/notifications/etudiant-temporaire/:id/traiter', markTemporaryEtudiantNotificationTreated);
app.get('/stats/groups', getEtudiantStatsGroups);
app.get('/', getEtudiants);
app.post('/', validate(EtudiantCreateSchema), createEtudiant);
app.put('/:matricule', validate(EtudiantUpdateSchema), updateEtudiant);
app.get('/distinct-promotions', getDistinctPromotions);
// Photo upload routes
app.post('/:matricule/photo', authorizeRoles('ADMIN', 'CHEF_COMPTABLE'), upload.single('photo'), uploadEtudiantPhoto);
app.delete('/:matricule/photo', authorizeRoles('ADMIN'), deleteEtudiantPhoto);
app.get('/:identifier/financial-summary', getStudentFinancialSummary);
app.post('/:identifier/generate-attestation', generateStudentAttestation);
app.get('/:matricule', getEtudiantByMatricule);

// Global Error Handler
app.use(errorHandler);

export default app;
