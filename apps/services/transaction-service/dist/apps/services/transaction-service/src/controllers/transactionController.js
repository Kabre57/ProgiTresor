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
exports.mergeTransactionsEtudiantId = exports.deleteTransaction = exports.updateTransaction = exports.fetchFromTresor = exports.getMetrics = exports.healthCheck = exports.syncOpStatus = exports.unlinkOp = exports.linkOp = exports.getUnassigned = exports.getTransactions = exports.importTransactions = exports.validate = void 0;
const transactionService = __importStar(require("../services/transactionService"));
const errors_1 = require("../utils/errors");
const prisma_1 = require("../utils/prisma");
// ============================================================
// Middleware de validation Zod
// ============================================================
const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        throw new errors_1.ValidationError(JSON.stringify(result.error.format()));
    }
    req.body = result.data;
    next();
};
exports.validate = validate;
// ============================================================
// Handlers
// ============================================================
/**
 * @openapi
 * /import:
 *   post:
 *     summary: Import a list of transactions
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/TransactionItem'
 *     responses:
 *       200:
 *         description: Import finished successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 imported:
 *                   type: integer
 *                 duplicates_skipped:
 *                   type: integer
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const importTransactions = async (req, res, next) => {
    try {
        const result = await transactionService.importTransactions(req.body);
        res.json({ message: 'Import process completed', ...result });
    }
    catch (e) {
        next(e);
    }
};
exports.importTransactions = importTransactions;
/**
 * @openapi
 * /:
 *   get:
 *     summary: Retrieve transactions list with pagination
 *     tags: [Transactions]
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
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 */
const getTransactions = async (req, res, next) => {
    try {
        const result = await transactionService.getTransactions(req.query);
        res.json(result);
    }
    catch (e) {
        next(e);
    }
};
exports.getTransactions = getTransactions;
/**
 * @openapi
 * /unassigned:
 *   get:
 *     summary: Retrieve unassigned Hors Budget transactions
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: Unassigned transaction list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 */
const getUnassigned = async (req, res, next) => {
    try {
        const list = await transactionService.getUnassignedTransactions();
        res.json(list);
    }
    catch (e) {
        next(e);
    }
};
exports.getUnassigned = getUnassigned;
/**
 * @openapi
 * /link-op:
 *   post:
 *     summary: Link transactions to an OP code
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LinkOpRequest'
 *     responses:
 *       200:
 *         description: Linked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 updated_count:
 *                   type: integer
 *       400:
 *         description: Transaction already linked or validation error
 */
const linkOp = async (req, res, next) => {
    try {
        const { ordrePaiementId, codeOp, transactionIds } = req.body;
        const result = await transactionService.linkTransactionsToOp(ordrePaiementId, codeOp, transactionIds);
        res.json(result);
    }
    catch (e) {
        next(e);
    }
};
exports.linkOp = linkOp;
/**
 * @openapi
 * /unlink-op:
 *   post:
 *     summary: Unlink transactions from an OP
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UnlinkOpRequest'
 *     responses:
 *       200:
 *         description: Unlinked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 count:
 *                   type: integer
 */
const unlinkOp = async (req, res, next) => {
    try {
        const result = await transactionService.unlinkTransactionsFromOp(req.body.ordrePaiementId);
        res.json(result);
    }
    catch (e) {
        next(e);
    }
};
exports.unlinkOp = unlinkOp;
/**
 * @openapi
 * /op-status:
 *   put:
 *     summary: Synchronize OP status mirror used by the transaction freeze trigger
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OpStatusRequest'
 *     responses:
 *       200:
 *         description: OP status synchronized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrdrePaiement'
 */
const syncOpStatus = async (req, res, next) => {
    try {
        const { ordrePaiementId, codeOp, statut } = req.body;
        const result = await transactionService.syncOpStatus(ordrePaiementId, codeOp, statut);
        res.json(result);
    }
    catch (e) {
        next(e);
    }
};
exports.syncOpStatus = syncOpStatus;
/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is healthy
 *       503:
 *         description: Service is unhealthy
 */
const healthCheck = async (req, res, next) => {
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        res.json({ status: 'ok', service: 'transaction-service' });
    }
    catch (e) {
        next(new errors_1.AppError(503, `Database connection failed: ${String(e)}`));
    }
};
exports.healthCheck = healthCheck;
/**
 * @openapi
 * /metrics:
 *   get:
 *     summary: Prometheus metrics endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Prometheus metrics in exposition format
 */
const getMetrics = async (req, res) => {
    const promClient = require('../utils/metrics').default;
    res.setHeader('Content-Type', promClient.register.contentType);
    res.send(await promClient.register.metrics());
};
exports.getMetrics = getMetrics;
const fetchFromTresor = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'], 10) : 1;
        const now = new Date();
        const items = [
            {
                refTresor: `TRES-PAY-${Date.now()}-001`,
                montant: 120000,
                dateHeure: now,
                etudiantMatricule: '21P-0154ASIB',
                nomPayeurBrut: 'KOUAME AFFOUE MARIE',
                libelleProduitBrut: '1er Versement Frais de Scolarite',
            },
            {
                refTresor: `TRES-PAY-${Date.now()}-002`,
                montant: 30000,
                dateHeure: now,
                etudiantMatricule: '22P-0987BKE',
                nomPayeurBrut: 'TRAORE BAKARY',
                libelleProduitBrut: 'Frais Encadrement L1',
            },
        ];
        const payload = {
            nomFichier: `TRESOR_PAY_API_FETCH_${Date.now()}`,
            typeFichier: 'JSON',
            auteurId: isNaN(userId) ? 1 : userId,
            periodeDebut: now,
            periodeFin: now,
            items,
        };
        const result = await transactionService.importTransactions(payload);
        res.json({ message: 'Synchronisation Trésor Pay réussie', ...result });
    }
    catch (err) {
        next(err);
    }
};
exports.fetchFromTresor = fetchFromTresor;
const updateTransaction = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            throw new errors_1.AppError(400, 'Invalid transaction ID');
        }
        const result = await transactionService.updateTransaction(id, req.body);
        res.json({ message: 'Transaction mise à jour avec succès', data: { ...result, montant: Number(result.montant) } });
    }
    catch (e) {
        next(e);
    }
};
exports.updateTransaction = updateTransaction;
const deleteTransaction = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            throw new errors_1.AppError(400, 'Invalid transaction ID');
        }
        await transactionService.deleteTransaction(id);
        res.json({ message: 'Transaction supprimée avec succès' });
    }
    catch (e) {
        next(e);
    }
};
exports.deleteTransaction = deleteTransaction;
const mergeTransactionsEtudiantId = async (req, res, next) => {
    try {
        const { oldEtudiantId, newEtudiantId } = req.body;
        if (oldEtudiantId === undefined || newEtudiantId === undefined) {
            throw new errors_1.AppError(400, 'oldEtudiantId et newEtudiantId requis');
        }
        const count = await transactionService.mergeEtudiants(parseInt(oldEtudiantId, 10), parseInt(newEtudiantId, 10));
        res.json({ message: 'Merge complété', count });
    }
    catch (e) {
        next(e);
    }
};
exports.mergeTransactionsEtudiantId = mergeTransactionsEtudiantId;
