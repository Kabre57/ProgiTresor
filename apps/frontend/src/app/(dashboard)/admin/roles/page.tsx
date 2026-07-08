'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/api/client';
import { useRouter } from 'next/navigation';
import {
  useRoles,
  usePermissions,
  useUsers,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useAssignRolePermissions,
  useRemoveRolePermission,
  useUpdateUser,
  usePerimeters,
  useUserPerimeters,
  useSetUserPerimeterLevel,
} from '@/lib/hooks/useAuthQueries';
import type { Role, UserProfile } from '@/types/auth.types';
import type { Permission } from '@/lib/api/authApi';
import {
  Users,
  FileText,
  ShieldAlert,
  Landmark,
  BarChart2,
  Search,
  Plus,
  Loader2,
} from 'lucide-react';

const permissionLabels: Record<string, string> = {
  IMPORT_FICHIER: 'Importer',
  GERER_TRANSACTIONS: 'Gérer',
  GENERER_SYNTHESE: 'Synthétiser',
  VALIDER_OT: 'Valider',
  APPROUVER_OT: 'Approuver',
  EMETTRE_OT: 'Émettre',
  GERER_COMPTA: 'Comptabiliser',
  CONSULTER_RAPPORTS: 'Consulter',
  GERER_UTILISATEURS: 'Gérer',
};

const moduleMeta: Record<
  string,
  { title: string; desc: string; icon: React.ComponentType<{ className?: string }> }
> = {
  ADMIN: {
    title: 'Gestion des utilisateurs',
    desc: "Contrôle d'accès pour la gestion des comptes et rôles applicatifs.",
    icon: Users,
  },
  TRANSACTIONS: {
    title: 'Gestion des transactions',
    desc: 'Contrôle des flux financiers hors budget et imports de fichiers.',
    icon: FileText,
  },
  ORDERS: {
    title: 'Ordres de traitement (OT)',
    desc: "Cycle de validation, d'approbation et d'émission des ordres de traitement.",
    icon: ShieldAlert,
  },
  COMPTA: {
    title: 'Gestion comptable',
    desc: 'Suivi et validation des écritures et intégrations comptables.',
    icon: Landmark,
  },
  REPORTING: {
    title: 'Rapports & Statistiques',
    desc: 'Consultation des indicateurs de performance et des exports.',
    icon: BarChart2,
  },
};

const UserPerimeterCell = ({
  user,
  onManageAccess,
}: {
  user: UserProfile;
  onManageAccess: (user: UserProfile) => void;
}) => {
  const { data: userPerimeters, isLoading } = useUserPerimeters(user.id);

  if (isLoading) {
    return <span className="text-xs text-slate-400">Chargement...</span>;
  }

  const activePerimeters = userPerimeters?.filter((p) => p.level > 0) || [];

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex flex-wrap gap-1">
        {activePerimeters.length > 0 ? (
          activePerimeters.map((p) => (
            <Badge key={p.perimeterId} tone="warning" className="text-[10px] px-1 py-0.5 font-semibold">
              {p.perimeterId}: {p.levelLibelle}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-500">Aucun</span>
        )}
      </div>
      <button
        onClick={() => onManageAccess(user)}
        className="ml-1 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors p-1"
        title="Gérer les périmètres d'accès"
      >
        <ShieldAlert className="h-4 w-4" />
      </button>
    </div>
  );
};

const UserPerimeterModal = ({
  user,
  onClose,
}: {
  user: UserProfile;
  onClose: () => void;
}) => {
  const { data: perimeters, isLoading: loadingPerimeters } = usePerimeters();
  const { data: userPerimeters, isLoading: loadingUserPerimeters } = useUserPerimeters(user.id);
  const setLevelMutation = useSetUserPerimeterLevel();
  const toast = useToast();

  const handleLevelChange = async (perimeterId: string, level: number) => {
    try {
      await setLevelMutation.mutateAsync({
        userId: user.id,
        perimeterId,
        level,
      });
      toast.success(`Niveau mis à jour avec succès pour ${perimeterId}`);
    } catch (err) {
      toast.error(getErrorMessage(err), 'Erreur de mise à jour');
    }
  };

  const isLoading = loadingPerimeters || loadingUserPerimeters;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gérer les niveaux d'accès de <strong>{user.prenom} {user.nom}</strong> pour chaque périmètre. 
          Les niveaux sont cumulatifs : un niveau supérieur hérite automatiquement des droits des niveaux inférieurs.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {perimeters?.map((p) => {
            const currentVal = userPerimeters?.find((up) => up.perimeterId === p.id)?.level || 0;
            
            return (
              <div 
                key={p.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 gap-4"
              >
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    Périmètre: {p.libelle} ({p.id})
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Déterminez les privilèges hiérarchiques.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={currentVal}
                    onChange={(e) => handleLevelChange(p.id, Number(e.target.value))}
                    disabled={setLevelMutation.isPending}
                    className="text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                  >
                    <option value={0}>Aucun accès</option>
                    {p.levels.map((lvl) => (
                      <option key={lvl.id} value={lvl.level}>
                        Niveau {lvl.level} - {lvl.libelle}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

const RoleSelectCell = ({ user, roles }: { user: UserProfile; roles: Role[] }) => {
  const updateUser = useUpdateUser();
  const [val, setVal] = useState(user.role.code);
  const toast = useToast();

  const onChange = async (newRoleCode: string) => {
    setVal(newRoleCode);
    try {
      await updateUser.mutateAsync({
        id: user.id,
        payload: { roleCode: newRoleCode },
      });
      toast.success(`Le rôle de ${user.prenom} ${user.nom} a été mis à jour.`);
    } catch (err) {
      setVal(user.role.code);
      toast.error(getErrorMessage(err), 'Erreur de mise à jour');
    }
  };

  return (
    <select
      value={val}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
    >
      {roles.map((r) => (
        <option key={r.id} value={r.code}>
          {r.libelle}
        </option>
      ))}
    </select>
  );
};

export default function RolesPage() {
  const router = useRouter();
  const toast = useToast();

  // Queries
  const rolesQuery = useRoles();
  const permissionsQuery = usePermissions();
  const usersQuery = useUsers(1, 100);

  // Mutations
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const assignRolePermissions = useAssignRolePermissions();
  const removeRolePermission = useRemoveRolePermission();

  // Component States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [perimeterUser, setPerimeterUser] = useState<UserProfile | null>(null);

  // Form States
  const [roleName, setRoleName] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync Form when editing
  useEffect(() => {
    if (roleToEdit) {
      setRoleName(roleToEdit.libelle);
      setRoleCode(roleToEdit.code);
      setRoleDesc(roleToEdit.description || '');
      setSelectedPermIds(roleToEdit.permissions?.map((rp) => rp.permission.id) ?? []);
    } else {
      setRoleName('');
      setRoleCode('');
      setRoleDesc('');
      setSelectedPermIds([]);
    }
  }, [roleToEdit, isModalOpen]);

  const handleOpenCreate = () => {
    setRoleToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: Role) => {
    setRoleToEdit(role);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;
    try {
      await deleteRole.mutateAsync(roleToDelete.id);
      toast.success('Rôle supprimé avec succès.');
    } catch (err) {
      toast.error(getErrorMessage(err), 'Erreur lors de la suppression');
    } finally {
      setRoleToDelete(null);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      toast.error('Le nom du rôle est requis.');
      return;
    }

    try {
      setIsSubmitting(true);
      let roleId: number;
      let originalPermissionIds: number[] = [];

      if (roleToEdit) {
        roleId = roleToEdit.id;
        await updateRole.mutateAsync({
          id: roleId,
          payload: {
            libelle: roleName,
            description: roleDesc,
          },
        });
        originalPermissionIds = roleToEdit.permissions?.map((rp) => rp.permission.id) ?? [];
      } else {
        const generatedCode = roleName
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase()
          .replace(/\s+/g, '_')
          .replace(/[^\w_]+/g, '')
          .substring(0, 30);

        const newRole = await createRole.mutateAsync({
          code: generatedCode || `ROLE_${Math.floor(Math.random() * 1000)}`,
          libelle: roleName,
          description: roleDesc,
        });
        roleId = newRole.id;
      }

      // Sync Permissions
      const toAdd = selectedPermIds.filter((id) => !originalPermissionIds.includes(id));
      const toRemove = originalPermissionIds.filter((id) => !selectedPermIds.includes(id));

      if (toAdd.length > 0) {
        await assignRolePermissions.mutateAsync({ roleId, permissionIds: toAdd });
      }
      for (const permId of toRemove) {
        await removeRolePermission.mutateAsync({ roleId, permissionId: permId });
      }

      toast.success(roleToEdit ? 'Rôle mis à jour' : 'Rôle créé avec succès');
      setIsModalOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err), 'Erreur de sauvegarde');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group permissions
  const groupedPermissions = (permissionsQuery.data ?? []).reduce(
    (acc, perm) => {
      const mod = perm.module || 'Autre';
      if (!acc[mod]) acc[mod] = [];
      acc[mod].push(perm);
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  // Filter Users
  const filteredUsers = (usersQuery.data?.data ?? []).filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.nom.toLowerCase().includes(query) ||
      user.prenom.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  const getRoleUsers = (code: string) => {
    return (usersQuery.data?.data ?? []).filter((u) => u.role.code === code);
  };

  const isLoading = rolesQuery.isLoading || permissionsQuery.isLoading || usersQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Rôles et permissions"
        description="Gérez les profils d'accès et attribuez les rôles aux comptes utilisateurs."
        actions={
          <Button
            variant="solid"
            type="button"
            onClick={handleOpenCreate}
            icon={<Plus className="h-4 w-4" />}
          >
            Créer un rôle
          </Button>
        }
      />

      {/* Grid des Rôles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(rolesQuery.data ?? []).map((role) => {
          const roleUsers = getRoleUsers(role.code);
          return (
            <Card key={role.id} className="hover:shadow-md transition-shadow flex flex-col justify-between h-full bg-white dark:bg-slate-800">
              <CardContent className="pt-6 flex flex-col justify-between h-full space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      {role.libelle}
                    </h4>
                    <Badge tone="info">{role.code}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3">
                    {role.description || 'Aucune description fournie.'}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Avatars cumulés */}
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2 overflow-hidden">
                      {roleUsers.slice(0, 4).map((user) => (
                        <div
                          key={user.id}
                          className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-700"
                          title={`${user.prenom} ${user.nom}`}
                        >
                          {user.photoUrl ? (
                            <img src={user.photoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase">
                              {user.prenom[0]}
                              {user.nom[0]}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {roleUsers.length} utilisateur{roleUsers.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Actions de bas de carte */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => router.push(`/admin/roles/${role.id}/permissions`)}
                      className="text-xs font-semibold text-amber-500 hover:text-amber-600 transition"
                    >
                      Gérer les permissions
                    </button>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleOpenEdit(role)}
                        className="text-xs font-semibold text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition"
                      >
                        Modifier
                      </button>
                      {!['ADMIN', 'COMPTABLE', 'BUDGET', 'CHEF_COMPTABLE', 'DF', 'CONSULTANT', 'ETUDIANT'].includes(role.code) && (
                        <button
                          onClick={() => handleDeleteClick(role)}
                          className="text-xs font-semibold text-red-500 hover:text-red-600 transition"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tous les comptes */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Tous les comptes</h3>
          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Recherche..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <DataTable<UserProfile>
          data={filteredUsers}
          getRowKey={(row) => row.id}
          columns={[
            {
              key: 'nom',
              header: 'NOM',
              render: (row) => (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    {row.photoUrl ? (
                      <img src={row.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-300 uppercase">
                        {row.prenom[0]}
                        {row.nom[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                      {row.prenom} {row.nom}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-400">{row.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'status',
              header: 'STATUT',
              render: (row) => (
                <Badge tone={row.actif ? 'success' : 'danger'}>
                  {row.actif ? 'Actif' : 'Inactif'}
                </Badge>
              ),
            },
            {
              key: 'derniereConnexion',
              header: 'DERNIÈRE CONNEXION',
              render: (row) =>
                row.derniereConnexion
                  ? new Date(row.derniereConnexion).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Jamais',
            },
            {
              key: 'role',
              header: 'RÔLE',
              render: (row) => (
                <RoleSelectCell user={row} roles={rolesQuery.data ?? []} />
              ),
            },
            {
              key: 'perimeters',
              header: 'PÉRIMÈTRES ACCÈS',
              render: (row) => (
                <UserPerimeterCell user={row} onManageAccess={setPerimeterUser} />
              ),
            },
          ]}
        />
      </div>

      {/* Modal Créer / Modifier Rôle */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={roleToEdit ? 'Modifier le rôle' : 'Créer un rôle'}
        width={680}
      >
        <form onSubmit={handleSaveRole} className="space-y-6">
          <Input
            label="Nom du rôle"
            placeholder="ex: Support Technique"
            required
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
          />

          <Textarea
            label="Description"
            placeholder="Décrivez les responsabilités de ce rôle..."
            value={roleDesc}
            onChange={(e) => setRoleDesc(e.target.value)}
          />

          {/* Section d'autorisations par module */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-slate-700">
              Autorisations
            </h4>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {Object.entries(groupedPermissions).map(([modName, perms]) => {
                const meta = moduleMeta[modName] || {
                  title: modName,
                  desc: `Droits relatifs au module ${modName}`,
                  icon: ShieldAlert,
                };
                const IconComponent = meta.icon;

                return (
                  <div
                    key={modName}
                    className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4"
                  >
                    <div className="flex items-start gap-3 max-w-sm">
                      <div className="p-2 rounded bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {meta.title}
                        </h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {meta.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 sm:justify-end">
                      {perms.map((perm) => {
                        const isSelected = selectedPermIds.includes(perm.id);
                        const label = permissionLabels[perm.code] || perm.libelle;
                        return (
                          <button
                            key={perm.id}
                            type="button"
                            onClick={() => {
                              setSelectedPermIds((prev) =>
                                prev.includes(perm.id)
                                  ? prev.filter((id) => id !== perm.id)
                                  : [...prev, perm.id]
                              );
                            }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded border transition-all ${
                              isSelected
                                ? 'bg-amber-500 border-amber-500 text-white shadow-sm hover:bg-amber-600'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation de suppression de rôle */}
      <ConfirmDialog
        open={!!roleToDelete}
        type="danger"
        title="Supprimer le rôle"
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmLoading={deleteRole.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setRoleToDelete(null)}
      >
        Êtes-vous sûr de vouloir supprimer le rôle{' '}
        <span className="font-semibold text-slate-900 dark:text-white">
          {roleToDelete?.libelle} ({roleToDelete?.code})
        </span>{' '}
        ? Cette action est irréversible et retirera ce profil à tous les comptes qui y sont associés.
      </ConfirmDialog>

      {/* Modal de gestion des périmètres graduationnels */}
      {perimeterUser && (
        <Modal
          open={!!perimeterUser}
          onClose={() => setPerimeterUser(null)}
          title="Gérer les permissions graduationnelles"
          width={600}
        >
          <UserPerimeterModal
            user={perimeterUser}
            onClose={() => setPerimeterUser(null)}
          />
        </Modal>
      )}
    </div>
  );
}
