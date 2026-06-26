'use client';

import { Badge } from '@/components/ui/Badge';
import { ReferentialPage } from '@/components/referentials/ReferentialPage';
import type { Filiere } from '@/types/student.types';

export default function FilieresPage() {
  return (
    <ReferentialPage<Filiere>
      endpoint="filieres"
      title="Filières"
      description="Filières de formation et cycles d'étude."
      fields={[
        { name: 'code', label: 'Code', required: true },
        { name: 'libelle', label: 'Libellé', required: true },
        { name: 'cycle', label: 'Cycle', required: true },
        { name: 'anneeEtude', label: 'Année d’étude', type: 'number', required: true },
      ]}
      columns={[
        { key: 'code', header: 'Code', render: (row) => <Badge tone="info">{row.code}</Badge> },
        { key: 'libelle', header: 'Libellé', render: (row) => row.libelle },
        { key: 'cycle', header: 'Cycle', render: (row) => row.cycle },
        { key: 'anneeEtude', header: 'Année', render: (row) => row.anneeEtude },
      ]}
    />
  );
}
