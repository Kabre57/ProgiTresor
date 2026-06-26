'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { PiPlusDuotone } from 'react-icons/pi';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/api/client';
import { etudiantApi, type ReferentialEndpoint } from '@/lib/api/etudiantApi';

export type ReferentialRecord = {
  id: number;
};

export type ReferentialField = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'checkbox' | 'select';
  required?: boolean;
  options?: { label: string; value: string | number }[];
};

type ReferentialPageProps<T extends ReferentialRecord> = {
  endpoint: ReferentialEndpoint;
  title: string;
  description: string;
  fields: ReferentialField[];
  columns: DataTableColumn<T>[];
};

const toFormValues = <T extends ReferentialRecord>(fields: ReferentialField[], item?: T | null) => {
  const values: Record<string, string | boolean> = {};
  fields.forEach((field) => {
    const value = item ? (item as Record<string, unknown>)[field.name] : undefined;
    if (field.type === 'checkbox') {
      values[field.name] = typeof value === 'boolean' ? value : true;
    } else {
      values[field.name] = value === null || value === undefined ? '' : String(value);
    }
  });
  return values;
};

const toPayload = (fields: ReferentialField[], values: Record<string, string | boolean>) => {
  const payload: Record<string, unknown> = {};
  fields.forEach((field) => {
    const rawValue = values[field.name];
    if (field.type === 'checkbox') {
      payload[field.name] = Boolean(rawValue);
      return;
    }
    if (field.type === 'number' || field.type === 'select') {
      const textValue = String(rawValue ?? '');
      payload[field.name] = textValue === '' ? null : Number(textValue);
      return;
    }
    payload[field.name] = String(rawValue ?? '').trim();
  });
  return payload;
};

export function ReferentialPage<T extends ReferentialRecord>({
  endpoint,
  title,
  description,
  fields,
  columns,
}: ReferentialPageProps<T>) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>(() => toFormValues(fields));
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);

  const query = useQuery({
    queryKey: ['etudiant', 'referential', endpoint],
    queryFn: () => etudiantApi.listReferential(endpoint),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editing ? etudiantApi.updateReferential(endpoint, editing.id, payload) : etudiantApi.createReferential(endpoint, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etudiant', 'referential', endpoint] });
      toast.success(editing ? 'Élément modifié avec succès' : 'Élément créé avec succès');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err), "Erreur lors de l'enregistrement");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => etudiantApi.deleteReferential(endpoint, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etudiant', 'referential', endpoint] });
      toast.success('Élément supprimé avec succès');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err), 'Erreur lors de la suppression');
    },
  });

  const tableColumns = useMemo<DataTableColumn<T>[]>(
    () => [
      ...columns,
      {
        key: 'actions',
        header: '',
        render: (row) => (
          <div className="flex justify-end gap-1">
            <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label="Modifier">
              <Edit className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(row)} aria-label="Supprimer">
              <Trash2 className="h-4 w-4 text-[var(--error)]" aria-hidden="true" />
            </Button>
          </div>
        ),
      },
    ],
    [columns],
  );

  const openCreate = () => {
    setEditing(null);
    setValues(toFormValues(fields));
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (item: T) => {
    setEditing(item);
    setValues(toFormValues(fields, item));
    setError(null);
    setModalOpen(true);
  };

  const onDelete = (item: T) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      try {
        await deleteMutation.mutateAsync(itemToDelete.id);
      } finally {
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
      }
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      const payload = toPayload(fields, values);
      await saveMutation.mutateAsync(payload);
      setModalOpen(false);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  };

  const data = (query.data ?? []) as unknown as T[];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button 
            variant="solid"
            type="button" 
            onClick={openCreate}
            icon={<PiPlusDuotone className="text-xl" />}
          >
            Ajouter
          </Button>
        }
      />

      <DataTable<T>
        data={data}
        loading={query.isLoading}
        getRowKey={(row) => row.id}
        columns={tableColumns}
      />

      <Modal open={modalOpen} title={editing ? `Modifier ${title.toLowerCase()}` : `Ajouter ${title.toLowerCase()}`} onClose={() => setModalOpen(false)}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          {fields.map((field) => {
            if (field.type === 'checkbox') {
              return (
                <label key={field.name} className="flex items-center gap-2 pt-6 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--border)]"
                    checked={Boolean(values[field.name])}
                    onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.checked }))}
                  />
                  {field.label}
                </label>
              );
            }

            if (field.type === 'select') {
              return (
                <Select
                  key={field.name}
                  label={field.label}
                  placeholder="Sélectionner"
                  options={field.options ?? []}
                  value={String(values[field.name] ?? '')}
                  required={field.required}
                  searchable={true}
                  onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                />
              );
            }

            return (
              <Input
                key={field.name}
                label={field.label}
                type={field.type === 'number' ? 'number' : 'text'}
                value={String(values[field.name] ?? '')}
                required={field.required}
                onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
              />
            );
          })}

          {error ? <div className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={saveMutation.isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteConfirmOpen}
        type="danger"
        title="Supprimer l'élément"
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
      >
        Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.
      </ConfirmDialog>
    </div>
  );
}
