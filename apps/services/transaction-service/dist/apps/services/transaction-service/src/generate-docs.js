"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
const spec = (0, swagger_jsdoc_1.default)(swaggerOptions);
fs.writeFileSync(path.join(__dirname, '../openapi.json'), JSON.stringify(spec, null, 2));
console.log('Transaction Service openapi.json generated successfully.');
