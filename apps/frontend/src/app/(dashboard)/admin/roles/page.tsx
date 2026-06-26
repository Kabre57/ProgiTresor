'use client';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { usePermissions, useRoles } from '@/lib/hooks/useAuthQueries';
import type { Permission } from '@/lib/api/authApi';
import type { Role } from '@/types/auth.types';

import { ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function RolesPage() {
  const rolesQuery = useRoles();
  const permissionsQuery = usePermissions();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader title="Rôles & permissions" description="Référentiels RBAC exposés par auth-service." />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rôles</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable<Role>
              data={rolesQuery.data ?? []}
              loading={rolesQuery.isLoading}
              getRowKey={(row) => row.id}
              columns={[
                { key: 'code', header: 'Code', render: (row) => <Badge tone="info">{row.code}</Badge> },
                { key: 'libelle', header: 'Libellé', render: (row) => row.libelle },
                { key: 'description', header: 'Description', render: (row) => row.description ?? '-' },
                {
                  key: 'actions',
                  header: '',
                  render: (row) => (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/roles/${row.id}/permissions`)}
                        className="flex items-center gap-1 text-amber-500 hover:text-amber-600 font-semibold"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Permissions</span>
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable<Permission>
              data={permissionsQuery.data ?? []}
              loading={permissionsQuery.isLoading}
              getRowKey={(row) => row.id}
              columns={[
                { key: 'module', header: 'Module', render: (row) => <Badge>{row.module}</Badge> },
                { key: 'code', header: 'Code', render: (row) => row.code },
                { key: 'libelle', header: 'Libellé', render: (row) => row.libelle },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
