'use client';

import DebouceInput from '@/components/shared/DebouceInput';
import { TbSearch } from 'react-icons/tb';
import type { Ref } from 'react';

type StudentListSearchProps = {
  onInputChange: (value: string) => void;
  ref?: Ref<HTMLInputElement>;
};

const StudentListSearch = ({ onInputChange, ref }: StudentListSearchProps) => {
  return (
    <DebouceInput
      ref={ref}
      placeholder="Recherche nom, prénom ou matricule..."
      suffix={<TbSearch className="text-lg" />}
      onChange={(event) => onInputChange(event.target.value)}
    />
  );
};

export default StudentListSearch;
