import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import * as transactionService from '../services/transactionService';
import { ValidationError, AppError } from '../utils/errors';
import { prisma } from '../utils/prisma';
import logger from '../utils/logger';
import { parseImportFile } from '../services/importParserService';
import { ImportPayloadSchema } from '../../../../../shared/types/transaction.types';

const toJsonSafe = (value: unknown): unknown => {
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => toJsonSafe(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, toJsonSafe(item)]),
    );
  }
  return value;
};

// ============================================================
// Middleware de validation Zod
// ============================================================

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.format()));
  }
  req.body = result.data;
  next();
};

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
export const importTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await transactionService.importTransactions(req.body);
    res.json({ message: 'Import process completed', ...result });
  } catch (e) {
    next(e);
  }
};

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
export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await transactionService.getTransactions(req.query);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

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
export const getUnassigned = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const list = await transactionService.getUnassignedTransactions(
      dateDebut ? String(dateDebut) : undefined,
      dateFin ? String(dateFin) : undefined
    );
    res.json(list);
  } catch (e) {
    next(e);
  }
};

/**
 * @openapi
 * /link-ot:
 *   post:
 *     summary: Link transactions to an OT code
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LinkOtRequest'
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
export const linkOt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ordreTraitementId, codeOt, transactionIds } = req.body;
    const result = await transactionService.linkTransactionsToOt(ordreTraitementId, codeOt, transactionIds);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

/**
 * @openapi
 * /unlink-ot:
 *   post:
 *     summary: Unlink transactions from an OT
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UnlinkOtRequest'
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
export const unlinkOt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await transactionService.unlinkTransactionsFromOt(req.body.ordreTraitementId);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

/**
 * @openapi
 * /ot-status:
 *   put:
 *     summary: Synchronize OT status mirror used by the transaction freeze trigger
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OtStatusRequest'
 *     responses:
 *       200:
 *         description: OT status synchronized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrdreTraitement'
 */
export const syncOtStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ordreTraitementId, codeOt, statut } = req.body;
    const result = await transactionService.syncOtStatus(ordreTraitementId, codeOt, statut);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

export const lockTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await transactionService.lockTransactions(req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

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
export const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'transaction-service' });
  } catch (e) {
    next(new AppError(503, `Database connection failed: ${String(e)}`));
  }
};

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
export const getMetrics = async (req: Request, res: Response) => {
  const promClient = require('../utils/metrics').default;
  res.setHeader('Content-Type', promClient.register.contentType);
  res.send(await promClient.register.metrics());
};

export const fetchFromTresor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string, 10) : 1;

    const now = new Date();
    const items = [
      {
        refTresor: `TRES-PAY-${Date.now()}-001`,
        montant: 120000,
        dateHeure: now,
        etudiantMatricule: '21P-0154ASIB',
        nomPayeurBrut: 'KOUAME AFFOUE MARIE',
        libelleProduitBrut: '1er Versement Frais de Scolarite',
        filiere: 'INFIRMIER',
        niveau: 'L1',
        antenne: 'BOUAKE',
        nom: 'KOUAME',
        prenom: 'MARIE',
        typeRecette: 'Scolarite L1 Public - Versement 1',
        typeFlux: 'CLASSE',
      },
      {
        refTresor: `TRES-PAY-${Date.now()}-002`,
        montant: 30000,
        dateHeure: now,
        etudiantMatricule: '22P-0987BKE',
        nomPayeurBrut: 'TRAORE BAKARY',
        libelleProduitBrut: 'Frais Encadrement L1',
        filiere: 'INFIRMIER',
        niveau: 'L1',
        antenne: 'BOUAKE',
        nom: 'TRAORE',
        prenom: 'BAKARY',
        typeRecette: 'Encadrement L1',
        typeFlux: 'CLASSE',
      },
    ];

    const payload = {
      nomFichier: `TRESOR_PAY_API_FETCH_${Date.now()}`,
      typeFichier: 'JSON' as const,
      auteurId: isNaN(userId) ? 1 : userId,
      periodeDebut: now,
      periodeFin: now,
      items,
    };

    const result = await transactionService.importTransactions(payload);
    res.json({ message: 'Synchronisation Trésor Pay réussie', ...result });
  } catch (err) {
    next(err);
  }
};

export const updateTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError(400, 'Invalid transaction ID');
    }
    const result = await transactionService.updateTransaction(id, req.body);
    res.json({ message: 'Transaction mise à jour avec succès', data: { ...result, montant: Number(result.montant) } });
  } catch (e) {
    next(e);
  }
};

export const deleteTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError(400, 'Invalid transaction ID');
    }
    await transactionService.deleteTransaction(id);
    res.json({ message: 'Transaction supprimée avec succès' });
  } catch (e) {
    next(e);
  }
};

export const mergeTransactionsEtudiantId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { oldEtudiantId, newEtudiantId } = req.body;
    if (oldEtudiantId === undefined || newEtudiantId === undefined) {
      throw new AppError(400, 'oldEtudiantId et newEtudiantId requis');
    }
    const count = await transactionService.mergeEtudiants(
      parseInt(oldEtudiantId, 10),
      parseInt(newEtudiantId, 10)
    );
    res.json({ message: 'Merge complété', count });
  } catch (e) {
    next(e);
  }
};

export const importFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      throw new AppError(400, "Aucun fichier n'a été fourni.");
    }

    const rawAuteurId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string, 10) : 1;
    const auteurId = isNaN(rawAuteurId) ? 1 : rawAuteurId;

    const nomFichier = file.originalname;
    const extension = nomFichier.split('.').pop()?.toLowerCase();
    let typeFichier: 'CSV' | 'XLSX';

    if (extension === 'csv') {
      typeFichier = 'CSV';
    } else if (extension === 'xlsx' || extension === 'xls') {
      typeFichier = 'XLSX';
    } else {
      throw new AppError(400, 'Extension de fichier non supportée. Utilisez .csv ou .xlsx.');
    }

    const parsedItems = parseImportFile(file.buffer, typeFichier);

    const payload = ImportPayloadSchema.parse({
      nomFichier,
      typeFichier,
      auteurId,
      items: parsedItems,
    });

    const result = await transactionService.importTransactions(payload);
    res.json({ message: 'Import de fichier réussi', ...result });
  } catch (e) {
    next(e);
  }
};

export const getTransactionsByIds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ids = req.body.ids;
    if (!Array.isArray(ids)) {
      throw new ValidationError('ids must be an array');
    }
    const result = await transactionService.getTransactions({ ids, limit: 10000 });
    res.json(result);
  } catch (e) {
    next(e);
  }
};

export const getTransactionsByOtCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.params.code;
    const result = await transactionService.getTransactionsByOtCode(code);
    res.json(toJsonSafe(result));
  } catch (e) {
    next(e);
  }
};

export const transmitOtTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.params.code;
    const result = await transactionService.transmitOtTransactions(code);
    res.json(toJsonSafe(result));
  } catch (e) {
    next(e);
  }
};

