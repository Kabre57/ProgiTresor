import { Request, Response, NextFunction } from 'express';
import * as promotionService from '../services/promotionService';

/**
 * @openapi
 * /promotions:
 *   get:
 *     summary: List all promotions
 *     tags: [Promotions]
 *     responses:
 *       200:
 *         description: List of promotions
 *   post:
 *     summary: Create a promotion
 *     tags: [Promotions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PromotionCreate'
 *     responses:
 *       201:
 *         description: Promotion created
 *       409:
 *         description: Nom already exists
 */
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await promotionService.getAll()); } catch (e) { next(e); }
};

/**
 * @openapi
 * /promotions/{id}:
 *   get:
 *     summary: Get promotion by ID
 *     tags: [Promotions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Promotion detail
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update promotion
 *     tags: [Promotions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PromotionUpdate'
 *     responses:
 *       200:
 *         description: Promotion updated
 *   delete:
 *     summary: Delete promotion
 *     tags: [Promotions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Promotion deleted
 *       409:
 *         description: Cannot delete – linked entities exist
 */
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await promotionService.getById(parseInt(req.params.id))); } catch (e) { next(e); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(await promotionService.create(req.body)); } catch (e) { next(e); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await promotionService.update(parseInt(req.params.id), req.body)); } catch (e) { next(e); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await promotionService.remove(parseInt(req.params.id))); } catch (e) { next(e); }
};
