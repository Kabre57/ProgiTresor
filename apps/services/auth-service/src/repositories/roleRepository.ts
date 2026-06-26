import { Prisma, PrismaClient, Role, RolePermission } from '@prisma/client';
import { dbQueryDuration } from '../utils/metrics';
import { prisma } from '../utils/prisma';

const roleInclude = { permissions: { include: { permission: true } } } satisfies Prisma.RoleInclude;
export type RoleWithPermissions = Prisma.RoleGetPayload<{ include: typeof roleInclude }>;

export const findAll = async (): Promise<RoleWithPermissions[]> => {
  const end = dbQueryDuration.startTimer({ operation: 'role_find_all' });
  try { return await prisma.role.findMany({ orderBy: { code: 'asc' }, include: roleInclude }); }
  finally { end(); }
};

export const findById = async (id: number): Promise<RoleWithPermissions | null> => {
  const end = dbQueryDuration.startTimer({ operation: 'role_find_by_id' });
  try { return await prisma.role.findUnique({ where: { id }, include: roleInclude }); }
  finally { end(); }
};

export const create = async (data: Prisma.RoleCreateInput): Promise<RoleWithPermissions> => {
  const end = dbQueryDuration.startTimer({ operation: 'role_create' });
  try { return await prisma.role.create({ data, include: roleInclude }); }
  finally { end(); }
};

export const update = async (id: number, data: Prisma.RoleUpdateInput): Promise<RoleWithPermissions> => {
  const end = dbQueryDuration.startTimer({ operation: 'role_update' });
  try { return await prisma.role.update({ where: { id }, data, include: roleInclude }); }
  finally { end(); }
};

export const remove = async (id: number): Promise<Role> => {
  const end = dbQueryDuration.startTimer({ operation: 'role_delete' });
  try { return await prisma.role.delete({ where: { id } }); }
  finally { end(); }
};

export const countUsers = async (id: number): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'role_count_users' });
  try { return await prisma.utilisateur.count({ where: { roleId: id } }); }
  finally { end(); }
};

export const assignPermissions = async (roleId: number, permissionIds: number[]): Promise<void> => {
  const end = dbQueryDuration.startTimer({ operation: 'role_assign_permissions' });
  try {
    await prisma.rolePermission.createMany({
      data: permissionIds.map(pid => ({ roleId, permissionId: pid })),
      skipDuplicates: true,
    });
  } finally { end(); }
};

export const removePermission = async (roleId: number, permissionId: number): Promise<RolePermission> => {
  const end = dbQueryDuration.startTimer({ operation: 'role_remove_permission' });
  try {
    return await prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
  } finally { end(); }
};
