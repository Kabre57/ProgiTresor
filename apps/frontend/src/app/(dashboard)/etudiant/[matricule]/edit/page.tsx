'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Container from '@/components/shared/Container';
import AdaptiveCard from '@/components/shared/AdaptiveCard';
import Button from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/api/client';
import { useEtudiant, useUpdateEtudiant } from '@/lib/hooks/useEtudiantQueries';
import EtudiantForm, { emptyEtudiantFormValues, toEtudiantFormValues } from '../.@/components/etudiants/EtudiantForm';
import { TbArrowNarrowLeft, TbDeviceFloppy } from 'react-icons/tb';
import type { EtudiantFormInput } from '@/types/etudiant.types';

const FORM_ID = 'etudiant-edit-form';

export default function EtudiantEditPage() {
  const params = useParams<{ matricule: string }>();
  const matricule = String(params.matricule ?? '');
  const router = useRouter();
  const toast = useToast();
  const etudiantQuery = useEtudiant(matricule);
  const updateEtudiant = useUpdateEtudiant();
  const [isSubmitting, setSubmitting] = useState(false);

  const defaultValues = useMemo(
    () => (etudiantQuery.data ? toEtudiantFormValues(etudiantQuery.data) : emptyEtudiantFormValues),
    [etudiantQuery.data],
  );

  const handleSubmit = async (values: EtudiantFormInput) => {
    try {
      setSubmitting(true);
      const updated = await updateEtudiant.mutateAsync({
        matricule,
        payload: values,
      });
      toast.success('Fiche étudiant mise à jour avec succès.');
      router.push(`/etudiant/${encodeURIComponent(updated.matricule)}`);
    } catch (error) {
      toast.error(getErrorMessage(error), 'Erreur de modification');
    } finally {
      setSubmitting(false);
    }
  };

  if (etudiantQuery.isLoading) {
    return (
      <Container>
        <AdaptiveCard>
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">Chargement de la fiche...</div>
        </AdaptiveCard>
      </Container>
    );
  }

  return (
    <Container>
      <div className="flex flex-col gap-4">
        <PageHeader
          title={`Modifier ${etudiantQuery.data?.matricule ?? matricule}`}
          description="Mise à jour de la fiche étudiant avec formulaire horizontal Ecme."
          actions={
            <>
              <Button type="button" icon={<TbArrowNarrowLeft className="text-xl" />} onClick={() => router.back()}>
                Retour
              </Button>
              <Button
                type="submit"
                form={FORM_ID}
                variant="solid"
                loading={isSubmitting || updateEtudiant.isPending}
                icon={<TbDeviceFloppy className="text-xl" />}
              >
                Sauvegarder
              </Button>
            </>
          }
        />
        <EtudiantForm
          formId={FORM_ID}
          defaultValues={defaultValues}
          matriculeLocked
          onFormSubmit={handleSubmit}
        />
      </div>
    </Container>
  );
}
