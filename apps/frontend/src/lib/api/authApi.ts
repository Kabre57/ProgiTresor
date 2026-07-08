import { apiClient } from '@/lib/api/client';
import type {
  LoginInput,
  LoginResponse,
  PaginatedUsers,
  Role,
  UserFormInput,
  UserProfile,
} from '@/types/auth.types';

export type Permission = {
  id: number;
  code: string;
  libelle: string;
  module: string;
};

export const authApi = {
  login: async (payload: LoginInput) => {
    const response = await apiClient.post<LoginResponse>('/auth/login', payload);
    return response.data;
  },

  refreshAccessToken: async () => {
    const response = await apiClient.post<{ accessToken: string }>('/auth/refresh-token', {});
    return response.data;
  },

  me: async () => {
    const response = await apiClient.get<UserProfile>('/auth/me');
    return response.data;
  },

  listUsers: async (page = 1, limit = 20) => {
    const response = await apiClient.get<PaginatedUsers>('/users', { params: { page, limit } });
    return response.data;
  },

  createUser: async (payload: UserFormInput) => {
    const response = await apiClient.post<UserProfile>('/users', payload);
    return response.data;
  },

  updateUser: async (id: number, payload: Partial<UserFormInput>) => {
    const response = await apiClient.put<UserProfile>(`/users/${id}`, payload);
    return response.data;
  },

  deleteUser: async (id: number) => {
    const response = await apiClient.delete<{ success?: boolean }>(`/users/${id}`);
    return response.data;
  },

  listRoles: async () => {
    const response = await apiClient.get<Role[]>('/roles');
    return response.data;
  },

  listPermissions: async () => {
    const response = await apiClient.get<Permission[]>('/permissions');
    return response.data;
  },

  createPermission: async (payload: { code: string; libelle: string; module: string }) => {
    const response = await apiClient.post<Permission>('/permissions', payload);
    return response.data;
  },

  createRole: async (payload: { code: string; libelle: string; description?: string }) => {
    const response = await apiClient.post<Role>('/roles', payload);
    return response.data;
  },

  updateRole: async (id: number, payload: { code?: string; libelle?: string; description?: string }) => {
    const response = await apiClient.put<Role>(`/roles/${id}`, payload);
    return response.data;
  },

  deleteRole: async (id: number) => {
    const response = await apiClient.delete<{ success?: boolean }>(`/roles/${id}`);
    return response.data;
  },

  getRolePermissions: async (roleId: number) => {
    const response = await apiClient.get<Permission[]>(`/roles/${roleId}/permissions`);
    return response.data;
  },

  assignRolePermissions: async (roleId: number, permissionIds: number[]) => {
    const response = await apiClient.post<{ message: string }>(`/roles/${roleId}/permissions`, { permissionIds });
    return response.data;
  },

  removeRolePermission: async (roleId: number, permissionId: number) => {
    const response = await apiClient.delete<{ message: string }>(`/roles/${roleId}/permissions/${permissionId}`);
    return response.data;
  },

  // ========================================================
  // Profil personnel
  // ========================================================

  /** Mettre à jour le profil de l'utilisateur connecté */
  updateMyProfile: async (payload: { nom?: string; prenom?: string; email?: string; service?: string; photoUrl?: string }) => {
    const response = await apiClient.put<UserProfile>('/me/profile', payload);
    return response.data;
  },

  /** Uploader une photo de profil (multipart/form-data) */
  uploadMyPhoto: async (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await apiClient.post<{ message: string; user: UserProfile }>('/me/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // ========================================================
  // Périmètres Graduationnels
  // ========================================================

  listPerimeters: async () => {
    const response = await apiClient.get<Perimeter[]>('/perimeters');
    return response.data;
  },

  getUserPerimeters: async (userId: number) => {
    const response = await apiClient.get<UserPerimeterValue[]>(`/users/${userId}/perimeters`);
    return response.data;
  },

  setUserPerimeterLevel: async (userId: number, payload: { perimeterId: string; level: number }) => {
    const response = await apiClient.post<UserPerimeterValue[]>(`/users/${userId}/perimeters`, payload);
    return response.data;
  },
};

export type PerimeterLevel = {
  id: number;
  perimeterId: string;
  level: number;
  libelle: string;
};

export type Perimeter = {
  id: string;
  libelle: string;
  levels: PerimeterLevel[];
};

export type UserPerimeterValue = {
  perimeterId: string;
  perimeterLibelle: string;
  level: number;
  levelLibelle: string;
};
