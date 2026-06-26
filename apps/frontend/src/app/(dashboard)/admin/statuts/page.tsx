'use client';

import { Badge } from '@/components/ui/Badge';
import { ReferentialPage } from '@/components/referentials/ReferentialPage';
import type { StatutEtudiant } from '@/types/student.types';

export default function StatutsPage() {
  return (
    <ReferentialPage<StatutEtudiant>
      endpoint="statuts-etudiants"
      title="Statuts étudiants"
      description="États administratifs des étudiants."
      fields={[
        { name: 'code', label: 'Code', required: true },
        { name: 'libelle', label: 'Libellé', required: true },
      ]}
      columns={[
        { key: 'code', header: 'Code', render: (row) => <Badge tone="info">{row.code}</Badge> },
        { key: 'libelle', header: 'Libellé', render: (row) => row.libelle },
      ]}
    />
  );
}
