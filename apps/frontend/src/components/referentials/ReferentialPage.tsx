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
import { TbUpload } from 'react-icons/tb';
import ReferentialImportDialog from './ReferentialImportDialog';

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

const toPayload = (fields: ReferentialField[], values: Record<string, string | boolean>, endpoint?: ReferentialEndpoint) => {
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

  const sourceValue = String(payload.nom || payload.libelle || payload.libelleStandard || payload.libelleBrut || '').trim();
  if (sourceValue) {
    const slug = sourceValue
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .toUpperCase();

    if ('code' in payload && !payload.code) {
      let limit = 10;
      if (endpoint === 'statuts-etudiants' || endpoint === 'types-flux') {
        limit = 20;
      } else if (endpoint === 'types-recettes') {
        limit = 30;
      }
      payload.code = (slug || `CODE-${Math.floor(Math.random() * 1000)}`).substring(0, limit);
    }
    if ('codeProduit' in payload && !payload.codeProduit) {
      payload.codeProduit = (slug || `PROD-${Math.floor(Math.random() * 1000)}`).substring(0, 100);
    }
  }

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
  const [differentiateByStatut, setDifferentiateByStatut] = useState(false);
  const isNomenclature = endpoint === 'nomenclatures';
  const [importDialogOpen, setImportDialogOpen] = useState(false);
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
    setDifferentiateByStatut(false);
    setModalOpen(true);
  };

  const openEdit = (item: T) => {
    setEditing(item);
    setValues(toFormValues(fields, item));
    setError(null);
    setDifferentiateByStatut(false);
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
      if (isNomenclature && differentiateByStatut && !editing) {
        const statutField = fields.find(f => f.name === 'statutId');
        const options = statutField?.options || [];
        
        const promises = options.map((opt) => {
          const amountKey = `montant_${opt.value}`;
          const amountVal = values[amountKey];
          if (!amountVal || Number(amountVal) <= 0) return null;

          const suffix = String(opt.label).split(' - ').pop() || '';
          
          // Construct specific values for this statut
          const specificValues = {
            ...values,
            statutId: String(opt.value),
            montant: String(amountVal),
            libelleBrut: `${values.libelleBrut} ${suffix}`.toUpperCase(),
            codeProduit: `${values.libelleStandard || values.libelleBrut}`
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\s+/g, '-')
              .replace(/[^\w-]+/g, '')
              .toUpperCase() + `-${String(opt.value)}`,
          };

          const payload = toPayload(fields, specificValues, endpoint);
          return saveMutation.mutateAsync(payload);
        }).filter(Boolean);

        if (promises.length === 0) {
          setError("Veuillez saisir un montant pour au moins un statut.");
          return;
        }

        await Promise.all(promises);
        setModalOpen(false);
      } else {
        const payload = toPayload(fields, values, endpoint);
        await saveMutation.mutateAsync(payload);
        setModalOpen(false);
      }
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
          <div className="flex gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setImportDialogOpen(true)}
              icon={<TbUpload className="text-xl" />}
            >
              Importer
            </Button>
            <Button 
              variant="solid"
              type="button" 
              onClick={openCreate}
              icon={<PiPlusDuotone className="text-xl" />}
            >
              Ajouter
            </Button>
          </div>
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
            if (field.name === 'code' || field.name === 'codeProduit') {
              return null;
            }

            // Check duplicate logic
            const isUniqueField = ['code', 'codeProduit', 'libelleBrut', 'libelle', 'nom'].includes(field.name);
            const isDuplicate = isUniqueField && data.some(
              (item) =>
                String((item as any)[field.name] ?? '').trim().toLowerCase() ===
                  String(values[field.name] ?? '').trim().toLowerCase() &&
                item.id !== editing?.id
            );

            if (field.name === 'statutId' && isNomenclature && !editing) {
              return (
                <div key="statut-container" className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
                  <label className="flex items-center gap-2 pt-6 text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--border)]"
                      checked={differentiateByStatut}
                      onChange={(event) => setDifferentiateByStatut(event.target.checked)}
                    />
                    Définir des montants différents par statut (National / Non-National)
                  </label>
                  {!differentiateByStatut && (
                    <div className="sm:col-span-2">
                      <Select
                        label={field.label}
                        placeholder="Sélectionner"
                        options={field.options ?? []}
                        value={String(values[field.name] ?? '')}
                        required={field.required}
                        searchable={true}
                        onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                      />
                    </div>
                  )}
                </div>
              );
            }

            if (field.name === 'montant' && isNomenclature && !editing && differentiateByStatut) {
              const statutField = fields.find(f => f.name === 'statutId');
              const options = statutField?.options || [];
              return (
                <div key="multi-montants" className="sm:col-span-2 border-t pt-4 mt-2 grid gap-4 sm:grid-cols-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 sm:col-span-2">Montants par statut de l'étudiant</h4>
                  {options.map((opt) => (
                    <Input
                      key={`montant_${opt.value}`}
                      label={`Montant pour ${opt.label.split(' - ').pop()}`}
                      type="number"
                      value={String(values[`montant_${opt.value}`] ?? '')}
                      onChange={(event) => setValues((current) => ({ ...current, [`montant_${opt.value}`]: event.target.value }))}
                    />
                  ))}
                </div>
              );
            }

            if (field.name === 'statutId' && isNomenclature && !editing && differentiateByStatut) {
              return null; // Handled above
            }

            if (field.type === 'checkbox') {
              return (
                <div key={field.name} className="flex flex-col">
                  <label className="flex items-center gap-2 pt-6 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--border)]"
                      checked={Boolean(values[field.name])}
                      onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.checked }))}
                    />
                    {field.label}
                  </label>
                </div>
              );
            }

            if (field.type === 'select') {
              return (
                <div key={field.name} className="flex flex-col">
                  <Select
                    label={field.label}
                    placeholder="Sélectionner"
                    options={field.options ?? []}
                    value={String(values[field.name] ?? '')}
                    required={field.required}
                    searchable={true}
                    onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                  />
                  {isDuplicate && (
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1 block">
                      ⚠️ Cette valeur existe déjà et pourrait créer un doublon.
                    </span>
                  )}
                </div>
              );
            }

            const isCodeField = field.name === 'code' || field.name === 'codeProduit';

            return (
              <div key={field.name} className="flex flex-col">
                <Input
                  label={field.label}
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={String(values[field.name] ?? '')}
                  required={field.required}
                  disabled={isCodeField && !!editing}
                  onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                />
                {isDuplicate && (
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1 block">
                    ⚠️ Ce libellé ou code existe déjà et pourrait créer un doublon.
                  </span>
                )}
              </div>
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

      <ReferentialImportDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImported={() => query.refetch()}
        entity={endpoint}
        title={title}
      />
    </div>
  );
}
