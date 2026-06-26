'use client';

import { useEffect, useState } from 'react';
import Container from '@/components/shared/Container';
import AdaptiveCard from '@/components/shared/AdaptiveCard';
import StudentListActionTools from './_components/StudentListActionTools';
import StudentListTable from './_components/StudentListTable';
import StudentListTableTools from './_components/StudentListTableTools';
import StudentImportDialog from './_components/StudentImportDialog';
import { useReferential, useStudents, usePromotions } from '@/lib/hooks/useStudentQueries';
import { useStudentListStore } from './_store/studentListStore';

export default function StudentsPage() {
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  const query = useStudentListStore((state) => state.query);
  const filterData = useStudentListStore((state) => state.filterData);
  const setStudentList = useStudentListStore((state) => state.setStudentList);
  const setInitialLoading = useStudentListStore((state) => state.setInitialLoading);

  const antennesQuery = useReferential('antennes');
  const filieresQuery = useReferential('filieres');
  const statutsQuery = useReferential('statuts-etudiants');
  const promotionsQuery = usePromotions();
  const studentsQuery = useStudents({
    search: query || undefined,
    ...filterData,
  });

  useEffect(() => {
    setStudentList(studentsQuery.data ?? []);
  }, [setStudentList, studentsQuery.data]);

  useEffect(() => {
    setInitialLoading(studentsQuery.isLoading);
  }, [setInitialLoading, studentsQuery.isLoading]);

  return (
    <>
      <Container>
        <AdaptiveCard>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3>Fiches étudiants</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Liste générale avec recherche, tri, pagination et filtres métier.
                </p>
              </div>
              <StudentListActionTools onImportClick={() => setImportDialogOpen(true)} />
            </div>
            <StudentListTableTools
              antennes={antennesQuery.data ?? []}
              filieres={filieresQuery.data ?? []}
              statuts={statutsQuery.data ?? []}
              promotions={promotionsQuery.data ?? []}
            />
            <StudentListTable />
          </div>
        </AdaptiveCard>
      </Container>

      <StudentImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImported={() => studentsQuery.refetch()}
      />
    </>
  );
}
