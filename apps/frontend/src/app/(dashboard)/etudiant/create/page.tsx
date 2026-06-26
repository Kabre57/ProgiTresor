'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Container from '@/components/shared/Container';
import Button from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/api/client';
import { useCreateEtudiant } from '@/lib/hooks/useEtudiantQueries';
import EtudiantForm, { emptyEtudiantFormValues } from '.@/components/etudiants/EtudiantForm';
import { TbArrowNarrowLeft, TbDeviceFloppy } from 'react-icons/tb';
import type { EtudiantFormInput } from '@/types/etudiant.types';

const FORM_ID = 'etudiant-create-form';

export default function EtudiantCreatePage() {
  const router = useRouter();
  const toast = useToast();
  const createEtudiant = useCreateEtudiant();
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: EtudiantFormInput) => {
    try {
      setSubmitting(true);
      const etudiant = await createEtudiant.mutateAsync(values);
      toast.success('Fiche étudiant créée avec succès.');
      router.push(`/etudiant/${encodeURIComponent(etudiant.matricule)}`);
    } catch (error) {
      toast.error(getErrorMessage(error), "Erreur de création");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Créer un étudiant"
          description="Nouvelle fiche étudiant basée sur le modèle Customer d’Ecme."
          actions={
            <>
              <Button type="button" icon={<TbArrowNarrowLeft className="text-xl" />} onClick={() => router.push('/etudiant')}>
                Retour
              </Button>
              <Button
                type="submit"
                form={FORM_ID}
                variant="solid"
                loading={isSubmitting || createEtudiant.isPending}
                icon={<TbDeviceFloppy className="text-xl" />}
              >
                Sauvegarder
              </Button>
            </>
          }
        />
        <EtudiantForm formId={FORM_ID} defaultValues={emptyEtudiantFormValues} onFormSubmit={handleSubmit} />
      </div>
    </Container>
  );
}
