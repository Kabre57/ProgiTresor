import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import multer from 'multer';
import { errorHandler } from './middlewares/errorHandler';
import { authenticateToken, authorizeRoles, authorizePerimeter } from './middlewares/authMiddleware';
import { login, logout, getMe, refreshToken, healthCheck, getMetrics, validate, getAllUsers, createUser, updateUser, deleteUser } from './controllers/authController';
import { uploadUserPhoto, updateMyProfile } from './controllers/profileController';
import * as roleCtrl from './controllers/roleController';
import * as permCtrl from './controllers/permissionController';
import { getAllPerimeters, getUserPerimeterLevels, setUserPerimeterLevel, checkAccess } from './controllers/perimeterController';
import { updateAdminPermissions } from './controllers/adminPermissions.controller';
import {
  LoginSchema, RefreshTokenSchema, UserCreateSchema, UserUpdateSchema,
  RoleCreateSchema, RoleUpdateSchema,
  PermissionCreateSchema, PermissionUpdateSchema,
  RolePermissionAssignSchema,
} from '../../../../shared/types/auth.types';
import { httpRequestDurationMicroseconds } from './utils/metrics';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware pour mesurer la durée des requêtes HTTP
app.use((req: Request, res: Response, next: NextFunction) => {
  const end = httpRequestDurationMicroseconds.startTimer();
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
      title: 'Auth Service API',
      version: '2.0.0',
      description: 'API for User Authentication, RBAC Roles & Permissions on ProgiTrésor'
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        LoginRequest: { type: 'object', required: ['username', 'password'], properties: { username: { type: 'string' }, password: { type: 'string' } } },
        RefreshTokenRequest: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } },
        LoginResponse: { type: 'object', properties: { token: { type: 'string' }, refreshToken: { type: 'string' }, user: { $ref: '#/components/schemas/UserProfile' } } },
        UserProfile: { type: 'object', properties: { id: { type: 'integer' }, username: { type: 'string' }, nom: { type: 'string' }, prenom: { type: 'string' }, email: { type: 'string' }, service: { type: 'string', nullable: true }, actif: { type: 'boolean' }, role: { $ref: '#/components/schemas/Role' }, dateCreation: { type: 'string', format: 'date-time' } } },
        Role: { type: 'object', properties: { id: { type: 'integer' }, code: { type: 'string' }, libelle: { type: 'string' }, description: { type: 'string', nullable: true } } },
        RoleCreate: { type: 'object', required: ['code', 'libelle'], properties: { code: { type: 'string' }, libelle: { type: 'string' }, description: { type: 'string', nullable: true } } },
        Permission: { type: 'object', properties: { id: { type: 'integer' }, code: { type: 'string' }, libelle: { type: 'string' }, module: { type: 'string' } } },
        PermissionCreate: { type: 'object', required: ['code', 'libelle', 'module'], properties: { code: { type: 'string' }, libelle: { type: 'string' }, module: { type: 'string' } } },
        RolePermissionAssign: { type: 'object', required: ['permissionIds'], properties: { permissionIds: { type: 'array', items: { type: 'integer' } } } },
        ErrorResponse: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, statusCode: { type: 'integer' } } } } }
      }
    }
  },
  apis: ['./src/controllers/*.ts', './src/index.ts']
};
const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ============================================================
// Routes – Auth
// ============================================================
app.post('/login', validate(LoginSchema), login);
app.post('/refresh-token', validate(RefreshTokenSchema), refreshToken);
app.post('/logout', validate(RefreshTokenSchema), logout);
app.get('/me', authenticateToken, getMe);
app.get('/health', healthCheck);
app.get('/metrics', getMetrics);

// ============================================================
// Routes – Profile utilisateur
// ============================================================
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
app.post('/me/photo', authenticateToken, upload.single('photo'), uploadUserPhoto);
app.put('/me/profile', authenticateToken, updateMyProfile);

// ============================================================
// Routes – Users CRUD
// ============================================================
app.get('/users', authenticateToken, authorizeRoles(['ADMIN']), getAllUsers);
app.post('/users', authenticateToken, authorizeRoles(['ADMIN']), validate(UserCreateSchema), createUser);
app.put('/users/:id', authenticateToken, authorizeRoles(['ADMIN']), validate(UserUpdateSchema), updateUser);
app.delete('/users/:id', authenticateToken, authorizeRoles(['ADMIN']), deleteUser);
app.patch('/users/:userId/permissions', authenticateToken, authorizePerimeter('ADMIN', 'UPDATE', 4), updateAdminPermissions);

// ============================================================
// Routes – Roles CRUD
// ============================================================
app.get('/roles', authenticateToken, authorizeRoles(['ADMIN']), roleCtrl.getAll);
app.get('/roles/:id', authenticateToken, authorizeRoles(['ADMIN']), roleCtrl.getById);
app.post('/roles', authenticateToken, authorizeRoles(['ADMIN']), validate(RoleCreateSchema), roleCtrl.create);
app.put('/roles/:id', authenticateToken, authorizeRoles(['ADMIN']), validate(RoleUpdateSchema), roleCtrl.update);
app.delete('/roles/:id', authenticateToken, authorizeRoles(['ADMIN']), roleCtrl.remove);
app.get('/roles/:id/permissions', authenticateToken, authorizeRoles(['ADMIN']), roleCtrl.getPermissions);
app.post('/roles/:id/permissions', authenticateToken, authorizeRoles(['ADMIN']), validate(RolePermissionAssignSchema), roleCtrl.assignPermissions);
app.delete('/roles/:id/permissions/:permId', authenticateToken, authorizeRoles(['ADMIN']), roleCtrl.removePermission);

// ============================================================
// Routes – Permissions CRUD
// ============================================================
app.get('/permissions', authenticateToken, authorizeRoles(['ADMIN']), permCtrl.getAll);
app.get('/permissions/:id', authenticateToken, authorizeRoles(['ADMIN']), permCtrl.getById);
app.post('/permissions', authenticateToken, authorizeRoles(['ADMIN']), validate(PermissionCreateSchema), permCtrl.create);
app.put('/permissions/:id', authenticateToken, authorizeRoles(['ADMIN']), validate(PermissionUpdateSchema), permCtrl.update);
app.delete('/permissions/:id', authenticateToken, authorizeRoles(['ADMIN']), permCtrl.remove);

// ============================================================
// Routes – Périmètres Graduationnels
// ============================================================
app.get('/perimeters', authenticateToken, authorizeRoles(['ADMIN']), getAllPerimeters);
app.get('/users/:id/perimeters', authenticateToken, authorizeRoles(['ADMIN']), getUserPerimeterLevels);
app.post('/users/:id/perimeters', authenticateToken, authorizeRoles(['ADMIN']), setUserPerimeterLevel);
app.post('/perimeters/check-access', authenticateToken, checkAccess);

// Global Error Handling Middleware
app.use(errorHandler);

export default app;
