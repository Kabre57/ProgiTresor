import swaggerJSDoc from 'swagger-jsdoc';
import * as fs from 'fs';
import * as path from 'path';

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
            statut: { type: 'string' },
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
console.log('Order Service openapi.json generated successfully.');
