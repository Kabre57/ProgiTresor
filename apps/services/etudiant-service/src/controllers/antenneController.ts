import { Request, Response, NextFunction } from 'express';
import * as antenneService from '../services/antenneService';

/**
 * @openapi
 * /antennes:
 *   get:
 *     summary: List all antennes
 *     tags: [Antennes]
 *     responses:
 *       200:
 *         description: List of antennes
 *   post:
 *     summary: Create an antenne
 *     tags: [Antennes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AntenneCreate'
 *     responses:
 *       201:
 *         description: Antenne created
 *       409:
 *         description: Code or nom already exists
 */
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await antenneService.getAll()); } catch (e) { next(e); }
};

/**
 * @openapi
 * /antennes/{id}:
 *   get:
 *     summary: Get antenne by ID
 *     tags: [Antennes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Antenne detail
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update antenne
 *     tags: [Antennes]
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
 *             $ref: '#/components/schemas/AntenneUpdate'
 *     responses:
 *       200:
 *         description: Antenne updated
 *   delete:
 *     summary: Delete antenne
 *     tags: [Antennes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Antenne deleted
 *       409:
 *         description: Cannot delete – linked entities exist
 */
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await antenneService.getById(parseInt(req.params.id))); } catch (e) { next(e); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(await antenneService.create(req.body)); } catch (e) { next(e); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await antenneService.update(parseInt(req.params.id), req.body)); } catch (e) { next(e); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await antenneService.remove(parseInt(req.params.id))); } catch (e) { next(e); }
};
