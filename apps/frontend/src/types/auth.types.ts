import { z } from 'zod';

export type RoleCode =
  | 'ADMIN'
  | 'COMPTABLE'
  | 'BUDGET'
  | 'CHEF_COMPTABLE'
  | 'DF'
  | 'CONSULTANT'
  | 'ETUDIANT'
  | 'Administrateur'
  | 'Comptable'
  | 'Agent Budget'
  | 'Chef Comptable'
  | 'Directeur Financier'
  | 'Consultant'
  | 'Etudiant';

export type Role = {
  id: number;
  code: string;
  libelle: string;
  description: string | null;
  permissions?: {
    permission: {
      id: number;
      code: string;
      libelle: string;
      module: string;
    };
  }[];
};

export type UserProfile = {
  id: number;
  username: string;
  nom: string;
  prenom: string;
  email: string;
  service: string | null;
  actif: boolean;
  photoUrl: string | null;
  role: Role;
  perms?: Record<string, number>;
  denies?: string[];
  tokenVersion?: number;
  dateCreation: string;
  derniereConnexion: string | null;
};

export type LoginResponse = {
  token?: string;
  refreshToken?: string;
  user: UserProfile;
};

export type PaginatedUsers = {
  data: UserProfile[];
  total: number;
  page: number;
  limit: number;
};

export const loginSchema = z.object({
  username: z.string().min(1, 'Nom utilisateur requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export const userFormSchema = z.object({
  nom: z.string().min(1),
  prenom: z.string().min(1),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8).optional().or(z.literal('')),
  roleCode: z.string().min(1),
  service: z.string().optional(),
  photoUrl: z.string().optional().nullable(),
  actif: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type UserFormInput = z.infer<typeof userFormSchema>;
