'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Container from '@/components/shared/Container';
import Button from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/api/client';
import { useCreateStudent } from '@/lib/hooks/useStudentQueries';
import StudentForm, { emptyStudentFormValues } from '../_components/StudentForm';
import { TbArrowNarrowLeft, TbDeviceFloppy } from 'react-icons/tb';
import type { StudentFormInput } from '@/types/student.types';

const FORM_ID = 'student-create-form';

export default function StudentCreatePage() {
  const router = useRouter();
  const toast = useToast();
  const createStudent = useCreateStudent();
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: StudentFormInput) => {
    try {
      setSubmitting(true);
      const student = await createStudent.mutateAsync(values);
      toast.success('Fiche étudiant créée avec succès.');
      router.push(`/students/${encodeURIComponent(student.matricule)}`);
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
              <Button type="button" icon={<TbArrowNarrowLeft className="text-xl" />} onClick={() => router.push('/students')}>
                Retour
              </Button>
              <Button
                type="submit"
                form={FORM_ID}
                variant="solid"
                loading={isSubmitting || createStudent.isPending}
                icon={<TbDeviceFloppy className="text-xl" />}
              >
                Sauvegarder
              </Button>
            </>
          }
        />
        <StudentForm formId={FORM_ID} defaultValues={emptyStudentFormValues} onFormSubmit={handleSubmit} />
      </div>
    </Container>
  );
}
