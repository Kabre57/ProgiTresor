import { Request, Response, NextFunction } from 'express';
import * as roleService from '../services/roleService';

/** @openapi
 * /roles:
 *   get:
 *     summary: List all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles with permissions
 *   post:
 *     summary: Create a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoleCreate'
 *     responses:
 *       201:
 *         description: Role created
 */
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await roleService.getAll()); } catch (e) { next(e); }
};
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await roleService.getById(parseInt(req.params.id))); } catch (e) { next(e); }
};
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(await roleService.create(req.body)); } catch (e) { next(e); }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await roleService.update(parseInt(req.params.id), req.body)); } catch (e) { next(e); }
};
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await roleService.remove(parseInt(req.params.id))); } catch (e) { next(e); }
};

/** @openapi
 * /roles/{id}/permissions:
 *   get:
 *     summary: Get permissions for a role
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of permissions
 *   post:
 *     summary: Assign permissions to a role
 *     tags: [Roles]
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
 *             $ref: '#/components/schemas/RolePermissionAssign'
 *     responses:
 *       200:
 *         description: Permissions assigned
 */
export const getPermissions = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await roleService.getPermissions(parseInt(req.params.id))); } catch (e) { next(e); }
};
export const assignPermissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await roleService.assignPermissions(parseInt(req.params.id), req.body.permissionIds);
    res.json(result);
  } catch (e) { next(e); }
};

/** @openapi
 * /roles/{id}/permissions/{permId}:
 *   delete:
 *     summary: Remove permission from a role
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: permId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Permission removed
 */
export const removePermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await roleService.removePermission(parseInt(req.params.id), parseInt(req.params.permId));
    res.json({ message: 'Permission removed' });
  } catch (e) { next(e); }
};
