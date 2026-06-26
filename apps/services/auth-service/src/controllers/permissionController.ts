import { Request, Response, NextFunction } from 'express';
import * as permissionService from '../services/permissionService';

/** @openapi
 * /permissions:
 *   get:
 *     summary: List all permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of permissions
 *   post:
 *     summary: Create a permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PermissionCreate'
 *     responses:
 *       201:
 *         description: Permission created
 */
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await permissionService.getAll()); } catch (e) { next(e); }
};
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await permissionService.getById(parseInt(req.params.id))); } catch (e) { next(e); }
};
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(await permissionService.create(req.body)); } catch (e) { next(e); }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await permissionService.update(parseInt(req.params.id), req.body)); } catch (e) { next(e); }
};
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await permissionService.remove(parseInt(req.params.id))); } catch (e) { next(e); }
};
