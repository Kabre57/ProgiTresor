import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import * as orderService from '../services/orderService';
import { ValidationError, AppError } from '../utils/errors';
import { prisma } from '../utils/prisma';
import logger from '../utils/logger';
import { toJsonSafe } from '../../../../../shared/utils/json';

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
 * /generate:
 *   post:
 *     summary: Generate payment orders through Saga orchestration
 *     tags: [Orders]
 *     description: Fetches unassigned Hors Budget transactions, resolves etudiant, groups by antenna/level/product, creates OPs, and links transactions. Uses Saga pattern with compensation on failure.
 *     responses:
 *       200:
 *         description: OPs generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 generated_ops_count:
 *                   type: integer
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Saga execution failed and changes rolled back
 */
export const generateOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : 1;
    const result = await orderService.generatePaymentOrders(userId);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

/**
 * @openapi
 * /{code}/status:
 *   put:
 *     summary: Update payment order status with RBAC workflow
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: OP code (e.g. OP-INFAS-ABCD)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StatusUpdateRequest'
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrdrePaiement'
 *       403:
 *         description: Insufficient permissions for this workflow transition
 *       404:
 *         description: OP not found
 *       502:
 *         description: Updated locally but transaction-service sync failed
 */
export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.params.code;
    const role = req.headers['x-user-role'] as string | undefined;
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : null;
    const { statut, motif } = req.body;

    const result = await orderService.updateOrderStatus(code, statut, role, userId, motif);
    res.json(toJsonSafe(result));
  } catch (e) {
    next(e);
  }
};

/**
 * @openapi
 * /:
 *   get:
 *     summary: Retrieve payment orders list
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: List of OPs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/OrdrePaiement'
 */
export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await orderService.getAllOrders();
    res.json(toJsonSafe(list));
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

    const redis = (await import('../utils/redis')).default;
    const redisPing = await redis.ping();

    res.json({ status: 'ok', service: 'order-service', redis: redisPing });
  } catch (e) {
    next(new AppError(503, `Service health check failed: ${String(e)}`));
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
