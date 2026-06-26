import * as repo from '../repositories/roleRepository';
import { ConflictError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import type { RoleCreateInput, RoleUpdateInput } from '../../../../../shared/types/auth.types';

const isPrismaError = (e: unknown): e is { code: string } =>
  typeof e === 'object' && e !== null && 'code' in e;

export const getAll = () => repo.findAll();

export const getById = async (id: number) => {
  const item = await repo.findById(id);
  if (!item) throw new NotFoundError('Role not found');
  return item;
};

export const create = async (data: RoleCreateInput) => {
  try {
    const role = await repo.create(data);
    logger.info({ code: data.code }, 'Role created');
    return role;
  } catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('Role code already exists');
    throw e;
  }
};

export const update = async (id: number, data: RoleUpdateInput) => {
  await getById(id);
  try { return await repo.update(id, data); }
  catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('Role code already exists');
    throw e;
  }
};

export const remove = async (id: number) => {
  await getById(id);
  const count = await repo.countUsers(id);
  if (count > 0) throw new ConflictError(`Cannot delete: ${count} users have this role`);
  return repo.remove(id);
};

export const getPermissions = async (id: number) => {
  const role = await getById(id);
  return role.permissions.map(rp => rp.permission);
};

export const assignPermissions = async (roleId: number, permissionIds: number[]) => {
  await getById(roleId);
  await repo.assignPermissions(roleId, permissionIds);
  logger.info({ roleId, count: permissionIds.length }, 'Permissions assigned to role');
  return getById(roleId);
};

export const removePermission = async (roleId: number, permissionId: number) => {
  await getById(roleId);
  try {
    await repo.removePermission(roleId, permissionId);
    logger.info({ roleId, permissionId }, 'Permission removed from role');
  } catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2025') throw new NotFoundError('Permission not assigned to this role');
    throw e;
  }
};
