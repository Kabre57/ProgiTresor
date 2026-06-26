import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api/authApi';
import type { UserFormInput } from '@/types/auth.types';

export const authQueryKeys = {
  users: (page: number, limit: number) => ['auth', 'users', page, limit] as const,
  roles: ['auth', 'roles'] as const,
  permissions: ['auth', 'permissions'] as const,
};

export const useUsers = (page = 1, limit = 20) =>
  useQuery({
    queryKey: authQueryKeys.users(page, limit),
    queryFn: () => authApi.listUsers(page, limit),
  });

export const useRoles = () =>
  useQuery({
    queryKey: authQueryKeys.roles,
    queryFn: authApi.listRoles,
  });

export const usePermissions = () =>
  useQuery({
    queryKey: authQueryKeys.permissions,
    queryFn: authApi.listPermissions,
  });

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserFormInput) => authApi.createUser(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth', 'users'] }),
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<UserFormInput> }) => authApi.updateUser(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth', 'users'] }),
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => authApi.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth', 'users'] }),
  });
};

export const useCreatePermission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { code: string; libelle: string; module: string }) => authApi.createPermission(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authQueryKeys.permissions }),
  });
};

export const useRolePermissions = (roleId: number) =>
  useQuery({
    queryKey: ['auth', 'role-permissions', roleId],
    queryFn: () => authApi.getRolePermissions(roleId),
    enabled: !isNaN(roleId) && roleId > 0,
  });

export const useAssignRolePermissions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: number; permissionIds: number[] }) =>
      authApi.assignRolePermissions(roleId, permissionIds),
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'role-permissions', roleId] });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.roles });
    },
  });
};

export const useRemoveRolePermission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: number; permissionId: number }) =>
      authApi.removeRolePermission(roleId, permissionId),
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'role-permissions', roleId] });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.roles });
    },
  });
};
