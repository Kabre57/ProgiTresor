'use client';

import { ReferentialPage } from '@/components/referentials/ReferentialPage';
import type { Filiere } from '@/types/etudiant.types';

export default function FilieresPage() {
  return (
    <ReferentialPage<Filiere>
      endpoint="filieres"
      title="Filières"
      description="Filières de formation pour les étudiants."
      fields={[
        { name: 'code', label: 'Code', required: true },
        { name: 'libelle', label: 'Libellé', required: true },
        { name: 'abreviation', label: 'Abréviation', required: true },
      ]}
      columns={[
        { key: 'code', header: 'Code', render: (row) => row.code },
        { key: 'libelle', header: 'Libellé', render: (row) => row.libelle },
        { key: 'abreviation', header: 'Abréviation', render: (row) => row.abreviation },
      ]}
    />
  );
}
