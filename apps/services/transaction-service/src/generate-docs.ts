import swaggerJSDoc from 'swagger-jsdoc';
import * as fs from 'fs';
import * as path from 'path';

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
            reference_source: { type: 'string', nullable: true },
            date_import: { type: 'string', format: 'date-time' },
            code_op: { type: 'string', nullable: true }
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
console.log('Transaction Service openapi.json generated successfully.');
