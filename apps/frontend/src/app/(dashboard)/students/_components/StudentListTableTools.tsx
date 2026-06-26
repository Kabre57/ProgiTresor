'use client';

import StudentListSearch from './StudentListSearch';
import StudentListTableFilter from './StudentListTableFilter';
import { useStudentListStore } from '../_store/studentListStore';
import type { Antenne, Filiere, Promotion, StatutEtudiant } from '@/types/student.types';

type StudentListTableToolsProps = {
  antennes: Antenne[];
  filieres: Filiere[];
  statuts: StatutEtudiant[];
  promotions: Promotion[];
};

const StudentListTableTools = ({ antennes, filieres, statuts, promotions }: StudentListTableToolsProps) => {
  const setQuery = useStudentListStore((state) => state.setQuery);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <StudentListSearch onInputChange={setQuery} />
      <StudentListTableFilter antennes={antennes} filieres={filieres} statuts={statuts} promotions={promotions} />
    </div>
  );
};

export default StudentListTableTools;
