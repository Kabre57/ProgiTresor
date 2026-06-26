'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Container from '@/components/shared/Container';
import AdaptiveCard from '@/components/shared/AdaptiveCard';
import Button from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/api/client';
import { useStudent, useUpdateStudent } from '@/lib/hooks/useStudentQueries';
import StudentForm, { emptyStudentFormValues, toStudentFormValues } from '../../_components/StudentForm';
import { TbArrowNarrowLeft, TbDeviceFloppy } from 'react-icons/tb';
import type { StudentFormInput } from '@/types/student.types';

const FORM_ID = 'student-edit-form';

export default function StudentEditPage() {
  const params = useParams<{ matricule: string }>();
  const matricule = String(params.matricule ?? '');
  const router = useRouter();
  const toast = useToast();
  const studentQuery = useStudent(matricule);
  const updateStudent = useUpdateStudent();
  const [isSubmitting, setSubmitting] = useState(false);

  const defaultValues = useMemo(
    () => (studentQuery.data ? toStudentFormValues(studentQuery.data) : emptyStudentFormValues),
    [studentQuery.data],
  );

  const handleSubmit = async (values: StudentFormInput) => {
    try {
      setSubmitting(true);
      const updated = await updateStudent.mutateAsync({
        matricule,
        payload: values,
      });
      toast.success('Fiche étudiant mise à jour avec succès.');
      router.push(`/students/${encodeURIComponent(updated.matricule)}`);
    } catch (error) {
      toast.error(getErrorMessage(error), 'Erreur de modification');
    } finally {
      setSubmitting(false);
    }
  };

  if (studentQuery.isLoading) {
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
          title={`Modifier ${studentQuery.data?.matricule ?? matricule}`}
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
                loading={isSubmitting || updateStudent.isPending}
                icon={<TbDeviceFloppy className="text-xl" />}
              >
                Sauvegarder
              </Button>
            </>
          }
        />
        <StudentForm
          formId={FORM_ID}
          defaultValues={defaultValues}
          matriculeLocked
          onFormSubmit={handleSubmit}
        />
      </div>
    </Container>
  );
}
