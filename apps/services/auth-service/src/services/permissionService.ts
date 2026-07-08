import * as repo from '../repositories/permissionRepository';
import { ConflictError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import type { PermissionCreateInput, PermissionUpdateInput } from '../../../../../shared/types/auth.types';

const isPrismaError = (e: unknown): e is { code: string } =>
  typeof e === 'object' && e !== null && 'code' in e;

export const getAll = () => repo.findAll();

export const getById = async (id: number) => {
  const item = await repo.findById(id);
  if (!item) throw new NotFoundError('Permission not found');
  return item;
};

export const create = async (data: PermissionCreateInput) => {
  try {
    const perm = await repo.create(data);
    logger.info({ code: data.code }, 'Permission created');
    return perm;
  } catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('Permission code already exists');
    throw e;
  }
};

export const update = async (id: number, data: PermissionUpdateInput) => {
  await getById(id);
  try { return await repo.update(id, data); }
  catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('Permission code already exists');
    throw e;
  }
};

export const remove = async (id: number) => {
  await getById(id);
  const count = await repo.countRoleAssignments(id);
  if (count > 0) throw new ConflictError(`Cannot delete: assigned to ${count} roles`);
  return repo.remove(id);
};
