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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImportFichierById = exports.getImportFichiers = void 0;
const importFichierService = __importStar(require("../services/importFichierService"));
/**
 * @openapi
 * /imports:
 *   get:
 *     summary: Retrieve import fichiers list with pagination
 *     tags: [Imports]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 200
 *         description: Number of items to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of items to skip
 *     responses:
 *       200:
 *         description: List of import fichiers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ImportFichier'
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 */
const getImportFichiers = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const result = await importFichierService.getImportFichiers(limit, offset);
        res.json(result);
    }
    catch (e) {
        next(e);
    }
};
exports.getImportFichiers = getImportFichiers;
/**
 * @openapi
 * /imports/{id}:
 *   get:
 *     summary: Retrieve a single import fichier by ID
 *     tags: [Imports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Import fichier ID
 *     responses:
 *       200:
 *         description: Import fichier details with transactions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImportFichier'
 *       404:
 *         description: Import fichier not found
 */
const getImportFichierById = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const result = await importFichierService.getImportFichierById(id);
        res.json(result);
    }
    catch (e) {
        next(e);
    }
};
exports.getImportFichierById = getImportFichierById;
