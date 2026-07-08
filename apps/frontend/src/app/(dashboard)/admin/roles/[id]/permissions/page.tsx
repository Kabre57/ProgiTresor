'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/api/client';
import {
  usePermissions,
  useRolePermissions,
  useAssignRolePermissions,
  useRemoveRolePermission,
  useRoles,
} from '@/lib/hooks/useAuthQueries';

export default function RolePermissionsPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  
  const roleId = Number(params.id);

  // Queries & Mutations
  const rolesQuery = useRoles();
  const allPermissionsQuery = usePermissions();
  const rolePermissionsQuery = useRolePermissions(roleId);
  const assignMutation = useAssignRolePermissions();
  const removeMutation = useRemoveRolePermission();

  const role = (rolesQuery.data ?? []).find((r) => r.id === roleId);

  const rolePermissionIds = new Set((rolePermissionsQuery.data ?? []).map((p) => p.id));

  const handleTogglePermission = async (permissionId: number, isAssigned: boolean) => {
    try {
      if (isAssigned) {
        // Remove assignment
        await removeMutation.mutateAsync({ roleId, permissionId });
        toast.success('Permission retirée du rôle.');
      } else {
        // Assign permission
        await assignMutation.mutateAsync({ roleId, permissionIds: [permissionId] });
        toast.success('Permission attribuée au rôle.');
      }
    } catch (err) {
      toast.error(getErrorMessage(err), 'Erreur de modification');
    }
  };

  const isLoading =
    rolesQuery.isLoading ||
    allPermissionsQuery.isLoading ||
    rolePermissionsQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="space-y-4 text-center py-12">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Rôle introuvable</h3>
        <Button onClick={() => router.push('/admin/roles')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour à la liste
        </Button>
      </div>
    );
  }

  // Group permissions by module for clean presentation
  const groupedPermissions = (allPermissionsQuery.data ?? []).reduce(
    (groups, perm) => {
      const mod = perm.module || 'Autre';
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(perm);
      return groups;
    },
    {} as Record<string, typeof allPermissionsQuery.data>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Retour
        </Button>
      </div>

      <PageHeader
        title={`Permissions - ${role.libelle}`}
        description={`Attribuez ou retirez les droits d'accès pour le rôle "${role.code}".`}
      />

      <div className="grid gap-6">
        {Object.entries(groupedPermissions).map(([moduleName, permissions]) => (
          <Card key={moduleName}>
            <CardHeader className="border-b border-[var(--border)] py-4">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-500" />
                <span>Module : {moduleName}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-[var(--border)]">
              {(permissions ?? []).map((perm) => {
                const isAssigned = rolePermissionIds.has(perm.id);
                const isToggling =
                  (assignMutation.isPending && assignMutation.variables?.permissionIds.includes(perm.id)) ||
                  (removeMutation.isPending && removeMutation.variables?.permissionId === perm.id);

                return (
                  <div
                    key={perm.id}
                    className="flex items-center justify-between py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 px-2 transition-colors"
                  >
                    <div className="space-y-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                          {perm.libelle}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {perm.code}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        disabled={isToggling}
                        onChange={() => handleTogglePermission(perm.id, isAssigned)}
                        className="h-5 w-5 rounded border-[var(--border)] text-amber-500 focus:ring-amber-500 cursor-pointer disabled:opacity-50"
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
