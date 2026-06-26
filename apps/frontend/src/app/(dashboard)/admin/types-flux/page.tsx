'use client';

import { Badge } from '@/components/ui/Badge';
import { ReferentialPage } from '@/components/referentials/ReferentialPage';
import type { TypeFlux } from '@/types/etudiant.types';

export default function TypesFluxPage() {
  return (
    <ReferentialPage<TypeFlux>
      endpoint="types-flux"
      title="Types de flux"
      description="Catégories de flux financiers utilisées par les recettes."
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
