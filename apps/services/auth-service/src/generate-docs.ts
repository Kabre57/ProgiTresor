import swaggerJSDoc from 'swagger-jsdoc';
import * as fs from 'fs';
import * as path from 'path';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Auth Service API',
      version: '1.0.0',
      description: 'API for User Authentication and Auditing on Progi Teck'
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
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string' },
            password: { type: 'string' }
          }
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            refreshToken: { type: 'string' },
            user: { $ref: '#/components/schemas/UserProfile' }
          }
        },
        UserProfile: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            nom: { type: 'string' },
            prenom: { type: 'string' },
            email: { type: 'string' },
            service: { type: 'string', nullable: true },
            actif: { type: 'boolean' },
            role: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                libelle: { type: 'string' }
              }
            },
            dateCreation: { type: 'string', format: 'date-time' },
            derniereConnexion: { type: 'string', format: 'date-time', nullable: true }
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
  apis: [
    path.join(__dirname, 'controllers/*.ts'),
    path.join(__dirname, 'controllers/*.js'),
    path.join(__dirname, 'index.ts'),
    path.join(__dirname, 'index.js')
  ]
};

const spec = swaggerJSDoc(swaggerOptions);
fs.writeFileSync(path.join(__dirname, '../openapi.json'), JSON.stringify(spec, null, 2));
// console.log('Auth Service openapi.json generated successfully.');
