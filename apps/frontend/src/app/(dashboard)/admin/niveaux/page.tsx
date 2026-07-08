'use client';

import { ReferentialPage } from '@/components/referentials/ReferentialPage';
import type { Niveau } from '@/types/etudiant.types';

export default function NiveauxPage() {
  return (
    <ReferentialPage<Niveau>
      endpoint="niveaux"
      title="Niveaux"
      description="Niveaux scolaires et cycles d'étude."
      fields={[
        { name: 'code', label: 'Code', required: true },
        { name: 'libelle', label: 'Libellé', required: true },
        { name: 'cycle', label: 'Cycle', required: true },
        { name: 'anneeEtude', label: 'Année d’étude', type: 'number', required: true },
      ]}
      columns={[
        { key: 'libelle', header: 'Libellé', render: (row) => row.libelle },
        { key: 'cycle', header: 'Cycle', render: (row) => row.cycle },
        { key: 'anneeEtude', header: 'Année', render: (row) => row.anneeEtude },
      ]}
    />
  );
}
