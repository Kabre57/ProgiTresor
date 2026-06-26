import swaggerJSDoc from 'swagger-jsdoc';
import * as fs from 'fs';
import * as path from 'path';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Etudiant Service API',
      version: '1.0.0',
      description: 'API for Etudiant Master Data and Antennas on ProgiTrésor'
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
            antenne: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                code: { type: 'string' },
                nom: { type: 'string' }
              }
            },
            filiereId: { type: 'integer' },
            filiere: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                code: { type: 'string' },
                libelle: { type: 'string' }
              }
            },
            statutId: { type: 'integer' },
            statut: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                code: { type: 'string' },
                libelle: { type: 'string' }
              }
            },
            dateCreation: { type: 'string', format: 'date-time' }
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
    path.join(__dirname, 'controllers/*.js')
  ]
};

const spec = swaggerJSDoc(swaggerOptions);
fs.writeFileSync(path.join(__dirname, '../openapi.json'), JSON.stringify(spec, null, 2));
console.log('Etudiant Service openapi.json generated successfully.');
