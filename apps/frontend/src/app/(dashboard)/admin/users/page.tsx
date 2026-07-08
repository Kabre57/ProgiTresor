'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { PiPlusDuotone } from 'react-icons/pi';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/api/client';
import { useCreateUser, useDeleteUser, useRoles, useUpdateUser, useUsers } from '@/lib/hooks/useAuthQueries';
import { userFormSchema, type UserFormInput, type UserProfile } from '@/types/auth.types';

const emptyValues: UserFormInput = {
  nom: '',
  prenom: '',
  username: '',
  email: '',
  password: '',
  roleCode: '',
  service: '',
  actif: true,
};

export default function UsersPage() {
  const usersQuery = useUsers(1, 50);
  const rolesQuery = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const toast = useToast();
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

	  const {
	    register,
	    handleSubmit,
	    reset,
	    watch,
	    setValue,
	    control,
	    formState: { errors, isSubmitting },
	  } = useForm<UserFormInput>({
	    resolver: zodResolver(userFormSchema),
	    defaultValues: emptyValues,
	  });

	  const photoUrl = watch('photoUrl');

  const roleCodeVal = watch('roleCode');

  useEffect(() => {
    if (!modalOpen) return;
    if (editing) {
	    reset({
	        nom: editing.nom,
	        prenom: editing.prenom,
	        username: editing.username,
	        email: editing.email,
	        password: '',
	        roleCode: editing.role.code,
	        service: editing.service ?? '',
	        photoUrl: editing.photoUrl,
	        actif: editing.actif,
	      });
    } else {
      reset(emptyValues);
    }
  }, [editing, modalOpen, reset]);

  const openCreate = () => {
    setEditing(null);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (user: UserProfile) => {
    setEditing(user);
    setError(null);
    setModalOpen(true);
  };

  const onSubmit = async (values: UserFormInput) => {
    setError(null);
    try {
      const payload = { ...values, service: values.service || undefined };
      if (!editing && !payload.password) {
        setError('Le mot de passe est requis pour créer un utilisateur.');
        return;
      }
      if (editing) {
        const updatePayload: Partial<UserFormInput> = { ...payload };
        if (!updatePayload.password) delete updatePayload.password;
        await updateUser.mutateAsync({ id: editing.id, payload: updatePayload });
        toast.success('Utilisateur modifié avec succès');
      } else {
        await createUser.mutateAsync(payload);
        toast.success('Utilisateur créé avec succès');
      }
      setModalOpen(false);
    } catch (submitError) {
      const msg = getErrorMessage(submitError);
      setError(msg);
      toast.error(msg, "Erreur d'enregistrement");
    }
  };

  const onDelete = (user: UserProfile) => {
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (userToDelete) {
      try {
        await deleteUser.mutateAsync(userToDelete.id);
        toast.success('Utilisateur supprimé avec succès');
      } catch (err) {
        toast.error(getErrorMessage(err), 'Erreur lors de la suppression');
      } finally {
        setDeleteConfirmOpen(false);
        setUserToDelete(null);
      }
    }
  };

  const roleOptions = (rolesQuery.data ?? []).map((role) => ({
    label: `${role.libelle} (${role.code})`,
    value: role.code,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        description="Gestion des comptes et rôles applicatifs."
        actions={
          <Button 
            variant="solid"
            type="button" 
            onClick={openCreate}
            icon={<PiPlusDuotone className="text-xl" />}
          >
            Nouvel utilisateur
          </Button>
        }
      />

      <DataTable<UserProfile>
        data={usersQuery.data?.data ?? []}
        loading={usersQuery.isLoading}
        getRowKey={(row) => row.id}
        columns={[
          {
            key: 'photo',
            header: '',
            render: (row) => (
              <div className="flex items-center justify-center">
                <div className="h-10 w-10 overflow-hidden rounded-full border border-[var(--border)] bg-slate-100">
                  {row.photoUrl ? (
                    <img src={row.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">
                      {row.prenom[0]}{row.nom[0]}
                    </div>
                  )}
                </div>
              </div>
            ),
          },
          { key: 'name', header: 'Nom', render: (row) => <span className="font-medium">{row.prenom} {row.nom}</span> },
          { key: 'username', header: 'Utilisateur', render: (row) => row.username },
          { key: 'email', header: 'Email', render: (row) => row.email },
          { key: 'role', header: 'Rôle', render: (row) => <Badge tone="info">{row.role.libelle}</Badge> },
          { key: 'status', header: 'Statut', render: (row) => <Badge tone={row.actif ? 'success' : 'danger'}>{row.actif ? 'Actif' : 'Inactif'}</Badge> },
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
        ]}
      />

	      <Modal open={modalOpen} title={editing ? 'Modifier utilisateur' : 'Créer utilisateur'} onClose={() => setModalOpen(false)}>
	        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
	          <div className="sm:col-span-2 flex flex-col items-center justify-center gap-3 py-2">
	            <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-amber-500 bg-slate-100 shadow-sm">
	              {photoUrl ? (
	                <img src={photoUrl} alt="Aperçu" className="h-full w-full object-cover" />
	              ) : (
	                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-slate-300">
	                  ?
	                </div>
	              )}
	            </div>
	            <div className="flex gap-2">
	              <label className="cursor-pointer rounded bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600">
	                {photoUrl ? 'Changer la photo' : 'Ajouter une photo'}
	                <input
	                  type="file"
	                  accept="image/*"
	                  className="hidden"
	                  onChange={(e) => {
	                    const file = e.target.files?.[0];
	                    if (file) {
	                      const reader = new FileReader();
	                      reader.onloadend = () => {
	                        setValue('photoUrl', reader.result as string);
	                      };
	                      reader.readAsDataURL(file);
	                    }
	                  }}
	                />
	              </label>
	              {photoUrl && (
	                <button
	                  type="button"
	                  className="rounded bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-300"
	                  onClick={() => setValue('photoUrl', null)}
	                >
	                  Supprimer
	                </button>
	              )}
	            </div>
	          </div>
          <Input label="Nom" error={errors.nom?.message} {...register('nom')} />
          <Input label="Prénom" error={errors.prenom?.message} {...register('prenom')} />
          <Input label="Nom utilisateur" error={errors.username?.message} {...register('username')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input
            label={editing ? 'Nouveau mot de passe' : 'Mot de passe'}
            type="password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Select label="Rôle" placeholder="Choisir un rôle" options={roleOptions} error={errors.roleCode?.message} value={roleCodeVal} searchable {...register('roleCode')} />
          <Input label="Service" error={errors.service?.message} {...register('service')} />
          <label className="flex items-center gap-2 pt-6 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" className="h-4 w-4 rounded border-[var(--border)]" {...register('actif')} />
            Actif
          </label>
          {error ? <div className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={isSubmitting || createUser.isPending || updateUser.isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteConfirmOpen}
        type="danger"
        title="Supprimer l'utilisateur"
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmLoading={deleteUser.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setUserToDelete(null);
        }}
      >
        Êtes-vous sûr de vouloir supprimer l'utilisateur{' '}
        <span className="font-semibold">{userToDelete?.username}</span> ? Cette action est irréversible.
      </ConfirmDialog>
    </div>
  );
}
