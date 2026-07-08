'use client';

import { useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import AdaptiveCard from '@/components/shared/AdaptiveCard';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { usePromotions, useReferential } from '@/lib/hooks/useEtudiantQueries';
import { TbPhoto, TbTrash } from 'react-icons/tb';
import { etudiantFormSchema, type Etudiant, type EtudiantFormInput } from '@/types/etudiant.types';

export const emptyEtudiantFormValues: EtudiantFormInput = {
  matricule: '',
  nom: '',
  prenom: '',
  antenneId: 0,
  niveauId: 0,
  filiereId: null,
  statutId: 0,
  matriculeTresorPay: '',
  promotionId: 0,
  photoUrl: '',
};

export const toEtudiantFormValues = (etudiant: Etudiant): EtudiantFormInput => ({
  matricule: etudiant.matricule,
  nom: etudiant.nom,
  prenom: etudiant.prenom,
  antenneId: etudiant.antenneId,
  niveauId: etudiant.niveauId,
  filiereId: (etudiant.filiereId ?? etudiant.niveau?.filiereId) ?? null,
  statutId: etudiant.statutId,
  matriculeTresorPay: etudiant.matriculeTresorPay ?? '',
  promotionId: etudiant.promotionId ?? 0,
  photoUrl: etudiant.photoUrl ?? '',
});

type EtudiantFormProps = {
  defaultValues: EtudiantFormInput;
  formId: string;
  matriculeLocked?: boolean;
  onFormSubmit: (values: EtudiantFormInput) => Promise<void> | void;
};

const getInitials = (nom?: string, prenom?: string) =>
  `${nom?.[0] ?? ''}${prenom?.[0] ?? ''}`.toUpperCase() || 'ET';

const EtudiantForm = ({ defaultValues, formId, matriculeLocked = false, onFormSubmit }: EtudiantFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const antennesQuery = useReferential('antennes');
  const niveauxQuery = useReferential('niveaux');
  const filieresQuery = useReferential('filieres');
  const statutsQuery = useReferential('statuts-etudiants');
  const promotionsQuery = usePromotions();

  const {
    control,
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EtudiantFormInput>({
    defaultValues,
    resolver: zodResolver(etudiantFormSchema),
  });

  const photoUrl = watch('photoUrl');
  const nom = watch('nom');
  const prenom = watch('prenom');

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const antenneOptions = (antennesQuery.data ?? []).map((item) => ({
    label: `${item.code} - ${item.nom}`,
    value: item.id,
  }));
  const niveauOptions = (niveauxQuery.data ?? []).map((item) => ({
    label: `${item.code} - ${item.libelle}`,
    value: item.id,
  }));
  const filiereOptions = (filieresQuery.data ?? []).map((item) => ({
    label: `${item.code} - ${item.libelle}`,
    value: item.id,
  }));
  const statutOptions = (statutsQuery.data ?? []).map((item) => ({
    label: `${item.code} - ${item.libelle}`,
    value: item.id,
  }));
  const promotionOptions = (promotionsQuery.data ?? []).map((item) => ({
    label: item.nom,
    value: item.id,
  }));

  const handleImageChange = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setValue('photoUrl', reader.result as string, { shouldDirty: true, shouldValidate: true });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Form id={formId} onSubmit={handleSubmit(onFormSubmit)}>
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="flex-1">
          <AdaptiveCard className="flex flex-col gap-4">
            <h5 className="mb-2">Informations Générales</h5>
            <FormItem label="Matricule" invalid={Boolean(errors.matricule)} errorMessage={errors.matricule?.message}>
              <Input
                placeholder="Ex: INFAS-2024-001"
                disabled={matriculeLocked}
                {...register('matricule')}
              />
            </FormItem>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormItem label="Nom" invalid={Boolean(errors.nom)} errorMessage={errors.nom?.message}>
                <Input placeholder="Ex: KOFFI" {...register('nom')} />
              </FormItem>
              <FormItem label="Prénom(s)" invalid={Boolean(errors.prenom)} errorMessage={errors.prenom?.message}>
                <Input placeholder="Ex: Jean Luc" {...register('prenom')} />
              </FormItem>
            </div>
            <FormItem
              label="Matricule Trésor Pay"
              invalid={Boolean(errors.matriculeTresorPay)}
              errorMessage={errors.matriculeTresorPay?.message}
            >
              <Input placeholder="Ex: TP-00987-ABJ" {...register('matriculeTresorPay')} />
            </FormItem>

            <h5 className="mt-4 mb-2">Affectation Académique</h5>
            <FormItem label="Antenne" invalid={Boolean(errors.antenneId)} errorMessage={errors.antenneId?.message}>
              <Controller
                name="antenneId"
                control={control}
                render={({ field }) => (
                  <Select
                    instanceId="etudiant-form-antenne"
                    placeholder="Choisir une antenne"
                    options={antenneOptions}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : 0)}
                    searchable
                  />
                )}
              />
            </FormItem>
            <FormItem label="Promotion" invalid={Boolean(errors.promotionId)} errorMessage={errors.promotionId?.message}>
              <Controller
                name="promotionId"
                control={control}
                render={({ field }) => (
                  <Select
                    instanceId="etudiant-form-promotion"
                    placeholder="Choisir une promotion"
                    options={promotionOptions}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : 0)}
                    searchable
                  />
                )}
              />
            </FormItem>
            <FormItem label="Niveau" invalid={Boolean(errors.niveauId)} errorMessage={errors.niveauId?.message}>
              <Controller
                name="niveauId"
                control={control}
                render={({ field }) => (
                  <Select
                    instanceId="etudiant-form-niveau"
                    placeholder="Choisir un niveau"
                    options={niveauOptions}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : 0)}
                    searchable
                  />
                )}
              />
            </FormItem>
            <FormItem label="Filière" invalid={Boolean(errors.filiereId)} errorMessage={errors.filiereId?.message}>
              <Controller
                name="filiereId"
                control={control}
                render={({ field }) => (
                  <Select
                    instanceId="etudiant-form-filiere"
                    placeholder="Choisir une filière (Optionnel)"
                    options={[
                      { label: 'Aucune filière', value: 0 },
                      ...filiereOptions
                    ]}
                    value={field.value ?? 0}
                    onChange={(event) => {
                      const val = event.target.value ? Number(event.target.value) : 0;
                      field.onChange(val > 0 ? val : null);
                    }}
                    searchable
                  />
                )}
              />
            </FormItem>
            <FormItem label="Statut" invalid={Boolean(errors.statutId)} errorMessage={errors.statutId?.message}>
              <Controller
                name="statutId"
                control={control}
                render={({ field }) => (
                  <Select
                    instanceId="etudiant-form-statut"
                    placeholder="Choisir un statut"
                    options={statutOptions}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : 0)}
                    searchable
                  />
                )}
              />
            </FormItem>
          </AdaptiveCard>
        </div>

        <div className="xl:w-[370px]">
          <AdaptiveCard>
            <h5 className="mb-6">Photo</h5>
            <div className="flex flex-col items-center gap-4">
              <Avatar size={110} shape="circle" src={photoUrl || undefined}>
                {getInitials(nom, prenom)}
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleImageChange(event.target.files?.[0])}
              />
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" icon={<TbPhoto className="text-lg" />} onClick={() => fileInputRef.current?.click()}>
                  Ajouter
                </Button>
                <Button
                  type="button"
                  icon={<TbTrash className="text-lg" />}
                  disabled={!photoUrl}
                  onClick={() => setValue('photoUrl', '', { shouldDirty: true, shouldValidate: true })}
                >
                  Retirer
                </Button>
              </div>
            </div>
          </AdaptiveCard>
        </div>
      </div>
    </Form>
  );
};

export default EtudiantForm;
