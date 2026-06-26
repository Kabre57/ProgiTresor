import { Prisma, PrismaClient, Permission } from '@prisma/client';
import { dbQueryDuration } from '../utils/metrics';
import { prisma } from '../utils/prisma';


export const findAll = async (): Promise<Permission[]> => {
  const end = dbQueryDuration.startTimer({ operation: 'permission_find_all' });
  try { return await prisma.permission.findMany({ orderBy: { module: 'asc' } }); }
  finally { end(); }
};

export const findById = async (id: number): Promise<Permission | null> => {
  const end = dbQueryDuration.startTimer({ operation: 'permission_find_by_id' });
  try { return await prisma.permission.findUnique({ where: { id } }); }
  finally { end(); }
};

export const create = async (data: Prisma.PermissionCreateInput): Promise<Permission> => {
  const end = dbQueryDuration.startTimer({ operation: 'permission_create' });
  try { return await prisma.permission.create({ data }); }
  finally { end(); }
};

export const update = async (id: number, data: Prisma.PermissionUpdateInput): Promise<Permission> => {
  const end = dbQueryDuration.startTimer({ operation: 'permission_update' });
  try { return await prisma.permission.update({ where: { id }, data }); }
  finally { end(); }
};

export const remove = async (id: number): Promise<Permission> => {
  const end = dbQueryDuration.startTimer({ operation: 'permission_delete' });
  try { return await prisma.permission.delete({ where: { id } }); }
  finally { end(); }
};

export const countRoleAssignments = async (id: number): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'permission_count_roles' });
  try { return await prisma.rolePermission.count({ where: { permissionId: id } }); }
  finally { end(); }
};
