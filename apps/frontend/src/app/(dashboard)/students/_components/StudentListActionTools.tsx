'use client';

import Button from '@/components/ui/Button';
import { TbUpload, TbUserPlus } from 'react-icons/tb';
import { useRouter } from 'next/navigation';

type StudentListActionToolsProps = {
  onImportClick: () => void;
};

const StudentListActionTools = ({ onImportClick }: StudentListActionToolsProps) => {
  const router = useRouter();

  return (
    <div className="flex flex-col md:flex-row gap-3">
      <Button icon={<TbUpload className="text-xl" />} className="w-full md:w-auto" onClick={onImportClick}>
        Importer
      </Button>
      <Button
        variant="solid"
        icon={<TbUserPlus className="text-xl" />}
        onClick={() => router.push('/students/create')}
      >
        Nouvel étudiant
      </Button>
    </div>
  );
};

export default StudentListActionTools;
