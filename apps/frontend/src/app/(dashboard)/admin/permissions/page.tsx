'use client';

import { Plus, Save } from 'lucide-react';
import { PiPlusDuotone } from 'react-icons/pi';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/api/client';
import { usePermissions, useCreatePermission } from '@/lib/hooks/useAuthQueries';

type PermissionFormInput = {
  code: string;
  libelle: string;
  module: string;
};

export default function PermissionsPage() {
  const permissionsQuery = usePermissions();
  const createPermissionMutation = useCreatePermission();
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PermissionFormInput>({
    defaultValues: {
      code: '',
      libelle: '',
      module: '',
    },
  });

  const onSubmit = async (values: PermissionFormInput) => {
    try {
      await createPermissionMutation.mutateAsync(values);
      toast.success('Permission créée avec succès.');
      setIsModalOpen(false);
      reset();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Erreur de création');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissions"
        description="Liste et création des permissions du système RBAC."
        actions={
          <Button 
            variant="solid"
            type="button" 
            onClick={() => { setIsModalOpen(true); reset(); }}
            icon={<PiPlusDuotone className="text-xl" />}
          >
            Nouvelle permission
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable<any>
            data={permissionsQuery.data ?? []}
            loading={permissionsQuery.isLoading}
            getRowKey={(row) => row.id}
            emptyLabel="Aucune permission configurée"
            columns={[
              { key: 'module', header: 'Module', render: (row) => <Badge tone="info">{row.module}</Badge> },
              { key: 'code', header: 'Code', render: (row) => <span className="font-mono text-xs">{row.code}</span> },
              { key: 'libelle', header: 'Libellé', render: (row) => row.libelle },
            ]}
          />
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Créer une nouvelle permission"
        width={500}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Module"
            placeholder="Ex: Scolarité, Comptabilité, Configuration"
            error={errors.module?.message}
            {...register('module', { required: 'Le module est requis' })}
          />
          <Input
            label="Code"
            placeholder="Ex: READ_ETUDIANT, WRITE_COMPTA"
            error={errors.code?.message}
            {...register('code', { required: 'Le code est requis' })}
          />
          <Input
            label="Libellé"
            placeholder="Ex: Consulter les fiches étudiants"
            error={errors.libelle?.message}
            {...register('libelle', { required: 'Le libellé est requis' })}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" loading={isSubmitting}>
              <Save className="h-4 w-4 mr-1.5" />
              Créer la permission
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
